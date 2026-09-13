# ⚡ Milestone 2 — Build the Backend

## 🎯 Goal

Create the Node/Express API. It's a simple message board with two endpoints.

---

## 📝 Step 1 — Initialize the Project

```powershell
cd docker-fullstack-app\backend
npm init -y
npm install express pg dotenv cors
npm install --save-dev nodemon
```

| 📦 Package | 🔧 Purpose |
|---------|---------|
| `express` | web framework (routes) |
| `pg` | connect to PostgreSQL |
| `dotenv` | load environment variables |
| `cors` | allow the browser to call the API |
| `nodemon` | auto-restart on file changes (dev only) |

---

## 📝 Step 2 — Configure `package.json`

```json
{
  "name": "backend",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

`"type": "module"` lets you use `import` instead of `require`. 🆕

---

## 📝 Step 3 — Database Connection (`src/db.js`)

```js
import pg from "pg";

const config = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "appuser",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "appdb",
  max: 10,
  idleTimeoutMillis: 30000,
};

export const pool = new pg.Pool(config);

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  console.log("Database ready (table 'messages' verified)");
}
```

### 🌟 The key habit: environment variables

Every config value has an **environment variable with a default**. That one habit makes the same code run on your laptop, in Docker, and on EC2. 🔑

---

## 📝 Step 4 — The API (`src/index.js`)

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
      console.log(`Backend listening on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("Startup failed (is the database up?):", err.message);
    process.exit(1);
  }
}

start();
```

### 🐛 Two lines that matter in Docker

| 📖 Line | 🔍 Reason |
|------|--------|
| `app.listen(PORT, "0.0.0.0", ...)` | Inside a container, `localhost` means only that container. `0.0.0.0` exposes the API to the Docker network. |
| `process.exit(1)` on failure | Makes the container exit so Docker can restart it later. |

---

## 📝 Step 5 — Add `.gitignore` and `.dockerignore`

`backend/.gitignore`:
```
node_modules/
.env
```

`backend/.dockerignore`:
```
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

---

## 📝 Step 6 — Test Locally (Expect Failure 🧯)

```powershell
node src/index.js
```

Expected output — this is **correct** 🤔:
```
Startup failed (is the database up?): ... ECONNREFUSED
```

There's no database yet. Press `Ctrl+C`. In Milestone 5 you'll add the database container. 🐘

---

## ✅ Checkpoint

```
[ ] ✔️ backend/package.json has "type": "module" + start/dev scripts
[ ] ✔️ db.js reads config from environment variables
[ ] ✔️ index.js has /api/health, GET + POST /api/messages
[ ] ✔️ app.listen uses 0.0.0.0
[ ] ✔️ .gitignore and .dockerignore exist
```

---

➡️ **Next:** [Milestone 3 — Build the Frontend](03-build-the-frontend.md)