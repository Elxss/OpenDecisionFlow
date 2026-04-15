import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDecisionFlowResults, fetchDecisionFlow } from "../api/mock";
import Pagination from "../components/Pagination";

const TYPE_LABEL = { question: "Q", text: "Text", date: "Date", action: ">" };
const PER_PAGE = 10;

function PathView({ path }) {
  if (!path?.length) return <p className="path-empty">No path recorded.</p>;
  return (
    <ol className="path-list">
      {path.map((step, i) => (
        <li key={i} className={`path-step path-step--${step.type}`}>
          <span className="path-type">{TYPE_LABEL[step.type] ?? step.type}</span>
          <span className="path-text">{step.text}</span>
          {step.answer && <span className="path-answer">{step.answer}</span>}
        </li>
      ))}
    </ol>
  );
}

export default function DecisionFlowHistory() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [decisionflow, setDecisionflow] = useState(null);
  const [results, setResults] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    Promise.all([
      fetchDecisionFlow(Number(id)),
      fetchDecisionFlowResults(Number(id)),
    ])
      .then(([q, data]) => {
        setDecisionflow(q);
        setResults(data.results);
        setIsOwner(data.isOwner);
        setIsPublic(data.isPublic);
        document.title = `OpenDecisionFlow - ${q.title} - Responses`;
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  function toggle(entryId) {
    setExpanded((prev) => (prev === entryId ? null : entryId));
  }

  function handleSearch(val) {
    setSearch(val);
    setPage(1);
    setExpanded(null);
  }

  function handlePageChange(p) {
    setPage(p);
    setExpanded(null);
  }

  if (loading) return <p className="loading">Loading...</p>;
  if (error) return <p className="form-error">{error}</p>;

  const q = search.toLowerCase();
  const filtered = results.filter((entry) =>
    entry.result.toLowerCase().includes(q) ||
    (isOwner && (entry.user_email ?? "").toLowerCase().includes(q))
  );
  const colSpan = isOwner ? 4 : 3;
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="page">
      <div className="manage-header">
        <div>
          <h2 className="page-title">{decisionflow?.title}</h2>
          <p className="page-subtitle">
            {isOwner
              ? isPublic
                ? "Public history — all responses are visible to participants."
                : "Private history — only you see all responses."
              : isPublic
              ? "Public history for this decisionflow."
              : "Your responses to this decisionflow."}
          </p>
        </div>
        <button className="btn-logout" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      {results.length === 0 ? (
        <p style={{ color: "var(--text)" }}>No responses yet.</p>
      ) : (
        <>
          <div className="page-toolbar" style={{ marginBottom: "16px" }}>
            <p style={{ color: "var(--text)", fontSize: "13px", margin: 0 }}>
              {filtered.length} response{filtered.length > 1 ? "s" : ""}
              {search && ` of ${results.length}`}
            </p>
            <input
              className="search-bar"
              type="search"
              placeholder={isOwner ? "Result or participant..." : "Search results..."}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <p style={{ color: "var(--text)" }}>No results for "{search}".</p>
          ) : (
            <>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    {isOwner && <th>Participant</th>}
                    <th>Result</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {slice.map((entry) => {
                    const path = entry.payload?.path ?? [];
                    const isOpen = expanded === entry.id;
                    return (
                      <>
                        <tr key={entry.id}>
                          <td style={{ color: "var(--text)", fontSize: "14px" }}>
                            {(entry.created_at ?? "").slice(0, 10)}
                          </td>
                          {isOwner && (
                            <td style={{ color: "var(--text)", fontSize: "14px" }}>
                              {entry.user_email || "—"}
                            </td>
                          )}
                          <td><span className="result-tag">{entry.result}</span></td>
                          <td>
                            <button className="btn-path-toggle" onClick={() => toggle(entry.id)}>
                              {isOpen ? "Hide" : "Path"}
                            </button>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr key={`${entry.id}-path`}>
                            <td colSpan={colSpan} style={{ padding: 0 }}>
                              <PathView path={path} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
              <Pagination
                page={page}
                total={filtered.length}
                perPage={PER_PAGE}
                onChange={handlePageChange}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
