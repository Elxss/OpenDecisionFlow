import { Hono } from "hono";
import { cors } from "hono/cors";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { db } from "./db.js";

// ─── Config ─────────────────────────────────────────────────────────────────

const CORS_ORIGIN            = Bun.env.CORS_ORIGIN                          || "http://localhost:5173";
const COOKIE_SECURE          = Bun.env.COOKIE_SECURE === "true";
const RATE_WINDOW            = parseInt(Bun.env.RATE_WINDOW_MS)             || 60_000;
const RATE_LIMIT_AUTH        = parseInt(Bun.env.RATE_LIMIT_AUTH)            || 20;
const RATE_LIMIT_STRICT      = parseInt(Bun.env.RATE_LIMIT_STRICT)          || 40;
const RATE_LIMIT_SEARCH      = parseInt(Bun.env.RATE_LIMIT_SEARCH)          || 20;
const RATE_LIMIT_DECISIONFLOW = parseInt(Bun.env.RATE_LIMIT_DECISIONFLOW) || 30;
const SESSION_DURATION_DAYS  = parseInt(Bun.env.SESSION_DURATION_DAYS)      || 7;
const PORT                   = parseInt(Bun.env.PORT)                       || 3001;
const MAX_BODY_SIZE           = parseInt(Bun.env.MAX_BODY_SIZE)              || 1_048_576;

const app = new Hono();

app.use(
  "*",
  cors({
    origin: CORS_ORIGIN === "*" ? (origin) => origin : CORS_ORIGIN,
    credentials: true,
  })
);

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Format XXXX-XXXX-XXXX (no I, O, 0, 1 to avoid confusion)
function generateAccessCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const group = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

function createSession(userId, username) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().replace("T", " ").split(".")[0];
  db.prepare(
    "INSERT INTO sessions (token, user_id, username, expires_at) VALUES (?, ?, ?, ?)"
  ).run(token, userId, username, expiresAt);
  return token;
}

function setSessionCookie(c, token) {
  setCookie(c, "session", token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    secure: COOKIE_SECURE,
  });
}

async function parseBody(c) {
  try { return await c.req.json(); } catch { return null; }
}

function parseId(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ─── Rate limiting ──────────────────────────────────────────────────────────

const rateLimitMap = new Map();

// Returns the real client IP — x-forwarded-for can be spoofed by the client,
// so we only trust x-real-ip set by nginx in Docker.
// In dev without a proxy, falls back to "dev-client" (shared bucket, fine for local use).
function getClientIp(c) {
  // nginx (Docker) sets X-Real-IP → rate limiting per real IP
  // In dev without a proxy, returns "dev-client" (shared bucket, no real consequence)
  return c.req.header("x-real-ip") ?? "dev-client";
}

function checkRateLimit(ip, limit = 10) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// Standard rate limit — auth routes
const rateLimit = async (c, next) => {
  const ip = getClientIp(c);
  if (!checkRateLimit(ip, RATE_LIMIT_AUTH))
    return c.json({ error: "Too many attempts, try again in a minute." }, 429);
  await next();
};

// Strict rate limit — guest access and redeem
const rateLimitStrict = async (c, next) => {
  const ip = getClientIp(c);
  if (!checkRateLimit(`strict:${ip}`, RATE_LIMIT_STRICT))
    return c.json({ error: "Too many attempts, try again in a minute." }, 429);
  await next();
};

// Search rate limit — GET /api/decisionflows
const rateLimitSearch = async (c, next) => {
  const ip = getClientIp(c);
  if (!checkRateLimit(`search:${ip}`, RATE_LIMIT_SEARCH))
    return c.json({ error: "Too many requests, try again in a minute." }, 429);
  await next();
};

// DecisionFlow open rate limit — GET /api/decisionflows/:id
const rateLimitDecisionflow = async (c, next) => {
  const ip = getClientIp(c);
  if (!checkRateLimit(`decisionflow:${ip}`, RATE_LIMIT_DECISIONFLOW))
    return c.json({ error: "Too many requests, try again in a minute." }, 429);
  await next();
};

// ─── Auth middleware ────────────────────────────────────────────────────────

const requireAuth = async (c, next) => {
  const token = getCookie(c, "session");
  if (!token) return c.json({ error: "Not authenticated" }, 401);

  const session = db.prepare(
    "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ).get(token);

  if (!session) {
    deleteCookie(c, "session", { path: "/" });
    return c.json({ error: "Session expired" }, 401);
  }

  const userRow = db.prepare("SELECT is_admin, must_change_password FROM users WHERE id = ?").get(session.user_id);
  c.set("user", {
    id: session.user_id,
    username: session.username,
    isAdmin: userRow?.is_admin === 1,
    mustChangePassword: userRow?.must_change_password === 1,
  });
  await next();
};

// Optional middleware: injects the user if authenticated, otherwise null
const optionalAuth = async (c, next) => {
  const token = getCookie(c, "session");
  if (token) {
    const session = db.prepare(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    ).get(token);
    if (session) {
      const userRow = db.prepare("SELECT is_admin, must_change_password FROM users WHERE id = ?").get(session.user_id);
      c.set("user", { id: session.user_id, username: session.username, isAdmin: userRow?.is_admin === 1, mustChangePassword: userRow?.must_change_password === 1 });
    }
  }
  await next();
};

// ─── Health check ──────────────────────────────────────────────────────────

app.get("/health", (c) => c.json({ status: "ok" }));

// ─── Auth routes ───────────────────────────────────────────────────────────

app.post("/api/auth/register", rateLimit, async (c) => {
  const body = await parseBody(c);
  if (!body) return c.json({ error: "Invalid request body." }, 400);

  const { username, password } = body;
  if (!username || !password) return c.json({ error: "Missing fields" }, 400);
  if (typeof username !== "string" || typeof password !== "string")
    return c.json({ error: "Invalid fields" }, 400);
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(username))
    return c.json({ error: "Invalid username (3-20 characters, letters/digits/_ or -)" }, 400);
  if (password.length < 6) return c.json({ error: "Password too short (6 characters minimum)" }, 400);
  if (password.length > 72) return c.json({ error: "Password too long (72 characters maximum)" }, 400);

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) return c.json({ error: "Username already taken" }, 409);

  const hash = Bun.password.hashSync(password);
  const result = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hash);

  const token = createSession(result.lastInsertRowid, username);
  setSessionCookie(c, token);
  return c.json({ username }, 201);
});

