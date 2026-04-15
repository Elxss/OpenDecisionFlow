import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDecisionFlow, saveResult } from "../api/mock";
import { useAuth } from "../context/AuthContext";

const today = new Date().toISOString().split("T")[0];

export default function DecisionFlowView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [decisionflow, setDecisionflow] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState("");
  const [collectedData, setCollectedData] = useState({});
  const [path, setPath] = useState([]);

  useEffect(() => {
    fetchDecisionFlow(id).then((data) => {
      setDecisionflow(data);
      setCurrentNode(data.tree);
      setLoading(false);
      document.title = `OpenDecisionFlow - ${data.title}`;
    });
  }, [id]);

  useEffect(() => {
    if (!currentNode) return;
    if (currentNode.type === "date") setInputValue(today);
    else if (currentNode.type === "text") setInputValue("");
  }, [currentNode]);

  function handleRestart() {
    setCurrentNode(decisionflow.tree);
    setCollectedData({});
    setPath([]);
  }

  function handleChoice(choice, node) {
    const step = { type: currentNode.type, text: currentNode.text, answer: choice };
    const newPath = [...path, step];

    if (node.type === "action") {
      newPath.push({ type: "action", text: node.text });
      saveResult(Number(id), node.text, collectedData, newPath);
    }

    setPath(newPath);
    setCurrentNode(node);
  }

  function handleInputSubmit() {
    const val = inputValue.trim();
    if (!val) return;

    const newData = { ...collectedData, [currentNode.key]: val };
    const step = { type: currentNode.type, text: currentNode.text, answer: val };
    const newPath = [...path, step];
    const next = currentNode.next;

    if (next.type === "action") {
      newPath.push({ type: "action", text: next.text });
      saveResult(Number(id), next.text, newData, newPath);
    }

    setCollectedData(newData);
    setPath(newPath);
    setCurrentNode(next);
  }

  if (loading) return <p className="loading">Loading...</p>;

  return (
    <div className="decisionflow-page">
      <div className="decisionflow-topbar">
        <p className="decisionflow-label" onClick={() => navigate("/app")}>
          ← {decisionflow.title}
        </p>
        {(user?.username === decisionflow.created_by || user?.isAdmin) && (
          <button
            className="btn-settings"
            title="Edit this decisionflow"
            onClick={() => navigate(`/app/manage?edit=${id}`)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        )}
      </div>

      {currentNode.type === "question" && (
        <>
          <p className="question-text">{currentNode.text}</p>
          <div className="choices">
            {Object.entries(currentNode.branches).map(([choice, node]) => (
              <button key={choice} className="choice-btn" onClick={() => handleChoice(choice, node)}>
                {choice}
              </button>
            ))}
          </div>
        </>
      )}

      {(currentNode.type === "text" || currentNode.type === "date") && (
        <>
          <p className="question-text">{currentNode.text}</p>
          <div className="choices">
            <input
              className="form-input"
              type={currentNode.type === "date" ? "date" : "text"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInputSubmit()}
              autoFocus
            />
            <button
              className="btn-primary"
              style={{ marginTop: "4px" }}
              onClick={handleInputSubmit}
              disabled={!inputValue.trim()}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {currentNode.type === "action" && (
        <>
          <p className="result-text">{currentNode.text}</p>
          <div className="result-actions">
            <button className="btn-secondary" onClick={() => navigate("/app")}>
              Back to browse
            </button>
            {(user?.username === decisionflow.created_by || decisionflow.history_public === 1) && (
              <button
                className="btn-history"
                onClick={() => navigate(`/app/decisionflow/${id}/history`)}
              >
                See responses
              </button>
            )}
            <button className="btn-restart" onClick={handleRestart}>
              Start over
            </button>
          </div>
        </>
      )}
    </div>
  );
}
