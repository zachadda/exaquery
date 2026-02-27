import React, { useState, useRef, useCallback, useEffect } from "react";
import "./GestureHandler.css";

function TimeMarker({ x }) {
  if (x == null) return null;
  return <line x1={x} y1={0} x2={x} y2={10000} className="TimeMarker" />;
}

export default function GestureHandler({ onChange, resetKey, children }) {
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(0);
  const [mousePos, setMousePos] = useState(null);
  const rectRef = useRef(null);
  const stateRef = useRef({ zoom: 1, x: 0 });

  // Reset zoom/offset when parent changes the time range
  useEffect(() => {
    setZoom(1);
    setX(0);
    stateRef.current = { zoom: 1, x: 0 };
  }, [resetKey]);

  const onMouseMove = useCallback((e) => {
    const rect = rectRef.current?.getBoundingClientRect();
    if (rect) setMousePos(e.clientX - rect.left);
  }, []);

  const onWheel = useCallback(
    (e) => {
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (!e.ctrlKey && (absX < 1 || absY / absX >= 2)) return;
      e.preventDefault();

      const st = stateRef.current;

      if (e.ctrlKey) {
        const rect = rectRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cursorX = e.clientX - rect.left;
        const zoomFactor = 1 - e.deltaY / 100;
        const newZoom = st.zoom * zoomFactor;
        const realX = cursorX / st.zoom + st.x;
        const newOffset = realX - cursorX / newZoom;

        stateRef.current = { zoom: newZoom, x: newOffset };
        setZoom(newZoom);
        setX(newOffset);
        onChange(newZoom, newOffset);
      } else {
        const newOffset = st.x + (4 * e.deltaX) / st.zoom;
        stateRef.current = { ...st, x: newOffset };
        setX(newOffset);
        onChange(st.zoom, newOffset);
      }
    },
    [onChange]
  );

  // Attach wheel listener imperatively with { passive: false }
  const containerRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const transform = `scale(${zoom}, 1) translate(${-x},0)`;

  return (
    <g className="GestureContainer" ref={containerRef} onMouseMove={onMouseMove}>
      <rect
        x="0"
        y="0"
        height="10000"
        width="10000"
        className="BackgroundRect"
        ref={rectRef}
      />
      <TimeMarker x={mousePos} />
      <g className="GestureHandler" transform={transform}>
        {children}
      </g>
    </g>
  );
}