app.post("/api/auth/login", rateLimit, async (c) => {
  const body = await parseBody(c);
  if (!body) return c.json({ error: "Invalid request body." }, 400);

  const { username, password } = body;
  if (!username || !password) return c.json({ error: "Missing fields" }, 400);
  if (typeof username !== "string" || typeof password !== "string")
    return c.json({ error: "Invalid fields" }, 400);
  if (password.length > 72) return c.json({ error: "Invalid credentials" }, 401);

  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return c.json({ error: "Invalid credentials" }, 401);

  const valid = await Bun.password.verify(password, user.password);
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  const token = createSession(user.id, user.username);
  setSessionCookie(c, token);
  return c.json({ username: user.username });
});

app.put("/api/auth/password", requireAuth, rateLimit, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c);
  if (!body) return c.json({ error: "Invalid request body." }, 400);

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) return c.json({ error: "Missing fields" }, 400);
  if (typeof currentPassword !== "string" || typeof newPassword !== "string")
    return c.json({ error: "Invalid fields" }, 400);
  if (newPassword.length < 6) return c.json({ error: "New password too short (6 characters minimum)" }, 400);
  if (newPassword.length > 72) return c.json({ error: "New password too long (72 characters maximum)" }, 400);

  const row = db.prepare("SELECT password FROM users WHERE id = ?").get(user.id);
  if (!row) return c.json({ error: "User not found" }, 404);

  const valid = await Bun.password.verify(currentPassword, row.password);
  if (!valid) return c.json({ error: "Current password is incorrect" }, 401);

  const hash = Bun.password.hashSync(newPassword);
  db.prepare("UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?").run(hash, user.id);

  // Invalidate all other sessions so old clients are logged out
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND token != ?").run(
    user.id,
    getCookie(c, "session")
  );

  return c.json({ success: true });
});

app.post("/api/auth/logout", (c) => {
  const token = getCookie(c, "session");
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  deleteCookie(c, "session", { path: "/" });
  return c.json({ success: true });
});

app.get("/api/auth/me", requireAuth, (c) => {
  const { id, username, isAdmin, mustChangePassword } = c.get("user");
  return c.json({ id, username, isAdmin, mustChangePassword });
});

// ─── DecisionFlows ─────────────────────────────────────────────────────────

