import React, { Component } from "react";
import PropTypes from "prop-types";

import FilterBox from "modules/portfolio/containers/filter-box";
import { CompactButton } from "modules/common-elements/buttons";
import { MovementLabel } from "modules/common-elements/labels";
import PositionsTable from "modules/market/containers/positions-table";

import Styles from "modules/portfolio/components/common/quads/quad.styles";

function filterComp(input, market) {
  return market.description.toLowerCase().indexOf(input.toLowerCase()) >= 0;
}

function renderToggleContent(market) {
  return <PositionsTable market={market} />;
}

export default class Positions extends Component {
  static propTypes = {
    markets: PropTypes.array.isRequired,
    currentAugurTimestamp: PropTypes.number.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      showCurrentValue: false
    };

    this.updateRightContentValue = this.updateRightContentValue.bind(this);
    this.renderRightContent = this.renderRightContent.bind(this);
    this.createSortByOptions = this.createSortByOptions.bind(this);
  }

  createSortByOptions() {
    const { currentAugurTimestamp } = this.props;
    const sortByOptions = [
      {
        label: "Sort by Most Recently Traded",
        value: "recentlyTraded",
        comp(marketA, marketB) {
          return (
            marketB.recentlyTraded.timestamp - marketA.recentlyTraded.timestamp
          );
        }
      },
      {
        label: "Sort by Current Value",
        value: "currentValue",
        comp(marketA, marketB) {
          return (
            marketB.myPositionsSummary.currentValue.formatted -
            marketA.myPositionsSummary.currentValue.formatted
          );
        }
      },
      {
        label: "Sort by Total Returns",
        value: "totalReturns",
        comp(marketA, marketB) {
          return (
            marketB.myPositionsSummary.totalReturns.formatted -
            marketA.myPositionsSummary.totalReturns.formatted
          );
        }
      },
      {
        label: "Sort by Expiring Soonest",
        value: "endTime",
        comp(marketA, marketB) {
          if (
            marketA.endTime.timestamp < currentAugurTimestamp &&
            marketB.endTime.timestamp < currentAugurTimestamp
          ) {
            return marketB.endTime.timestamp - marketA.endTime.timestamp;
          }
          if (marketA.endTime.timestamp < currentAugurTimestamp) {
            return 1;
          }
          if (marketB.endTime.timestamp < currentAugurTimestamp) {
            return -1;
          }
          return marketA.endTime.timestamp - marketB.endTime.timestamp;
        }
      }
    ];

    return sortByOptions;
  }

  updateRightContentValue() {
    this.setState({ showCurrentValue: !this.state.showCurrentValue });
  }

  renderRightContent(market) {
    const { showCurrentValue } = this.state;

    return showCurrentValue ? (
      market.myPositionsSummary.currentValue.formatted
    ) : (
      <div className={Styles.Quad__column}>
        <span>{market.myPositionsSummary.totalReturns.formatted}</span>
        <MovementLabel
          showPercent
          showPlusMinus
          showColors
          size="small"
          value={market.myPositionsSummary.totalPercent.formatted}
        />
      </div>
    );
  }

  render() {
    const { markets } = this.props;
    const { showCurrentValue } = this.state;

    const sortByOptions = this.createSortByOptions();

    return (
      <FilterBox
        sortByStyles={{ minWidth: "10.8125rem" }}
        title="Positions"
        sortByOptions={sortByOptions}
        markets={markets}
        filterComp={filterComp}
        bottomRightContent={
          <CompactButton
            text={showCurrentValue ? "Current Value" : "Total Returns"}
            action={this.updateRightContentValue}
          />
        }
        renderRightContent={this.renderRightContent}
        renderToggleContent={renderToggleContent}
        filterLabel="positions"
        pickVariables={[
          "id",
          "description",
          "reportingState",
          "myPositionsSummary",
          "recentlyTraded",
          "endTime"
        ]}
      />
    );
  }
}
