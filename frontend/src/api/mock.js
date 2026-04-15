const base = "/api";

async function parseResponse(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Unexpected server error.");
  }
}

// All requests include the session cookie automatically
const defaultOpts = { credentials: "include" };

function json(method, body) {
  return {
    ...defaultOpts,
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export async function register(username, password) {
  const res = await fetch(`${base}/auth/register`, json("POST", { username, password }));
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error ?? "Registration failed.");
  return data;
}

export async function login(username, password) {
  const res = await fetch(`${base}/auth/login`, json("POST", { username, password }));
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error ?? "Sign in failed.");
  return data;
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${base}/auth/password`, json("PUT", { currentPassword, newPassword }));
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error ?? "Password change failed.");
  return data;
}

export async function logout() {
  await fetch(`${base}/auth/logout`, { ...defaultOpts, method: "POST" });
}

export async function getMe() {
  const res = await fetch(`${base}/auth/me`, defaultOpts);
  if (!res.ok) return null;
  return res.json();
}

// ─── DecisionFlows ────────────────────────────────────────────────────────

export async function fetchDecisionFlows() {
  const res = await fetch(`${base}/decisionflows`, defaultOpts);
  return res.json();
}

export async function fetchDecisionFlow(id) {
  const res = await fetch(`${base}/decisionflows/${id}`, defaultOpts);
  return res.json();
}

export async function createDecisionFlow(data) {
  const res = await fetch(`${base}/decisionflows`, json("POST", data));
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function updateDecisionFlow(id, data) {
  const res = await fetch(`${base}/decisionflows/${id}`, json("PUT", data));
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function deleteDecisionFlow(id) {
  const res = await fetch(`${base}/decisionflows/${id}`, { ...defaultOpts, method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error);
}

export async function toggleFavorite(id) {
  const res = await fetch(`${base}/favorites/${id}`, { ...defaultOpts, method: "POST" });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function regenerateCode(id) {
  const res = await fetch(`${base}/decisionflows/${id}/new-code`, { ...defaultOpts, method: "POST" });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function removeAccess(id) {
  const res = await fetch(`${base}/access/${id}`, { ...defaultOpts, method: "DELETE" });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function redeemCode(code) {
  const res = await fetch(`${base}/access/redeem`, json("POST", { code }));
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error ?? "Invalid code.");
  return data;
}

export async function fetchShareInfo(id) {
  const res = await fetch(`${base}/share/${id}`);
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error ?? "DecisionFlow not found.");
  return data;
}

export async function fetchGuestDecisionFlow(code) {
  const res = await fetch(`${base}/guest/decisionflow/${encodeURIComponent(code)}`);
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error ?? "DecisionFlow not found.");
  return data;
}

export async function saveGuestResult(decisionflowId, result, collectedData = {}, path = [], code) {
  await fetch(`${base}/guest/results`, json("POST", { decisionflowId, result, path, collectedData, code }));
}

// ─── Results ───────────────────────────────────────────────────────────────

export async function fetchHistory() {
  const res = await fetch(`${base}/results`, defaultOpts);
  return res.json();
}

export async function fetchDecisionFlowResults(id) {
  const res = await fetch(`${base}/decisionflows/${id}/results`, defaultOpts);
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function saveResult(decisionflowId, result, collectedData = {}, path = []) {
  // collectedData nested under its own key — avoids overwriting decisionflowId/result if a node key has the same name
  await fetch(`${base}/results`, json("POST", { decisionflowId, result, path, collectedData }));
}
