import React, { useCallback } from "react";
import "./TimeLine.scss";
import addChannelInfo from "../../modules/ChannelBuilder";
import ChannelSpace from "./ChannelSpace";
import GestureHandler from "./GestureHandler";
import DefaultEventRenderer from "./EventRenderer";
import TimeAxis from "./TimeAxis";
import {
  GROUP_LIST_WIDTH,
  GROUP_PADDING,
  channelYScale,
} from "../../modules/constants";

function Group({ data, width }) {
  const group_y = channelYScale(data.offset, data.index) - GROUP_PADDING;
  const height =
    channelYScale(data.offset + data.size, data.index) - group_y + GROUP_PADDING;

  return (
    <g className="group">
      <rect x={0} y={group_y} width={GROUP_LIST_WIDTH} height={height} />
      <line
        x1={GROUP_LIST_WIDTH}
        y1={group_y + height}
        x2={width}
        y2={group_y + height}
      />
      <text x={10} y={group_y + height / 2} alignmentBaseline="middle">
        {data.group}
      </text>
    </g>
  );
}

function GroupList({ groups, width }) {
  return groups.map((group) => (
    <Group key={group.group} width={width} data={group} />
  ));
}

export default function TimeLine({
  width,
  start_ts,
  stop_ts,
  data = [],
  onChange,
  lastUpdate,
  onEventClick,
  eventRenderer = DefaultEventRenderer,
}) {
  const handleChange = useCallback(
    (zoom, offset) => {
      const timeWidth = stop_ts - start_ts;
      const newWidth = timeWidth / zoom;
      const newOffset = (offset / (width - GROUP_LIST_WIDTH)) * timeWidth;
      onChange(start_ts + newOffset, start_ts + newWidth + newOffset);
    },
    [start_ts, stop_ts, width, onChange]
  );

  const [groups, numChannels] = addChannelInfo(data);
  const height = channelYScale(numChannels, groups.length);
  const total_height = height + 50;

  return (
    <div className="TimeLine">
      <svg width={width} height={total_height}>
        <defs>
          <pattern
            id="event_group"
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
          >
            <line x1={0} y1={0} x2={4} y2={4} stroke="#888" strokeWidth={0.8} />
          </pattern>
        </defs>

        <g className="zoomable" transform={`translate(${GROUP_LIST_WIDTH}, 0)`}>
          <GestureHandler onChange={handleChange} resetKey={`${start_ts}_${stop_ts}`}>
            <TimeAxis
              width={width - GROUP_LIST_WIDTH}
              start_ts={start_ts}
              stop_ts={stop_ts}
              height={height}
            />
            <g transform="translate(0,25)">
              <ChannelSpace
                start_ts={start_ts}
                stop_ts={stop_ts}
                width={width - GROUP_LIST_WIDTH}
                data={data}
                eventRenderer={eventRenderer}
                onEventClick={onEventClick}
                lastUpdate={lastUpdate}
              />
            </g>
          </GestureHandler>
        </g>
        <g className="channelList" transform="translate(0,25)">
          <GroupList groups={groups} width={width} />
        </g>
      </svg>
    </div>
  );
}
