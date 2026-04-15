import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchShareInfo } from "../api/mock";
import { useAuth } from "../context/AuthContext";

function formatDate(str) {
  if (!str) return "";
  const iso = str.replace(" ", "T");
  const normalized = /Z|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(normalized).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
}

export default function Share() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchShareInfo(id)
      .then((data) => {
        setInfo(data);
        document.title = `OpenDecisionFlow - ${data.title}`;
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || authLoading) return <p className="loading">Loading...</p>;

  if (error) return (
    <div className="share-page">
      <div className="share-card">
        <p className="share-error">{error}</p>
        <button className="btn-primary" onClick={() => navigate("/")}>Back to home</button>
      </div>
    </div>
  );

  function handleParticipate() {
    if (user) {
      navigate(`/app/decisionflow/${info.id}`);
    } else {
      navigate(`/login`);
    }
  }

  return (
    <div className="share-page">
      <div className="share-card">
        <p className="share-label">DecisionFlow</p>
        <h1 className="share-title">{info.title}</h1>
        <p className="share-description">{info.description}</p>
        <div className="share-meta">
          {info.created_by && <span>By <strong>{info.created_by}</strong></span>}
          {info.created_at && <span>{formatDate(info.created_at)}</span>}
        </div>
        <div className="share-actions">
          <button className="btn-primary share-cta" onClick={handleParticipate}>
            {user ? "Take it" : "Sign in to take it"}
          </button>
          {info.allow_guests === 1 && info.access_code && (
            <button
              className="btn-secondary"
              onClick={() => navigate(`/play/${info.access_code}`)}
            >
              Take it without an account
            </button>
          )}
        </div>
        {!user && (
          <p className="share-hint">
            No account?{" "}
            <a href="/register" style={{ color: "var(--accent)" }}>Sign up, it's free</a>
          </p>
        )}
      </div>
    </div>
  );
}
