import React, { memo, useMemo } from "react";
import { scaleLinear } from "d3-scale";

// Events rendered later in SVG paint on top. Put low-priority types first
// so meaningful query types (DQL, DML, DDL) always show on top.
const BACKGROUND_MODIFIERS = new Set(["TRANSACTION", "SESSION_START", "EVENT_GROUP"]);

const ChannelSpace = memo(
  function ChannelSpace({ start_ts, stop_ts, width, data, eventRenderer, onEventClick, hiddenGroups }) {
    const scaleX = scaleLinear()
      .domain([start_ts, stop_ts])
      .range([0, width]);

    const visibleData = useMemo(() => {
      const filtered = hiddenGroups && hiddenGroups.size > 0
        ? data.filter((d) => !hiddenGroups.has(d.group))
        : data;

      // Sort so background types render first (underneath)
      return [...filtered].sort((a, b) => {
        const aBg = BACKGROUND_MODIFIERS.has(a.modifier) ? 0 : 1;
        const bBg = BACKGROUND_MODIFIERS.has(b.modifier) ? 0 : 1;
        return aBg - bBg;
      });
    }, [data, hiddenGroups]);

    return (
      <g className="ChannelSpace">
        {visibleData.length > 0 &&
          visibleData.map((d) => eventRenderer(d, scaleX, onEventClick))}
      </g>
    );
  },
  (prev, next) =>
    next.lastUpdate <= prev.lastUpdate && prev.hiddenGroups === next.hiddenGroups
);

export default ChannelSpace;
