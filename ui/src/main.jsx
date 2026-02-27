import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import "./components/exaquery/event.scss";
import QueryInfo from "./components/exaquery/QueryInfo";

const API = import.meta.env.VITE_API_URL;

function ExaQueryApp() {
  return <App popupContent={QueryInfo} api={API} />;
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/:from_ts/:to_ts/:id" element={<ExaQueryApp />} />
      <Route path="/:from_ts/:to_ts" element={<ExaQueryApp />} />
      <Route path="/" element={<ExaQueryApp />} />
    </Routes>
  </BrowserRouter>
);
