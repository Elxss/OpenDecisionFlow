import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Pagination from "../components/Pagination";
import {
  fetchDecisionFlows,
  fetchDecisionFlow,
  createDecisionFlow,
  updateDecisionFlow,
  deleteDecisionFlow,
  regenerateCode,
} from "../api/mock";

const PER_PAGE = 10;

const TREE_TEMPLATE = JSON.stringify(
  {
    type: "question",
    text: "Your main question?",
    branches: {
      "Option A": { type: "action", text: "Result A" },
      "Option B": { type: "action", text: "Result B" },
    },
  },
  null,
  2
);

function Editor({ decisionflow, onSave, onCancel }) {
  const [title, setTitle] = useState(decisionflow?.title ?? "");
  const [description, setDescription] = useState(decisionflow?.description ?? "");
  const [historyPublic, setHistoryPublic] = useState(decisionflow?.history_public === 1);
  const [isPublic, setIsPublic] = useState(decisionflow ? decisionflow.is_public === 1 : true);
  const [allowGuests, setAllowGuests] = useState(decisionflow?.allow_guests === 1);
  const [accessCode, setAccessCode] = useState(decisionflow?.access_code ?? null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [treeJson, setTreeJson] = useState(
    decisionflow?.tree ? JSON.stringify(decisionflow.tree, null, 2) : TREE_TEMPLATE
  );
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);

  function validateJson(val) {
    try {
      JSON.parse(val);
      setJsonError("");
      return true;
    } catch (e) {
      setJsonError(e.message);
      return false;
    }
  }

  async function handleSave() {
    if (!title.trim() || !description.trim()) {
      setJsonError("Title and description are required.");
      return;
    }
    if (!validateJson(treeJson)) return;
    setSaving(true);
    try {
      const data = await onSave({ title, description, tree: JSON.parse(treeJson), history_public: historyPublic, is_public: isPublic, allow_guests: allowGuests });
      if (data?.access_code) setAccessCode(data.access_code);
    } catch (err) {
      setJsonError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleFormat() {
    try {
      setTreeJson(JSON.stringify(JSON.parse(treeJson), null, 2));
      setJsonError("");
    } catch (e) {
      setJsonError(e.message);
    }
  }

  return (
    <div className="editor-panel">
      <div className="editor-header">
        <h3 className="editor-title">
          {decisionflow ? "Edit decisionflow" : "New decisionflow"}
        </h3>
        <button className="btn-logout" onClick={onCancel}>Cancel</button>
      </div>

      <div className="form-group">
        <label className="form-label">Title</label>
        <input
          className="form-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My decisionflow"
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <input
          className="form-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description"
        />
      </div>

      <div className="form-group">
        <label className="toggle-label">
          <input type="checkbox" className="toggle-checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          <span className="toggle-text">
            Public decisionflow
            <span className="form-label-hint">
              {isPublic ? "Visible to all signed-in users" : "Only accessible via access code"}
            </span>
          </span>
        </label>
      </div>

      {!isPublic && (
        <div className="access-code-box">
          <p className="access-code-label">Access code</p>
          {accessCode ? (
            <div className="access-code-row">
              <span className="access-code">{accessCode}</span>
              <button
                type="button"
                className="btn-path-toggle"
                onClick={() => navigator.clipboard.writeText(accessCode)}
              >
                Copy
              </button>
              {decisionflow?.id && (
                <button
                  type="button"
                  className="btn-path-toggle"
                  disabled={regenLoading}
                  onClick={async () => {
                    setRegenLoading(true);
                    try {
                      const data = await regenerateCode(decisionflow.id);
                      setAccessCode(data.access_code);
                    } finally {
                      setRegenLoading(false);
                    }
                  }}
                >
                  {regenLoading ? "..." : "Regenerate"}
                </button>
              )}
            </div>
          ) : (
            <p className="form-label-hint">A code will be generated on save.</p>
          )}
          <label className="toggle-label" style={{ marginTop: "10px" }}>
            <input type="checkbox" className="toggle-checkbox" checked={allowGuests} onChange={(e) => setAllowGuests(e.target.checked)} />
            <span className="toggle-text">
              Guest access (no account needed)
              <span className="form-label-hint">
                {allowGuests ? "The /play/CODE link works without signing in" : "Sign-in required to play"}
              </span>
            </span>
          </label>
        </div>
      )}

      <div className="form-group">
        <label className="toggle-label">
          <input type="checkbox" className="toggle-checkbox" checked={historyPublic} onChange={(e) => setHistoryPublic(e.target.checked)} />
          <span className="toggle-text">
            Public history
            <span className="form-label-hint">
              {historyPublic ? "All participants can see responses" : "Only you can see all responses"}
            </span>
          </span>
        </label>
      </div>

      <div className="form-group">
        <div className="editor-tree-header">
          <label className="form-label" style={{ margin: 0 }}>Decision tree (JSON)</label>
          <button className="btn-logout" onClick={handleFormat}>Format</button>
        </div>
        <textarea
          className="tree-editor"
          value={treeJson}
          onChange={(e) => { setTreeJson(e.target.value); validateJson(e.target.value); }}
          spellCheck={false}
          rows={20}
        />
        {jsonError && <p className="form-error" style={{ textAlign: "left", marginTop: "6px" }}>{jsonError}</p>}
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function formatDate(str) {
  if (!str) return "";
  const iso = str.replace(" ", "T");
  const normalized = /Z|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(normalized).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Manage() {
  useEffect(() => { document.title = "OpenDecisionFlow - Manage"; }, []);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [decisionflows, setDecisionFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();

  async function load() {
    setLoading(true);
    const data = await fetchDecisionFlows();
    setDecisionFlows(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      fetchDecisionFlow(Number(editId)).then((full) => {
        setEditing(full);
        setView("edit");
        setSearchParams({});
      });
    }
  }, []);

  async function handleEdit(q) {
    const full = await fetchDecisionFlow(q.id);
    setEditing(full);
    setView("edit");
  }

  async function handleSaveCreate(data) {
    const result = await createDecisionFlow(data);
    setView("list");
    load();
    return result;
  }

  async function handleSaveEdit(data) {
    const result = await updateDecisionFlow(editing.id, data);
    setView("list");
    setEditing(null);
    load();
    return result;
  }

  async function handleDelete(id) {
    await deleteDecisionFlow(id);
    setConfirmDelete(null);
    load();
  }

  function handleSearch(val) {
    setSearch(val);
    setPage(1);
    setConfirmDelete(null);
  }

  function handlePageChange(p) {
    setPage(p);
    setConfirmDelete(null);
  }

  if (view === "create") {
    return (
      <div className="page">
        <Editor onSave={handleSaveCreate} onCancel={() => setView("list")} />
      </div>
    );
  }

  if (view === "edit") {
    return (
      <div className="page">
        <Editor
          decisionflow={editing}
          onSave={handleSaveEdit}
          onCancel={() => { setView("list"); setEditing(null); }}
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">Manage decisionflows</h2>
          <p className="page-subtitle">Create, edit or delete decisionflows.</p>
        </div>
        <div className="manage-toolbar-actions">
          <input
            className="search-bar"
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <button className="btn-primary" style={{ width: "auto", padding: "8px 20px", whiteSpace: "nowrap" }} onClick={() => setView("create")}>
            + New
          </button>
        </div>
      </div>

      {loading ? (
        <p className="loading">Loading...</p>
      ) : (() => {
        const q = search.toLowerCase();
        const filtered = decisionflows.filter((item) =>
          item.title.toLowerCase().includes(q) ||
          (item.created_by ?? "").toLowerCase().includes(q)
        );
        const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
        return filtered.length === 0 ? (
          <p style={{ color: "var(--text)" }}>No results for "{search}".</p>
        ) : (
        <>
        <table className="history-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Title</th>
              <th>Author</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {slice.map((q) => (
              <tr key={q.id}>
                <td style={{ color: "var(--text)", fontSize: "14px", width: "40px" }}>{q.id}</td>
                <td style={{ fontWeight: 500 }}>{q.title}</td>
                <td style={{ color: "var(--text)", fontSize: "14px" }}>{q.created_by || "—"}</td>
                <td style={{ color: "var(--text)", fontSize: "14px", whiteSpace: "nowrap" }}>{formatDate(q.created_at)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  {(q.created_by === user.username || user.isAdmin) && (
                    <button
                      className="btn-path-toggle"
                      onClick={() => navigate(`/app/decisionflow/${q.id}/history`)}
                    >
                      Responses
                    </button>
                  )}
                  <button className="btn-path-toggle" onClick={() => handleEdit(q)}>
                    Edit
                  </button>
                  {confirmDelete === q.id ? (
                    <>
                      <button
                        className="btn-delete-confirm"
                        onClick={() => handleDelete(q.id)}
                      >
                        Confirm
                      </button>
                      <button className="btn-path-toggle" onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="btn-delete" onClick={() => setConfirmDelete(q.id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          total={filtered.length}
          perPage={PER_PAGE}
          onChange={handlePageChange}
        />
        </>
        );
      })()}
    </div>
  );
}
