import { useState } from "react";
import { tree } from "./tree";

const styles = {
  question: {
    fontSize: "22px",
    marginBottom: "20px",
  },
  button: {
    margin: "10px",
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer",
  },
};

export default function DecisionTree() {
  const [currentNode, setCurrentNode] = useState(tree);

  if (currentNode.type === "question") {
    return (
      <div>
        <p style={styles.question}>{currentNode.text}</p>
        <div>
          {Object.entries(currentNode.branches).map(([choice, node]) => (
            <button key={choice} style={styles.button} onClick={() => setCurrentNode(node)}>
              {choice}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={styles.question}>{currentNode.text}</p>
      <div>
        <button style={styles.button} onClick={() => setCurrentNode(tree)}>Recommencer</button>
      </div>
    </div>
  );
}
