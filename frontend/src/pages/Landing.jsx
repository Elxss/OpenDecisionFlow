import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => { document.title = "OpenDecisionFlow"; }, []);

  return (
    <div className="landing">
      <header className="landing-header">
        <span className="brand">OpenDecisionFlow</span>
        <button className="cta-small" onClick={() => navigate("/login")}>
          Sign in →
        </button>
      </header>

      <main className="landing-main">
        <h1 className="landing-title">
          OpenDecisionFlow
        </h1>
        <p className="landing-tagline">Decision trees, without the hassle.</p>
        <p className="landing-subtitle">
          Build interactive decision trees, share them with your team or the public,
          and track every response. React frontend, Hono + SQLite backend.
        </p>
        <button className="cta" onClick={() => navigate("/login")}>
          Get started
        </button>

        <div className="landing-features">
          <div className="feature">
            <p className="feature-title">4 node types</p>
            <p className="feature-desc">
              <code>question</code>, <code>action</code>, <code>text</code>, <code>date</code> — enough to build anything you need.
            </p>
          </div>
          <div className="feature">
            <p className="feature-title">Built-in editor</p>
            <p className="feature-desc">
              Create and edit DecisionFlows directly from the UI. No extra tools required.
            </p>
          </div>
          <div className="feature">
            <p className="feature-title">Full history</p>
            <p className="feature-desc">
              Every answer is saved with the exact path the user took, step by step.
            </p>
          </div>
          <div className="feature">
            <p className="feature-title">Lightweight stack</p>
            <p className="feature-desc">
              Hono + Bun + SQLite. No bloat. Starts in milliseconds, runs on a $5 VPS.
            </p>
          </div>
        </div>

        <div className="showcase-cards">
          <div className="showcase-card">
            <div className="showcase-text">
              <h2 className="showcase-title">Write JSON, get a working flow</h2>
              <p className="showcase-desc">
                The editor lets you build trees directly from the interface.
                No drag-and-drop yet — just JSON that does exactly what you tell it to.
              </p>
            </div>
            <div className="showcase-screen">
              <span>screenshot</span>
            </div>
          </div>

          <div className="showcase-card">
            <div className="showcase-screen">
              <span>screenshot</span>
            </div>
            <div className="showcase-text">
              <h2 className="showcase-title">See who answered what</h2>
              <p className="showcase-desc">
                The history log stores each response along with the full path taken.
                Make it public or keep it to yourself.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        OpenDecisionFlow <span style={{ color: "var(--border)" }}>·</span> v0.0.0 <span style={{ color: "var(--border)" }}>·</span> <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>GitHub</a>
      </footer>
    </div>
  );
}
