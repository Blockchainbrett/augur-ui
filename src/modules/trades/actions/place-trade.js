import { augur } from "services/augurjs";
import { BUY } from "modules/transactions/constants/types";
import { clearTradeInProgress } from "modules/trades/actions/update-trades-in-progress";
import { createBigNumber } from "utils/create-big-number";
import { updateModal } from "modules/modal/actions/update-modal";
import { checkAccountAllowance } from "modules/auth/actions/approve-account";
import { ZERO } from "modules/trades/constants/numbers";
import { MODAL_ACCOUNT_APPROVAL } from "modules/modal/constants/modal-types";
import logError from "utils/log-error";
import noop from "utils/noop";

export const placeTrade = ({
  marketId,
  outcomeId,
  tradeInProgress,
  doNotCreateOrders,
  callback = logError,
  onComplete = noop
}) => (dispatch, getState) => {
  if (!marketId) return null;
  const { loginAccount, marketsData } = getState();
  const market = marketsData[marketId];
  if (!tradeInProgress || !market || outcomeId == null) {
    console.error(
      `trade-in-progress not found for market ${marketId} outcome ${outcomeId}`
    );
    return dispatch(clearTradeInProgress(marketId));
  }
  const bnAllowance = createBigNumber(loginAccount.allowance, 10);
  const sharesDepleted = createBigNumber(tradeInProgress.sharesDepleted, 10);
  const otherSharesDepleted = createBigNumber(
    tradeInProgress.otherSharesDepleted,
    10
  );
  const sharesProvided = sharesDepleted.eq(ZERO)
    ? otherSharesDepleted.toFixed()
    : sharesDepleted.toFixed();
  const tradeCost = augur.trading.calculateTradeCost({
    displayPrice: tradeInProgress.limitPrice,
    displayAmount: tradeInProgress.numShares,
    sharesProvided,
    numTicks: market.numTicks,
    orderType: tradeInProgress.side === BUY ? 0 : 1,
    minDisplayPrice: market.minPrice,
    maxDisplayPrice: market.maxPrice
  });
  const sharesToFill = tradeCost.onChainAmount;
  // make sure that we actually have an updated allowance.
  const placeTradeParams = {
    meta: loginAccount.meta,
    amount: tradeInProgress.numShares,
    limitPrice: tradeInProgress.limitPrice,
    sharesProvided,
    minPrice: market.minPrice,
    maxPrice: market.maxPrice,
    numTicks: market.numTicks,
    _direction: tradeInProgress.side === BUY ? 0 : 1,
    _market: marketId,
    _outcome: parseInt(outcomeId, 10),
    _tradeGroupId: tradeInProgress.tradeGroupId,
    doNotCreateOrders,
    onSent: res => {
      dispatch(checkAccountAllowance());
      callback(null, tradeInProgress.tradeGroupId);
    },
    onFailed: callback,
    onSuccess: res => {
      if (bnAllowance.lte(0)) dispatch(checkAccountAllowance());
      onComplete({
        res,
        sharesToFill: sharesToFill.toString(),
        tradeInProgress
      });
    }
  };

  const sendTrade = () => {
    augur.trading.placeTrade(placeTradeParams);
    dispatch(clearTradeInProgress(marketId));
  };

  const promptApprovalandSend = () => {
    dispatch(
      updateModal({
        type: MODAL_ACCOUNT_APPROVAL,
        approveOnSent: () => {
          // This is done since the approval likely hasn't been minded yet so otherwise an eth_call for a trade will fail.
          // NOTE: augur.js is looking for specifically the string "null", not the actual null.
          placeTradeParams.tx = { returns: "null" };
          sendTrade();
        },
        approveCallback: (err, res) => {
          if (err) return callback(err);
        }
      })
    );
  };

  if (
    bnAllowance.lte(0) ||
    bnAllowance.lte(createBigNumber(tradeInProgress.totalCost))
  ) {
    dispatch(
      checkAccountAllowance((err, allowance) => {
        if (allowance === "0") {
          promptApprovalandSend();
        } else {
          sendTrade();
        }
      })
    );
  } else {
    sendTrade();
  }
};