app.get("/api/decisionflows", requireAuth, rateLimitSearch, (c) => {
  const user = c.get("user");

  let rows;
  if (user.isAdmin) {
    rows = db.prepare(`
      SELECT q.id, q.title, q.description, q.created_by, q.history_public,
             q.is_public, q.access_code, q.allow_guests, q.created_at,
             CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END AS is_liked
      FROM decisionflows q
      LEFT JOIN user_favorites f ON f.decisionflow_id = q.id AND f.user_id = ?
      ORDER BY q.id
    `).all(user.id);
  } else {
    rows = db.prepare(`
      SELECT q.id, q.title, q.description, q.created_by, q.history_public,
             q.is_public, q.access_code, q.allow_guests, q.created_at,
             CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END AS is_liked
      FROM decisionflows q
      LEFT JOIN user_favorites f ON f.decisionflow_id = q.id AND f.user_id = ?
      WHERE q.is_public = 1
         OR q.created_by = ?
         OR EXISTS (
           SELECT 1 FROM user_access ua
           WHERE ua.decisionflow_id = q.id AND ua.user_id = ?
         )
      ORDER BY q.id
    `).all(user.id, user.username, user.id);
  }

  return c.json(rows.map((q) => ({
    ...q,
    access_code: (q.created_by === user.username || user.isAdmin) ? q.access_code : undefined,
  })));
});

app.post("/api/favorites/:id", requireAuth, (c) => {
  const user = c.get("user");
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  const exists = db.prepare(
    "SELECT 1 FROM user_favorites WHERE user_id = ? AND decisionflow_id = ?"
  ).get(user.id, id);

  if (exists) {
    db.prepare("DELETE FROM user_favorites WHERE user_id = ? AND decisionflow_id = ?").run(user.id, id);
    return c.json({ liked: false });
  } else {
    db.prepare("INSERT INTO user_favorites (user_id, decisionflow_id) VALUES (?, ?)").run(user.id, id);
    return c.json({ liked: true });
  }
});

app.get("/api/decisionflows/:id", requireAuth, rateLimitDecisionflow, (c) => {
  const user = c.get("user");
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  const row = db.prepare("SELECT * FROM decisionflows WHERE id = ?").get(id);
  if (!row) return c.json({ error: "Not found" }, 404);

  const isOwner = row.created_by === user.username || user.isAdmin;
  if (!row.is_public && !isOwner) {
    const access = db.prepare(
      "SELECT 1 FROM user_access WHERE user_id = ? AND decisionflow_id = ?"
    ).get(user.id, id);
    if (!access) return c.json({ error: "Access denied" }, 403);
  }

  let tree;
  try { tree = JSON.parse(row.tree); } catch { return c.json({ error: "Corrupted data" }, 500); }

  return c.json({
    ...row,
    tree,
    access_code: isOwner ? row.access_code : undefined,
  });
});

app.get("/api/decisionflows/:id/results", requireAuth, (c) => {
  const user = c.get("user");
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  const q = db.prepare("SELECT created_by, history_public, is_public FROM decisionflows WHERE id = ?").get(id);
  if (!q) return c.json({ error: "Not found" }, 404);

  const isOwner = q.created_by === user.username || user.isAdmin;

  if (!q.is_public && !isOwner) {
    const access = db.prepare(
      "SELECT 1 FROM user_access WHERE user_id = ? AND decisionflow_id = ?"
    ).get(user.id, id);
    if (!access) return c.json({ error: "Access denied" }, 403);
  }

  const isPublic = q.history_public === 1;

  let rows;
  if (isOwner || isPublic) {
    rows = db.prepare("SELECT * FROM results WHERE decisionflow_id = ? ORDER BY created_at DESC").all(id);
  } else {
    rows = db.prepare(
      "SELECT * FROM results WHERE decisionflow_id = ? AND user_email = ? ORDER BY created_at DESC"
    ).all(id, user.username);
  }

  return c.json({
    results: rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) })),
    isOwner,
    isPublic,
  });
});

app.post("/api/decisionflows", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c);
  if (!body) return c.json({ error: "Invalid request body." }, 400);

  const { title, description, tree, history_public = 0, is_public = 1, allow_guests = 0 } = body;
  if (!title || !description || !tree) return c.json({ error: "Missing fields" }, 400);
  if (typeof title !== "string" || title.length > 200) return c.json({ error: "Invalid title (200 characters maximum)" }, 400);
  if (typeof description !== "string" || description.length > 500) return c.json({ error: "Invalid description (500 characters maximum)" }, 400);
  if (typeof tree !== "object") return c.json({ error: "Invalid tree" }, 400);

  const access_code = !is_public ? generateAccessCode() : null;

  const result = db.prepare(
    "INSERT INTO decisionflows (title, description, tree, created_by, history_public, is_public, access_code, allow_guests) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(title, description, JSON.stringify(tree), user.username,
    history_public ? 1 : 0, is_public ? 1 : 0, access_code, allow_guests ? 1 : 0);

  return c.json({ id: result.lastInsertRowid, title, description, access_code }, 201);
});

