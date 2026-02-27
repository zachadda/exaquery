import React, { memo } from "react";
import { scaleLinear } from "d3-scale";

const ChannelSpace = memo(
  function ChannelSpace({ start_ts, stop_ts, width, data, eventRenderer, onEventClick }) {
    const scaleX = scaleLinear()
      .domain([start_ts, stop_ts])
      .range([0, width]);

    return (
      <g className="ChannelSpace">
        {data.length > 0 &&
          data.map((d) => eventRenderer(d, scaleX, onEventClick))}
      </g>
    );
  },
  (prev, next) => next.lastUpdate <= prev.lastUpdate
);

export default ChannelSpace;
