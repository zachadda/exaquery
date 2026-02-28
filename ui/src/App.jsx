import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

import "./App.css";
import TimeLine from "./components/timeline/TimeLine";
import Popup from "./components/timeline/Popup";
import ToolBar from "./components/timeline/ToolBar";
import ConnectionManager from "./components/timeline/ConnectionManager";

const DEFAULT_INITIAL_WINDOW = 600;

function useDebounce(fn, delay) {
  const timerRef = useRef(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const debounced = useCallback(
    (...args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => fnRef.current(...args), delay);
    },
    [delay]
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);
  return debounced;
}

export default function App({ popupContent: PopupContent, api }) {
  const params = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState([]);
  const [infoData, setInfoData] = useState({});
  const [lastUpdate, setLastUpdate] = useState(new Date(0));
  const [isLoading, setIsLoading] = useState(false);
  const [q, setQ] = useState("");
  const [popupLeft, setPopupLeft] = useState(10);
  const [popupTop, setPopupTop] = useState(30);
  const [connections, setConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [showConnManager, setShowConnManager] = useState(false);
  const [hiddenGroups, setHiddenGroups] = useState(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshBeforePopupRef = useRef(false);

  const lastLoadRef = useRef({
    startTime: 0,
    stopTime: 0,
    q: "",
  });

  const getCurrentTimeInterval = useCallback(() => {
    const now = Date.now() / 1000;
    const start_ts = +params.from_ts || now - DEFAULT_INITIAL_WINDOW;
    const stop_ts = +params.to_ts || now;
    return [start_ts, stop_ts];
  }, [params.from_ts, params.to_ts]);

  const changeUrl = useCallback(
    (newParams) => {
      const parts = [newParams.from_ts, newParams.to_ts];
      if (newParams.id) parts.push(newParams.id);
      navigate("/" + parts.join("/"));
    },
    [navigate]
  );

  const loadEvents = useCallback(
    (start_time, stop_time, searchQ, force) => {
      const windowSize = (stop_time - start_time) / 4;
      const start_ts_window = start_time - windowSize;
      const stop_ts_window = stop_time + windowSize;

      const last = lastLoadRef.current;
      const toleranceThreshold = (last.stopTime - last.startTime) / 40;

      if (
        !force &&
        last.q === searchQ &&
        Math.abs(start_time - last.startTime) < toleranceThreshold &&
        Math.abs(stop_time - last.stopTime) < toleranceThreshold
      ) {
        return;
      }

      const url = `${api}?from=${start_ts_window}&to=${stop_ts_window}&q=${searchQ || ""}`;

      setIsLoading((loading) => {
        if (loading && !force) return true;

        fetch(url)
          .then((r) => r.json())
          .then((response) => {
            setData(response.result);
            setLastUpdate(new Date());
            setIsLoading(false);
            lastLoadRef.current = {
              startTime: start_time,
              stopTime: stop_time,
              q: searchQ,
            };
          })
          .catch((e) => {
            console.error("Could not load data", e);
            setIsLoading(false);
          });

        return true;
      });
    },
    [api]
  );

  const loadEventsDelayed = useDebounce(loadEvents, 1000);

  const updateScale = useCallback(
    (start_time, stop_time) => {
      changeUrl({ from_ts: start_time, to_ts: stop_time });
      setLastUpdate(new Date());
    },
    [changeUrl]
  );

  const updateScaleDelayed = useDebounce(updateScale, 100);

  const onChange = useCallback(
    (start_time, stop_time, force) => {
      updateScaleDelayed(start_time, stop_time);
      loadEventsDelayed(start_time, stop_time, q, force);
    },
    [updateScaleDelayed, loadEventsDelayed, q]
  );

  const onChangeSearch = useCallback(
    (newQ) => {
      setQ(newQ);
      const [start_ts, stop_ts] = getCurrentTimeInterval();
      loadEventsDelayed(start_ts, stop_ts, newQ);
    },
    [getCurrentTimeInterval, loadEventsDelayed]
  );

  const loadPopup = useCallback(
    (box_id) => {
      const url = `${api}info?id=${box_id}`;
      setInfoData({});
      fetch(url)
        .then((r) => r.json())
        .then((response) => setInfoData(response.result))
        .catch((e) => console.error("Could not load info", e));
    },
    [api]
  );

  const openPopup = useCallback(
    (box_id, e) => {
      const mouse_x = e.clientX;
      const max_x = window.innerWidth / 2;
      setPopupLeft(mouse_x < max_x ? max_x + 10 : 10);
      setPopupTop(e.pageY - e.clientY + 80);

      // Pause auto-refresh while inspecting a query
      autoRefreshBeforePopupRef.current = autoRefresh;
      if (autoRefresh) setAutoRefresh(false);

      const [from_ts, to_ts] = getCurrentTimeInterval();
      changeUrl({ from_ts, to_ts, id: box_id });
      loadPopup(box_id);
    },
    [getCurrentTimeInterval, changeUrl, loadPopup, autoRefresh]
  );

  const closePopup = useCallback(() => {
    const [from_ts, to_ts] = getCurrentTimeInterval();
    changeUrl({ from_ts, to_ts });
    // Resume auto-refresh if it was on before
    if (autoRefreshBeforePopupRef.current) setAutoRefresh(true);
  }, [getCurrentTimeInterval, changeUrl]);

  const flush = useCallback(() => {
    if (isLoading) return;
    setIsLoading(true);
    fetch(`${api}flush`, { method: "POST" })
      .then(() => {
        setIsLoading(false);
        const [start_time, stop_time] = getCurrentTimeInterval();
        const offset = Date.now() / 1000 - stop_time;
        onChange(start_time + offset, stop_time + offset, true);
      })
      .catch((e) => {
        console.error("Flush failed", e);
        setIsLoading(false);
      });
  }, [api, isLoading, getCurrentTimeInterval, onChange]);

  const fetchConnections = useCallback(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((data) => {
        setConnections(data.connections || []);
        setActiveConnection(data.active);
      })
      .catch((e) => console.error("Failed to fetch connections", e));
  }, []);

  const activateConnection = useCallback(
    (idx) => {
      fetch(`/api/connections/${idx}/activate`, { method: "POST" })
        .then((r) => r.json())
        .then(() => {
          setActiveConnection(idx);
          // Force reload data with new connection
          const [start_ts, stop_ts] = getCurrentTimeInterval();
          setData([]);
          lastLoadRef.current = { startTime: 0, stopTime: 0, q: "" };
          loadEvents(start_ts, stop_ts, q, true);
        })
        .catch((e) => console.error("Failed to activate connection", e));
    },
    [getCurrentTimeInterval, loadEvents, q]
  );

  // Initial load
  useEffect(() => {
    fetchConnections();
    const now = Date.now() / 1000;
    const start_ts = +params.from_ts || now - DEFAULT_INITIAL_WINDOW;
    const stop_ts = +params.to_ts || now;
    loadEvents(start_ts, stop_ts, "");
    if (params.id) loadPopup(params.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const width = window.innerWidth;
  const [start_ts, stop_ts] = getCurrentTimeInterval();

  const toggleGroup = useCallback((groupName) => {
    setHiddenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) next.delete(groupName);
      else next.add(groupName);
      return next;
    });
  }, []);


  return (
    <div className="App">
      {isLoading && (
        <div className="loaderIndicator">
          <div className="spinner" />
          Loading data&hellip;
        </div>
      )}
      <ToolBar
        changeTs={onChange}
        from_ts={start_ts}
        to_ts={stop_ts}
        q={q}
        onChangeSearch={onChangeSearch}
        onFlushClick={flush}
        connections={connections}
        activeConnection={activeConnection}
        onActivateConnection={activateConnection}
        onManageConnections={() => setShowConnManager(true)}
        autoRefresh={autoRefresh}
        onSetAutoRefresh={setAutoRefresh}
      />
      <TimeLine
        width={width}
        start_ts={start_ts}
        stop_ts={stop_ts}
        data={data}
        onChange={onChange}
        lastUpdate={lastUpdate}
        onEventClick={openPopup}
        hiddenGroups={hiddenGroups}
        onToggleGroup={toggleGroup}
      />
      <Popup
        isVisible={params.id != null}
        onClose={closePopup}
        left={popupLeft}
        top={popupTop}
      >
        <PopupContent data={infoData} />
      </Popup>
      {showConnManager && (
        <ConnectionManager
          connections={connections}
          activeIndex={activeConnection}
          onClose={() => setShowConnManager(false)}
          onRefresh={fetchConnections}
          onActivate={activateConnection}
        />
      )}
    </div>
  );
}
