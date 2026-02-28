import React, { useState } from "react";
import "./ConnectionPicker.scss";

const API_BASE = "/api/connections";

const emptyForm = { name: "", host: "", port: "8563", user: "", password: "", fingerprint: "" };

export default function ConnectionManager({ connections, activeIndex, onClose, onRefresh, onActivate }) {
  const [form, setForm] = useState({ ...emptyForm });
  const [editIndex, setEditIndex] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setEditIndex(null);
    setTestResult(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name || !form.host || !form.user || !form.password) return;

    if (editIndex != null) {
      await fetch(`${API_BASE}/${editIndex}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    resetForm();
    onRefresh();
  }

  async function handleDelete(idx) {
    await fetch(`${API_BASE}/${idx}`, { method: "DELETE" });
    onRefresh();
  }

  function handleEdit(idx) {
    const c = connections[idx];
    setForm({
      name: c.name,
      host: c.host,
      port: String(c.port || 8563),
      user: c.user,
      password: "",
      fingerprint: c.fingerprint || "",
    });
    setEditIndex(idx);
    setTestResult(null);
  }

  async function handleTest() {
    if (!form.host || !form.user || !form.password) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: "Request failed" });
    }
    setTesting(false);
  }

  function handleActivate(idx) {
    onActivate(idx);
  }

  return (
    <div className="ConnectionManager-overlay" onClick={onClose}>
      <div className="ConnectionManager" onClick={(e) => e.stopPropagation()}>
        <div className="cm-header">
          <h2>Manage Connections</h2>
          <button className="cm-close" onClick={onClose}>&times;</button>
        </div>

        <div className="cm-body">
          <div className="cm-list">
            {connections.length === 0 && (
              <div className="cm-empty">No connections saved yet.</div>
            )}
            {connections.map((c, i) => (
              <div key={i} className={`cm-item ${i === activeIndex ? "active" : ""}`}>
                <div className="cm-item-info">
                  <span className="cm-item-name">{c.name}</span>
                  <span className="cm-item-detail">{c.user}@{c.host}:{c.port || 8563}</span>
                </div>
                <div className="cm-item-actions">
                  {i !== activeIndex && (
                    <button className="cm-btn cm-btn-activate" onClick={() => handleActivate(i)}>
                      Activate
                    </button>
                  )}
                  {i === activeIndex && <span className="cm-active-badge">Active</span>}
                  <button className="cm-btn" onClick={() => handleEdit(i)}>Edit</button>
                  <button className="cm-btn cm-btn-danger" onClick={() => handleDelete(i)}>Delete</button>
                </div>
              </div>
            ))}
          </div>

          <form className="cm-form" onSubmit={handleSave}>
            <h3>{editIndex != null ? "Edit Connection" : "Add Connection"}</h3>
            <div className="cm-field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Production" />
            </div>
            <div className="cm-row">
              <div className="cm-field cm-field-grow">
                <label>Host</label>
                <input value={form.host} onChange={(e) => updateField("host", e.target.value)} placeholder="10.0.1.50" />
              </div>
              <div className="cm-field cm-field-port">
                <label>Port</label>
                <input value={form.port} onChange={(e) => updateField("port", e.target.value)} placeholder="8563" />
              </div>
            </div>
            <div className="cm-field">
              <label>User</label>
              <input value={form.user} onChange={(e) => updateField("user", e.target.value)} placeholder="sys" />
            </div>
            <div className="cm-field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={(e) => updateField("password", e.target.value)} placeholder="********" />
            </div>
            <div className="cm-field">
              <label>Fingerprint</label>
              <input value={form.fingerprint} onChange={(e) => updateField("fingerprint", e.target.value)} placeholder="SHA256 hash or nocertcheck" />
            </div>
            <div className="cm-form-actions">
              <button type="button" className="cm-btn" onClick={handleTest} disabled={testing}>
                {testing ? "Testing\u2026" : "Test Connection"}
              </button>
              {testResult && (
                <span className={`cm-test-result ${testResult.success ? "success" : "error"}`}>
                  {testResult.success ? "\u2713 " : "\u2717 "}
                  {testResult.message}
                </span>
              )}
              <div className="cm-form-submit">
                {editIndex != null && (
                  <button type="button" className="cm-btn" onClick={resetForm}>Cancel</button>
                )}
                <button type="submit" className="cm-btn cm-btn-primary">
                  {editIndex != null ? "Update" : "Add"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
