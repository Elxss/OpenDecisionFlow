import { useEffect, useState } from "react";
import { fetchHistory } from "../api/mock";
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

export default function History() {
  useEffect(() => { document.title = "OpenDecisionFlow - History"; }, []);

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchHistory().then((data) => {
      setHistory(data);
      setLoading(false);
    });
  }, []);

  function toggle(id) {
    setExpanded((prev) => (prev === id ? null : id));
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

  const q = search.toLowerCase();
  const filtered = history.filter((entry) =>
    entry.title.toLowerCase().includes(q) ||
    entry.result.toLowerCase().includes(q)
  );
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">History</h2>
          <p className="page-subtitle">Your completed DecisionFlows.</p>
        </div>
        {history.length > 0 && (
          <input
            className="search-bar"
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        )}
      </div>

      {history.length === 0 ? (
        <p style={{ color: "var(--text)" }}>Nothing here yet.</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--text)" }}>No results for "{search}".</p>
      ) : (
        <>
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>DecisionFlow</th>
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
                      <td>{entry.title}</td>
                      <td><span className="result-tag">{entry.result}</span></td>
                      <td>
                        <button className="btn-path-toggle" onClick={() => toggle(entry.id)}>
                          {isOpen ? "Hide" : "Path"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={`${entry.id}-path`}>
                        <td colSpan={4} style={{ padding: 0 }}>
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
    </div>
  );
}