app.put("/api/decisionflows/:id", requireAuth, async (c) => {
  const user = c.get("user");
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  const body = await parseBody(c);
  if (!body) return c.json({ error: "Invalid request body." }, 400);

  const { title, description, tree, history_public = 0, is_public = 1, allow_guests = 0 } = body;
  if (!title || !description || !tree) return c.json({ error: "Missing fields" }, 400);
  if (typeof title !== "string" || title.length > 200) return c.json({ error: "Invalid title (200 characters maximum)" }, 400);
  if (typeof description !== "string" || description.length > 500) return c.json({ error: "Invalid description (500 characters maximum)" }, 400);
  if (typeof tree !== "object") return c.json({ error: "Invalid tree" }, 400);

  const existing = db.prepare("SELECT id, created_by, is_public, access_code FROM decisionflows WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (!user.isAdmin && existing.created_by !== user.username) return c.json({ error: "Access denied" }, 403);

  // Generate a code if switching from public → private and none exists yet
  let access_code = existing.access_code;
  if (!is_public && !access_code) access_code = generateAccessCode();

  db.prepare(
    "UPDATE decisionflows SET title = ?, description = ?, tree = ?, history_public = ?, is_public = ?, access_code = ?, allow_guests = ? WHERE id = ?"
  ).run(title, description, JSON.stringify(tree), history_public ? 1 : 0, is_public ? 1 : 0, access_code, allow_guests ? 1 : 0, id);

  return c.json({ id, title, description, access_code });
});

app.delete("/api/decisionflows/:id", requireAuth, (c) => {
  const user = c.get("user");
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  const existing = db.prepare("SELECT id, created_by FROM decisionflows WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (!user.isAdmin && existing.created_by !== user.username) return c.json({ error: "Access denied" }, 403);

  db.prepare("DELETE FROM decisionflows WHERE id = ?").run(id);
  return c.json({ success: true });
});

// Regenerate access code
app.post("/api/decisionflows/:id/new-code", requireAuth, (c) => {
  const user = c.get("user");
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  const existing = db.prepare("SELECT id, created_by FROM decisionflows WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  if (!user.isAdmin && existing.created_by !== user.username) return c.json({ error: "Access denied" }, 403);

  const access_code = generateAccessCode();
  db.prepare("UPDATE decisionflows SET access_code = ? WHERE id = ?").run(access_code, id);
  return c.json({ access_code });
});

// Redeem an access code to unlock a private DecisionFlow
app.post("/api/access/redeem", requireAuth, rateLimitStrict, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c);
  if (!body) return c.json({ error: "Invalid request body." }, 400);

  const { code } = body;
  if (!code || typeof code !== "string") return c.json({ error: "Missing code" }, 400);

  const normalized = code.trim().toUpperCase();
  const q = db.prepare(
    "SELECT id, title, description, created_by, is_public FROM decisionflows WHERE access_code = ?"
  ).get(normalized);

  if (!q) return c.json({ error: "Invalid or expired code." }, 404);
  if (q.is_public) return c.json({ error: "This DecisionFlow is already public." }, 400);
  if (q.created_by === user.username) return c.json({ error: "You are already the author of this DecisionFlow." }, 400);

  db.prepare(
    "INSERT OR IGNORE INTO user_access (user_id, decisionflow_id) VALUES (?, ?)"
  ).run(user.id, q.id);

  return c.json({ decisionflow: { id: q.id, title: q.title, description: q.description } });
});

// Revoke your own access to a private DecisionFlow unlocked by code
app.delete("/api/access/:id", requireAuth, (c) => {
  const user = c.get("user");
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  db.prepare("DELETE FROM user_access WHERE user_id = ? AND decisionflow_id = ?").run(user.id, id);
  return c.json({ success: true });
});

// ─── Public share page ─────────────────────────────────────────────────────

app.get("/api/share/:id", (c) => {
  const id = parseId(c.req.param("id"));
  if (!id) return c.json({ error: "Invalid ID" }, 400);

  const row = db.prepare(
    "SELECT id, title, description, created_by, created_at, is_public, allow_guests, access_code FROM decisionflows WHERE id = ?"
  ).get(id);

  if (!row) return c.json({ error: "DecisionFlow not found." }, 404);
  if (!row.is_public && !row.allow_guests)
    return c.json({ error: "This DecisionFlow is not publicly shareable." }, 403);

  return c.json({
    id: row.id,
    title: row.title,
    description: row.description,
    created_by: row.created_by,
    created_at: row.created_at,
    is_public: row.is_public,
    allow_guests: row.allow_guests,
    // only include code if guest access is enabled (needed for the /play link)
    access_code: row.allow_guests ? row.access_code : undefined,
  });
});

// ─── Guest routes ──────────────────────────────────────────────────────────

app.get("/api/guest/decisionflow/:code", rateLimitStrict, (c) => {
  const code = c.req.param("code").trim().toUpperCase();
  const row = db.prepare(
    "SELECT * FROM decisionflows WHERE access_code = ? AND allow_guests = 1"
  ).get(code);

  if (!row) return c.json({ error: "DecisionFlow not found or guest access disabled." }, 404);

  let tree;
  try { tree = JSON.parse(row.tree); } catch { return c.json({ error: "Corrupted data" }, 500); }

  return c.json({ id: row.id, title: row.title, description: row.description, tree });
});

app.post("/api/guest/results", rateLimitStrict, async (c) => {
  const body = await parseBody(c);
  if (!body) return c.json({ error: "Invalid request body." }, 400);

  const { decisionflowId, result, path = [], collectedData = {}, code } = body;
  const id = parseId(decisionflowId);
  if (!id) return c.json({ error: "Invalid decisionflowId" }, 400);
  if (typeof result !== "string" || !result.trim()) return c.json({ error: "Invalid result" }, 400);

  const q = db.prepare("SELECT title, allow_guests, access_code FROM decisionflows WHERE id = ?").get(id);
  if (!q || !q.allow_guests) return c.json({ error: "Guest access not allowed for this DecisionFlow." }, 403);
  // Code is required — prevents result injection without a valid code
  if (!code || typeof code !== "string") return c.json({ error: "Code required." }, 403);
  if (q.access_code !== code.trim().toUpperCase()) return c.json({ error: "Invalid code." }, 403);

  db.prepare(
    "INSERT INTO results (decisionflow_id, title, result, payload, user_email) VALUES (?, ?, ?, ?, ?)"
  ).run(id, q.title, result, JSON.stringify({ decisionflowId: id, result, path, collectedData }), "guest");

  return c.json({ success: true }, 201);
});

// ─── Results ───────────────────────────────────────────────────────────────

app.get("/api/results", requireAuth, (c) => {
  const user = c.get("user");
  const rows = db.prepare("SELECT * FROM results WHERE user_email = ? ORDER BY created_at DESC").all(user.username);
  return c.json(rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) })));
});

