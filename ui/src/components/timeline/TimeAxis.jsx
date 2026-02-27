import React from "react";
import { scaleTime } from "d3-scale";

const NUM_TICKS = 15;

function formatTick(date) {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const pad = (n) => String(n).padStart(2, "0");
  if (s !== 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  if (m !== 0) return `${pad(h)}:${pad(m)}`;
  return `${pad(h)}:00`;
}

export default function TimeAxis({ width, start_ts, stop_ts, height }) {
  const scale = scaleTime()
    .domain([new Date(start_ts * 1000), new Date(stop_ts * 1000)])
    .range([0, width]);

  const ticks = scale.ticks(NUM_TICKS);

  return (
    <g transform="translate(0,25)">
      <g className="axis">
        {ticks.map((tick) => {
          const x = scale(tick);
          return (
            <g key={x} transform={`translate(${x},0)`}>
              <line y2={-6} stroke="currentColor" />
              <text
                y={-9}
                textAnchor="middle"
                fill="currentColor"
                fontSize="10"
              >
                {formatTick(tick)}
              </text>
            </g>
          );
        })}
      </g>
      <g className="timeLines">
        {ticks.map((tick) => {
          const x = scale(tick);
          return (
            <line
              vectorEffect="non-scaling-stroke"
              key={`grid_${x}`}
              x1={x}
              x2={x}
              y1={0}
              y2={height}
            />
          );
        })}
      </g>
    </g>
  );
}
