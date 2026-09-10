# Milestone 2 — ⚡ Build the Backend

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Create the Express API that will become the backend container.

## ✅ Prerequisites

```text
[ ] ✅ Milestone 1 (Node installed, project skeleton exists)
```

---

## 📝 Step 1 — Initialize the Node Project

```powershell
cd D:\docker-fullstack-app\backend
npm init -y
npm install express pg dotenv cors
npm install --save-dev nodemon
```

```text
express  →  web framework
pg       →  PostgreSQL client
dotenv   →  loads environment variables
cors     →  allows cross-origin requests
nodemon  →  auto-restarts on file changes (dev only)
```

---

## 📝 Step 2 — Configure the package

Open `backend/package.json`. Replace `main`, add `"type": "module"`, and set scripts:

```json
{
  "name": "backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

> 💡 `"type": "module"` lets you use `import` instead of `require` — modern Node syntax.

---

## 📝 Step 3 — Create the Database Connection (`backend/src/db.js`)

```js
import pg from "pg";

const config = {
  host: process.env.DB_HOST || "localhost", // in Docker: 'db' (the service name)
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "appdb",
  max: 10,
  idleTimeoutMillis: 30000,
};

export const pool = new pg.Pool(config);

// Create the table on startup so the app is self-bootstrapping
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log('✅ Database ready (table "messages" verified)');
}
```

> 💡 Every config value comes from an **environment variable with a local fallback**. That's the one habit making the same code run on your laptop, in Docker Desktop, and on EC2.

> 🇳🇵 **सरल व्याख्या:** पासवर्ड जस्ता गोप्य कुरा code मा नलेखी environment variable (`.env` फाइल) बाट लिइन्छ — एउटै code ले जुनसुकै ठाउँको सेटिङ मान्छ, र गोप्यता पनि जोगिन्छ।

---

## 📝 Step 4 — Create the API (`backend/src/index.js`)

```js
import express from "express";
import cors from "cors";
import { pool, initDb } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/messages", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, message, created_at FROM messages ORDER BY created_at DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/messages failed:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/api/messages", async (req, res) => {
  const { name, message } = req.body;
  if (!name || !message) {
    return res.status(400).json({ error: "name and message are required" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO messages (name, message) VALUES ($1, $2) RETURNING *",
      [name, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/messages failed:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

async function start() {
  try {
    await initDb();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup failed (is the database up?):", err.message);
    process.exit(1);
  }
}

start();
```

### Two details that matter in containers

| Detail | Why |
|--------|-----|
| `app.listen(PORT, "0.0.0.0", ...)` | Inside a container, `localhost` means "this container only". Binding `0.0.0.0` exposes the API to the Docker network. |
| `process.exit(1)` on startup failure | Makes the container exit so Docker/Compose can restart it once the database is ready (Milestones 6–7). |

---

## 📝 Step 5 — Add `.gitignore` and `.dockerignore`

`backend/.gitignore`:

```text
node_modules/
.env
```

`backend/.dockerignore`:

```text
node_modules
npm-debug.log
.env
.env.*
Dockerfile
.dockerignore
.git
tests
*.md
```

> 💡 `.dockerignore` keeps secrets and hundreds of MB of `node_modules` out of the Docker build context (Milestone 4).

---

## 📝 Step 6 — Test Locally (Expect It to Fail)

```powershell
node src/index.js
```

Expected output (this is **correct**):

```text
❌ Startup failed (is the database up?): ... ECONNREFUSED
```

There's no database yet — the code is ready for the DB container in Milestone 5. `Ctrl+C` to stop.

---

## ✅ Checkpoint

```text
[ ] backend/package.json has "type": "module" + start/dev scripts
[ ] db.js reads config from environment variables with fallbacks
[ ] index.js exposes /api/health, GET + POST /api/messages
[ ] Backend listens on 0.0.0.0 (you can explain why)
[ ] Startup failure exits with code 1 (you can explain why)
[ ] .gitignore and .dockerignore exist in backend/
```

---

## 💡 Common Beginner Mistakes

| Mistake | Fix |
|---------|-----|
| Listening on `localhost` instead of `0.0.0.0` | Use `0.0.0.0` — required for containers |
| Hardcoding DB credentials in code | Read everything from env vars |
| `npm install` without a lockfile | Commit `package-lock.json` — `npm ci` needs it |
| Exporting secrets to a repo | `.env` is git-ignored |

---

**Next:** [Milestone 3 — Build the Frontend](03-build-the-frontend.md) →