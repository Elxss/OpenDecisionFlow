import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  useEffect(() => { document.title = "OpenDecisionFlow - Register"; }, []);

  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!usernameRegex.test(username)) {
      return setError("Username must be 3–20 characters (letters, digits, _ or -).");
    }
    if (password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }
    setLoading(true);
    try {
      await register(username, password);
      navigate("/app");
    } catch (err) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h2 className="login-title">Create an account</h2>
        <p className="login-subtitle">Takes about 10 seconds</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username <span className="form-label-hint">shown on your DecisionFlows</span></label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. johndoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password <span className="form-label-hint">at least 6 characters</span></label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="form-footer">
          Already have an account? <Link to="/login" className="form-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
