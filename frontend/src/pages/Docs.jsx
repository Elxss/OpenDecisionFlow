import { useEffect } from "react";

export default function Docs() {
  useEffect(() => { document.title = "OpenDecisionFlow - Documentation"; }, []);

  return (
    <div className="page docs-page">
      <h2 className="page-title">Documentation</h2>
      <p className="page-subtitle">JSON format for decision trees.</p>

      <section className="docs-section">
        <h3 className="docs-h3">Overview</h3>
        <p className="docs-p">
          A decision tree is a JSON object with a root node. Each node has a{" "}
          <code>type</code> field that controls its behavior. Four types are available.
        </p>
        <table className="docs-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Role</th>
              <th>Terminal?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>question</code></td>
              <td>Shows a question with clickable choices</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>action</code></td>
              <td>Shows the final result</td>
              <td>Yes</td>
            </tr>
            <tr>
              <td><code>text</code></td>
              <td>Shows a free-text input</td>
              <td>No</td>
            </tr>
            <tr>
              <td><code>date</code></td>
              <td>Shows a date picker (defaults to today)</td>
              <td>No</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="docs-section">
        <h3 className="docs-h3">Type <code>question</code></h3>
        <p className="docs-p">
          Presents a list of choices. Each key in <code>branches</code> becomes a button.
          The associated value is the next node.
        </p>
        <pre className="docs-pre">{`{
  "type": "question",
  "text": "What do you want to eat?",
  "branches": {
    "Pizza":  { "type": "action", "text": "Order a pizza" },
    "Pasta":  { "type": "action", "text": "Make some pasta" }
  }
}`}</pre>
        <table className="docs-table">
          <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>type</code></td><td>string</td><td>Yes</td><td>Fixed value: <code>"question"</code></td></tr>
            <tr><td><code>text</code></td><td>string</td><td>Yes</td><td>Text shown to the user</td></tr>
            <tr><td><code>branches</code></td><td>object</td><td>Yes</td><td>Key = button label, value = next node</td></tr>
          </tbody>
        </table>
      </section>

      <section className="docs-section">
        <h3 className="docs-h3">Type <code>action</code></h3>
        <p className="docs-p">
          Terminal node. Shows the result and offers a restart button.
          This text is sent to the backend as the <code>result</code> value.
        </p>
        <pre className="docs-pre">{`{
  "type": "action",
  "text": "Order a pizza"
}`}</pre>
        <table className="docs-table">
          <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>type</code></td><td>string</td><td>Yes</td><td>Fixed value: <code>"action"</code></td></tr>
            <tr><td><code>text</code></td><td>string</td><td>Yes</td><td>Result shown to the user and sent to the backend</td></tr>
          </tbody>
        </table>
      </section>

      <section className="docs-section">
        <h3 className="docs-h3">Type <code>text</code></h3>
        <p className="docs-p">
          Shows a free-text input. The entered value is stored in the payload
          under the key defined by <code>key</code>.
        </p>
        <pre className="docs-pre">{`{
  "type": "text",
  "text": "Where are you located?",
  "key": "location",
  "next": { ... }
}`}</pre>
        <table className="docs-table">
          <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>type</code></td><td>string</td><td>Yes</td><td>Fixed value: <code>"text"</code></td></tr>
            <tr><td><code>text</code></td><td>string</td><td>Yes</td><td>Question shown above the input</td></tr>
            <tr><td><code>key</code></td><td>string</td><td>Yes</td><td>Key used in the JSON payload sent to the backend</td></tr>
            <tr><td><code>next</code></td><td>node</td><td>Yes</td><td>Next node after submission</td></tr>
          </tbody>
        </table>
      </section>

      <section className="docs-section">
        <h3 className="docs-h3">Type <code>date</code></h3>
        <p className="docs-p">
          Shows a date picker. Today's date is pre-filled by default.
          Works like <code>text</code>: the value is stored under <code>key</code>.
        </p>
        <pre className="docs-pre">{`{
  "type": "date",
  "text": "For which date?",
  "key": "date",
  "next": { ... }
}`}</pre>
        <table className="docs-table">
          <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><code>type</code></td><td>string</td><td>Yes</td><td>Fixed value: <code>"date"</code></td></tr>
            <tr><td><code>text</code></td><td>string</td><td>Yes</td><td>Question shown above the picker</td></tr>
            <tr><td><code>key</code></td><td>string</td><td>Yes</td><td>Key used in the JSON payload sent to the backend</td></tr>
            <tr><td><code>next</code></td><td>node</td><td>Yes</td><td>Next node after submission</td></tr>
          </tbody>
        </table>
      </section>

      <section className="docs-section">
        <h3 className="docs-h3">Payload sent to the backend</h3>
        <p className="docs-p">
          When a DecisionFlow completes, a JSON object is sent via <code>POST /api/results</code>.
          It contains the final result along with any <code>text</code> / <code>date</code> inputs
          collected along the way.
        </p>
        <pre className="docs-pre">{`// Example for the "Find a service" DecisionFlow
{
  "decisionflowId": 4,
  "result": "Delivery search",
  "location": "New York",
  "date": "2026-04-14"
}`}</pre>
      </section>

      <section className="docs-section">
        <h3 className="docs-h3">Full example</h3>
        <p className="docs-p">
          A mixed tree combining all four node types.
        </p>
        <pre className="docs-pre">{`{
  "type": "text",
  "text": "Where are you located?",
  "key": "location",
  "next": {
    "type": "date",
    "text": "For which date?",
    "key": "date",
    "next": {
      "type": "question",
      "text": "What kind of service?",
      "branches": {
        "Delivery":   { "type": "action", "text": "Delivery search" },
        "Dine in":    { "type": "action", "text": "Dine-in search" }
      }
    }
  }
}`}</pre>
      </section>
    </div>
  );
}
