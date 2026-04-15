import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { changePassword } from "../api/mock";

export default function Settings() {
  useEffect(() => { document.title = "OpenDecisionFlow - Settings"; }, []);

  const { user, refreshUser } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (next !== confirm) {
      setError("New passwords don't match.");
      return;
    }
    if (next.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(current, next);
      await refreshUser();
      setSuccess(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-subtitle">Signed in as <strong>{user?.username}</strong></p>
        </div>
      </div>

      {user?.mustChangePassword && (
        <div className="settings-banner">
          You are using the default password. Please change it before continuing.
        </div>
      )}

      <div className="settings-card">
        <h3 className="settings-section-title">Change password</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Current password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">New password <span className="form-label-hint">at least 6 characters</span></label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm new password</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          {success && <p className="form-success">Password updated.</p>}
          <button
            className="btn-primary"
            type="submit"
            style={{ width: "auto", padding: "10px 24px" }}
            disabled={loading || !current || !next || !confirm}
          >
            {loading ? "Saving..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
