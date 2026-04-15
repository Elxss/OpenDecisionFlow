import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH         = Bun.env.DB_PATH         || "./data.db";
const ADMIN_USERNAME  = Bun.env.ADMIN_USERNAME  || "admin";
const ADMIN_PASSWORD  = Bun.env.ADMIN_PASSWORD  || null;

// Create the parent directory if needed (e.g. /app/data/data.db)
try { mkdirSync(dirname(DB_PATH), { recursive: true }); } catch {}

export const db = new Database(DB_PATH, { create: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token      TEXT NOT NULL UNIQUE,
    user_id    INTEGER NOT NULL,
    username   TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS decisionflows (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    title          TEXT NOT NULL,
    description    TEXT NOT NULL,
    tree           TEXT NOT NULL,
    created_by     TEXT NOT NULL DEFAULT '',
    history_public INTEGER NOT NULL DEFAULT 0,
    is_public      INTEGER NOT NULL DEFAULT 1,
    access_code    TEXT,
    allow_guests   INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT DEFAULT (datetime('now'))
  )
`);

try { db.exec("ALTER TABLE questionnaires ADD COLUMN created_by TEXT NOT NULL DEFAULT ''"); } catch {}
try { db.exec("ALTER TABLE questionnaires ADD COLUMN history_public INTEGER NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE questionnaires ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1"); } catch {}
try { db.exec("ALTER TABLE questionnaires ADD COLUMN access_code TEXT"); } catch {}
try { db.exec("ALTER TABLE questionnaires ADD COLUMN allow_guests INTEGER NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE questionnaires RENAME TO decisionflows"); } catch {}
try { db.exec("ALTER TABLE results RENAME COLUMN questionnaire_id TO decisionflow_id"); } catch {}
try { db.exec("ALTER TABLE user_favorites RENAME COLUMN questionnaire_id TO decisionflow_id"); } catch {}
try { db.exec("ALTER TABLE user_access RENAME COLUMN questionnaire_id TO decisionflow_id"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0"); } catch {}

db.exec(`
  CREATE TABLE IF NOT EXISTS user_favorites (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    decisionflow_id  INTEGER NOT NULL,
    created_at       TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, decisionflow_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_access (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    decisionflow_id  INTEGER NOT NULL,
    created_at       TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, decisionflow_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Make sure the admin account has is_admin = 1
db.prepare("UPDATE users SET is_admin = 1 WHERE username = ?").run(ADMIN_USERNAME);

db.exec(`
  CREATE TABLE IF NOT EXISTS results (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    decisionflow_id  INTEGER NOT NULL,
    title            TEXT NOT NULL,
    result           TEXT NOT NULL,
    payload          TEXT NOT NULL,
    user_email       TEXT,
    created_at       TEXT DEFAULT (datetime('now'))
  )
`);

// ─── Seed users ────────────────────────────────────────────────────────────

const userCount = db.prepare("SELECT COUNT(*) as n FROM users").get();
if (userCount.n === 0) {
  const plainPassword  = ADMIN_PASSWORD || "admin";
  const mustChange     = ADMIN_PASSWORD ? 0 : 1;
  const hash           = Bun.password.hashSync(plainPassword);
  db.prepare(
    "INSERT INTO users (username, password, is_admin, must_change_password) VALUES (?, ?, 1, ?)"
  ).run(ADMIN_USERNAME, hash, mustChange);
  if (mustChange) {
    console.log(`[db] Default account created: ${ADMIN_USERNAME} / admin — password change required on first login`);
  } else {
    console.log(`[db] Admin account created: ${ADMIN_USERNAME} (password set via env)`);
  }
}

// ─── Seed decisionflows ────────────────────────────────────────────────────

const qCount = db.prepare("SELECT COUNT(*) as n FROM decisionflows").get();
if (qCount.n === 0) {
  const insert = db.prepare(
    "INSERT INTO decisionflows (title, description, tree, created_by) VALUES (?, ?, ?, ?)"
  );

  insert.run("What to eat tonight?", "Can't decide on dinner? Let the tree pick for you.", JSON.stringify({
    type: "question", text: "What are you in the mood for?",
    branches: {
      "Something warm": {
        type: "question", text: "Pizza or soup?",
        branches: {
          "Pizza": { type: "action", text: "Order a pizza" },
          "Soup":  { type: "action", text: "Make some homemade soup" },
        },
      },
      "A burger":    { type: "action", text: "Go get a burger" },
      "Pasta":       { type: "action", text: "Cook some pasta" },
      "Something else": {
        type: "question", text: "Sweet or savory?",
        branches: {
          "Sweet":  { type: "action", text: "Have dessert" },
          "Savory": { type: "action", text: "Grab some chips" },
        },
      },
    },
  }), "admin");

  insert.run("What to do today?", "Find the right activity for your day.", JSON.stringify({
    type: "question", text: "What do you feel like doing?",
    branches: {
      "Stay home": {
        type: "question", text: "Relax or be productive?",
        branches: {
          "Relax":      { type: "action", text: "Watch a movie" },
          "Productive": { type: "action", text: "Read a book" },
        },
      },
      "Go out": {
        type: "question", text: "Solo or with friends?",
        branches: {
          "Solo":         { type: "action", text: "Go for a walk" },
          "With friends": { type: "action", text: "Head to a restaurant" },
        },
      },
    },
  }), "admin");

  insert.run("What to watch tonight?", "Let the tree pick your movie.", JSON.stringify({
    type: "question", text: "What genre are you feeling?",
    branches: {
      "Action": {
        type: "question", text: "Recent or classic?",
        branches: {
          "Recent":  { type: "action", text: "Watch a Marvel movie" },
          "Classic": { type: "action", text: "Watch Die Hard" },
        },
      },
      "Comedy":       { type: "action", text: "Watch The Office" },
      "Horror":       { type: "action", text: "Watch Hereditary" },
      "Documentary":  { type: "action", text: "Watch a documentary" },
    },
  }), "admin");

  insert.run("Find a service", "Location + date + type of service", JSON.stringify({
    type: "text", text: "Where are you located?", key: "location",
    next: {
      type: "date", text: "For which date?", key: "date",
      next: {
        type: "question", text: "What kind of service are you looking for?",
        branches: {
          "Delivery":  { type: "action", text: "Delivery search" },
          "Dine in":   { type: "action", text: "Dine-in search" },
          "Takeaway":  { type: "action", text: "Takeaway search" },
        },
      },
    },
  }), "admin");

  console.log("[db] 4 demo decisionflows created");
}
