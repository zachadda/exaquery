import React from "react";
import {
  CHANNEL_HEIGHT,
  CHANNEL_PADDING,
  channelYScale,
} from "../../modules/constants";

export default function EventRenderer(data, scaleX, onEventClick) {
  const x = scaleX(data.start_time);
  const y = channelYScale(data.offset, data.group_id) + CHANNEL_PADDING;
  const width = scaleX(data.stop_time) - x;
  const height = CHANNEL_HEIGHT - 2 * CHANNEL_PADDING;
  const cls = `event ${data.modifier} ${data.flag === 1 ? "flag" : "noflag"}`;

  const onClick =
    data.modifier !== "EVENT_GROUP"
      ? (e) => onEventClick(data.box_id, e)
      : undefined;

  return (
    <rect
      vectorEffect="non-scaling-stroke"
      key={data.group + "_" + data.box_id + "_" + data.modifier}
      className={cls}
      x={x}
      y={y}
      width={width}
      height={height}
      onClick={onClick}
    />
  );
}
