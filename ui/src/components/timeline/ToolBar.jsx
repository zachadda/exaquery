import React, { useState, useEffect, useRef, useCallback } from "react";
import { formatDuration, intervalToDuration } from "date-fns";
import "./ToolBar.scss";
import ConnectionPicker from "./ConnectionPicker";

const AUTO_REFRESH_TIMEOUT = 1100;

function getTimeInterval(seconds) {
  const now = Date.now() / 1000;
  return [now - seconds, now];
}

const timeIntervals = [
  { title: "5m", value: 5 * 60 },
  { title: "15m", value: 15 * 60 },
  { title: "30m", value: 30 * 60 },
  { title: "1h", value: 60 * 60 },
  { title: "3h", value: 3 * 3600 },
  { title: "6h", value: 6 * 3600 },
  { title: "12h", value: 12 * 3600 },
  { title: "24h", value: 24 * 3600 },
];

function preciseDiff(startMs, stopMs) {
  const dur = intervalToDuration({ start: new Date(startMs), end: new Date(stopMs) });
  return formatDuration(dur, { delimiter: ", " }) || "0 seconds";
}

export default function ToolBar({ changeTs, from_ts, to_ts, q, onChangeSearch, onFlushClick, connections, activeConnection, onActivateConnection, onManageConnections }) {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const timerRef = useRef(null);

  const onDateChange = useCallback(
    (e) => {
      const value = e.target.value;
      if (!value) return;
      const delta = to_ts - from_ts;
      const start = new Date(value).getTime() / 1000;
      changeTs(start, start + delta);
    },
    [changeTs, from_ts, to_ts]
  );

  // Auto-refresh
  useEffect(() => {
    const tick = () => {
      if (autoRefresh) {
        const newStart = Date.now() / 1000 - (to_ts - from_ts);
        const delta = to_ts - from_ts;
        changeTs(newStart, newStart + delta);
      }
      timerRef.current = setTimeout(tick, AUTO_REFRESH_TIMEOUT);
    };
    timerRef.current = setTimeout(tick, AUTO_REFRESH_TIMEOUT);
    return () => clearTimeout(timerRef.current);
  }, [autoRefresh, changeTs, from_ts, to_ts]);

  const fromDate = new Date(from_ts * 1000);
  const toDate = new Date(to_ts * 1000);
  // Format for datetime-local input: YYYY-MM-DDThh:mm:ss
  const fromDateStr = fromDate.toISOString().slice(0, 19);
  const rangeDuration = preciseDiff(from_ts * 1000, to_ts * 1000);

  return (
    <div className="ToolBar">
      <ConnectionPicker
        connections={connections}
        activeIndex={activeConnection}
        onActivate={onActivateConnection}
        onManageClick={onManageConnections}
      />
      <div className="searchBox panel">
        <input
          type="text"
          onChange={(e) => onChangeSearch(e.target.value)}
          value={q}
          placeholder="Search queries..."
        />
      </div>

      <div className="datePicker panel">
        <span className="rangeLabel">Range: {rangeDuration}</span>
        <input
          type="datetime-local"
          value={fromDateStr}
          onChange={onDateChange}
          step="1"
        />
      </div>

      <div className="quickLinks panel">
        <span className="jumpLabel">Jump to last:</span>
        <ul>
          {timeIntervals.map((k) => (
            <li key={k.title}>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  const [from, to] = getTimeInterval(k.value);
                  changeTs(from, to);
                }}
              >
                {k.title}
              </button>
            </li>
          ))}
        </ul>
        <label className="autoRefreshLabel">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          Auto Refresh
        </label>
        <button className="flushBtn" onClick={onFlushClick}>
          Flush Statistics
        </button>
      </div>
    </div>
  );
}
