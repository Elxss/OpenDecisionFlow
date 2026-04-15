import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchGuestDecisionFlow, saveGuestResult } from "../api/mock";

const today = new Date().toISOString().split("T")[0];

export default function Play() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [decisionflow, setDecisionflow] = useState(null);
  const [currentNode, setCurrentNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [collectedData, setCollectedData] = useState({});
  const [path, setPath] = useState([]);

  useEffect(() => {
    fetchGuestDecisionFlow(code)
      .then((data) => {
        setDecisionflow(data);
        setCurrentNode(data.tree);
        setLoading(false);
        document.title = `OpenDecisionFlow - ${data.title}`;
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [code]);

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
      saveGuestResult(decisionflow.id, node.text, collectedData, newPath, code);
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
      saveGuestResult(decisionflow.id, next.text, newData, newPath, code);
    }
    setCollectedData(newData);
    setPath(newPath);
    setCurrentNode(next);
  }

  if (loading) return <p className="loading">Loading...</p>;

  if (error) return (
    <div className="decisionflow-page" style={{ textAlign: "center" }}>
      <p style={{ color: "var(--text)", marginBottom: "16px" }}>{error}</p>
      <button className="btn-secondary" onClick={() => navigate("/login")}>
        Sign in
      </button>
    </div>
  );

  return (
    <div className="decisionflow-page">
      <div className="decisionflow-topbar">
        <p className="decisionflow-label">
          {decisionflow.title}
        </p>
        <span className="guest-badge">Guest</span>
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
            <button className="btn-restart" onClick={handleRestart}>
              Start over
            </button>
          </div>
          <p style={{ textAlign: "center", marginTop: "24px", fontSize: "13px", color: "var(--text)" }}>
            Create an account to save your results —{" "}
            <a href="/register" style={{ color: "var(--accent)" }}>Sign up</a>
          </p>
        </>
      )}
    </div>
  );
}
