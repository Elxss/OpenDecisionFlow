import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDecisionFlows, redeemCode, toggleFavorite, removeAccess } from "../api/mock";
import { useAuth } from "../context/AuthContext";
import Pagination from "../components/Pagination";

const PER_PAGE = 12;

function formatDate(str) {
  if (!str) return "";
  const iso = str.replace(" ", "T");
  const normalized = /Z|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(normalized).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
      <polyline points="16 6 12 2 8 6"/>
      <line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  );
}

function BookmarkIcon({ filled }) {
  return filled ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

function RedeemModal({ onClose, onSuccess }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await redeemCode(input);
      onSuccess(data.decisionflow);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Redeem an access code</h3>
        <p className="modal-subtitle">Paste the code you received from the DecisionFlow author.</p>
        <form onSubmit={handleSubmit}>
          <input
            className="form-input code-input"
            placeholder="XXXX-XXXX-XXXX"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            autoFocus
            maxLength={14}
          />
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="submit" className="btn-primary" style={{ marginTop: 0 }} disabled={loading || input.length < 14}>
              {loading ? "Checking..." : "Unlock"}
            </button>
            <button type="button" className="btn-logout" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Dashboard() {
  useEffect(() => { document.title = "OpenDecisionFlow - Dashboard"; }, []);

  const [decisionflows, setDecisionflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all"); // "all" | "saved" | "mine"
  const [page, setPage] = useState(1);
  const [showRedeem, setShowRedeem] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  function load() {
    fetchDecisionFlows()
      .then((data) => setDecisionflows(Array.isArray(data) ? data : []))
      .catch(() => setDecisionflows([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleToggleFavorite(e, id) {
    e.stopPropagation();
    try {
      const { liked } = await toggleFavorite(id);
      setDecisionflows((prev) =>
        prev.map((q) => q.id === id ? { ...q, is_liked: liked ? 1 : 0 } : q)
      );
    } catch {}
  }

  function handleShare(e, item) {
    e.stopPropagation();
    const url = `${window.location.origin}/share/${item.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function handleForgetAccess(e, id) {
    e.stopPropagation();
    try {
      await removeAccess(id);
      setDecisionflows((prev) => prev.filter((q) => q.id !== id));
    } catch {}
  }

  function handleTabChange(t) {
    setTab(t);
    setPage(1);
  }

  function handleSearch(val) {
    setSearch(val);
    setPage(1);
  }

  const q = search.toLowerCase();
  const isRedeemed = (item) =>
    item.is_public === 0 && item.created_by !== user?.username && !user?.isAdmin;

  const byTab =
    tab === "saved" ? decisionflows.filter((item) => item.is_liked === 1 || isRedeemed(item))
    : tab === "mine" ? decisionflows.filter((item) => item.created_by === user?.username)
    : decisionflows;

  const filtered = byTab.filter((item) =>
    item.title.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    (item.created_by ?? "").toLowerCase().includes(q)
  );
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const savedCount = decisionflows.filter((item) => item.is_liked === 1 || isRedeemed(item)).length;
  const mineCount = decisionflows.filter((item) => item.created_by === user?.username).length;

  return (
    <div className="page">
      {showRedeem && (
        <RedeemModal
          onClose={() => setShowRedeem(false)}
          onSuccess={() => { setShowRedeem(false); load(); }}
        />
      )}

      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Browse</h2>
          <p className="page-subtitle">Pick a DecisionFlow and start.</p>
        </div>
        <div className="toolbar-actions">
          <input
            className="search-bar"
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <button className="btn-redeem" onClick={() => setShowRedeem(true)}>
            + Redeem code
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`dashboard-tab${tab === "all" ? " active" : ""}`}
          onClick={() => handleTabChange("all")}
        >
          All
        </button>
        <button
          className={`dashboard-tab${tab === "saved" ? " active" : ""}`}
          onClick={() => handleTabChange("saved")}
        >
          Saved
          {savedCount > 0 && <span className="tab-count">{savedCount}</span>}
        </button>
        <button
          className={`dashboard-tab${tab === "mine" ? " active" : ""}`}
          onClick={() => handleTabChange("mine")}
        >
          Mine
          {mineCount > 0 && <span className="tab-count">{mineCount}</span>}
        </button>
      </div>

      {loading ? (
        <p className="loading">Loading...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text)" }}>
          {tab === "saved"
            ? "Nothing saved yet."
            : tab === "mine"
            ? "You haven't created anything yet."
            : search
            ? `No results for "${search}".`
            : "No decisionflows available."}
        </p>
      ) : (
        <>
          <div className="card-grid">
            {slice.map((item) => (
              <div className="card" key={item.id}>
                <div className="card-header">
                  <p className="card-title">{item.title}</p>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    <button
                      className={`btn-bookmark${item.is_liked ? " liked" : ""}`}
                      title={item.is_liked ? "Remove from saved" : "Save"}
                      onClick={(e) => handleToggleFavorite(e, item.id)}
                    >
                      <BookmarkIcon filled={!!item.is_liked} />
                    </button>
                    {(item.is_public === 1 || item.allow_guests === 1) && (
                      <button
                        className={`btn-share${copiedId === item.id ? " copied" : ""}`}
                        title="Copy share link"
                        onClick={(e) => handleShare(e, item)}
                      >
                        {copiedId === item.id ? "Copied!" : <ShareIcon />}
                      </button>
                    )}
                    {(user?.username === item.created_by || user?.isAdmin) && (
                      <button
                        className="btn-settings"
                        title="Edit"
                        onClick={(e) => { e.stopPropagation(); navigate(`/app/manage?edit=${item.id}`); }}
                      >
                        <GearIcon />
                      </button>
                    )}
                  </div>
                </div>
                <p className="card-description">{item.description}</p>
                <div className="card-meta">
                  {item.created_by && <span>{item.created_by}</span>}
                  {item.created_at && <span>{formatDate(item.created_at)}</span>}
                  {item.is_public === 0 && <span className="card-badge-private">Private</span>}
                </div>
                <div className="card-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => navigate(`/app/decisionflow/${item.id}`)}
                  >
                    Start
                  </button>
                  {(user?.username === item.created_by || user?.isAdmin || item.history_public === 1) && (
                    <button
                      className="btn-history"
                      onClick={() => navigate(`/app/decisionflow/${item.id}/history`)}
                    >
                      Responses
                    </button>
                  )}
                  {item.is_public === 0 && item.created_by !== user?.username && !user?.isAdmin && (
                    <button
                      className="btn-forget"
                      title="Remove access"
                      onClick={(e) => handleForgetAccess(e, item.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination
            page={page}
            total={filtered.length}
            perPage={PER_PAGE}
            onChange={setPage}
          />
        </>
      )}
    </div>
  );
}
