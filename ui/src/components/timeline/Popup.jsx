import React from "react";
import "./Popup.css";

export default function Popup({ isVisible, onClose, left = 10, top = 30, children }) {
  if (!isVisible) return null;

  return (
    <div
      className="Popup"
      style={{ left: `${left}px`, top: `${top}px` }}
    >
      <div className="controls" onClick={onClose} title="Close Popup">
        &times;
      </div>
      <div className="content">{children}</div>
    </div>
  );
}