app.post("/api/results", requireAuth, async (c) => {
  const user = c.get("user");
  const body = await parseBody(c);
  if (!body) return c.json({ error: "Invalid request body." }, 400);

  const { decisionflowId, result, path = [], collectedData = {} } = body;
  const id = parseId(decisionflowId);
  if (!id) return c.json({ error: "Invalid decisionflowId" }, 400);
  if (typeof result !== "string" || !result.trim()) return c.json({ error: "Invalid result" }, 400);

  const q = db.prepare("SELECT title, is_public, created_by FROM decisionflows WHERE id = ?").get(id);
  if (!q) return c.json({ error: "DecisionFlow not found" }, 404);

  const isOwner = q.created_by === user.username || user.isAdmin;
  if (!q.is_public && !isOwner) {
    const access = db.prepare(
      "SELECT 1 FROM user_access WHERE user_id = ? AND decisionflow_id = ?"
    ).get(user.id, id);
    if (!access) return c.json({ error: "Access denied" }, 403);
  }

  db.prepare(
    "INSERT INTO results (decisionflow_id, title, result, payload, user_email) VALUES (?, ?, ?, ?, ?)"
  ).run(id, q.title, result, JSON.stringify({ decisionflowId: id, result, path, collectedData }), user.username);

  return c.json({ success: true }, 201);
});

// ─── Session cleanup ───────────────────────────────────────────────────────

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // every hour

function cleanupSessions() {
  const { changes } = db.prepare(
    "DELETE FROM sessions WHERE expires_at < datetime('now')"
  ).run();
  if (changes > 0) console.log(`[cleanup] ${changes} expired session(s) removed`);
}

cleanupSessions(); // une fois au démarrage
setInterval(cleanupSessions, CLEANUP_INTERVAL_MS);

// ─── Start ─────────────────────────────────────────────────────────────────

Bun.serve({
  port: PORT,
  fetch: app.fetch,
  maxRequestBodySize: MAX_BODY_SIZE,
});

console.log(`Backend running on http://localhost:${PORT}`);
console.log(`[config] rate limit auth=${RATE_LIMIT_AUTH} strict=${RATE_LIMIT_STRICT} search=${RATE_LIMIT_SEARCH} decisionflow=${RATE_LIMIT_DECISIONFLOW} req/min | window=${RATE_WINDOW}ms | session=${SESSION_DURATION_DAYS}d`);
