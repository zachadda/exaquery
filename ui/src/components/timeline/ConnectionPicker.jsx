import React, { useState, useRef, useEffect } from "react";
import "./ConnectionPicker.scss";

export default function ConnectionPicker({ connections, activeIndex, onActivate, onManageClick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeName =
    activeIndex != null && connections[activeIndex]
      ? connections[activeIndex].name
      : "No connection";

  return (
    <div className="ConnectionPicker" ref={ref}>
      <button className="picker-toggle" onClick={() => setOpen(!open)}>
        <span className={`status-dot ${activeIndex != null ? "connected" : ""}`} />
        <span className="conn-name">{activeName}</span>
        <span className="chevron">{open ? "\u25B4" : "\u25BE"}</span>
      </button>

      {open && (
        <div className="picker-dropdown">
          {connections.length === 0 && (
            <div className="empty-msg">No saved connections</div>
          )}
          {connections.map((c, i) => (
            <button
              key={i}
              className={`dropdown-item ${i === activeIndex ? "active" : ""}`}
              onClick={() => {
                onActivate(i);
                setOpen(false);
              }}
            >
              <span className="item-name">{c.name}</span>
              <span className="item-host">{c.host}</span>
              {i === activeIndex && <span className="check-mark">&#10003;</span>}
            </button>
          ))}
          <div className="dropdown-divider" />
          <button
            className="dropdown-item manage-btn"
            onClick={() => {
              setOpen(false);
              onManageClick();
            }}
          >
            Manage Connections&hellip;
          </button>
        </div>
      )}
    </div>
  );
}
