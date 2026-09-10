# 02 — 🏗️ Project Overview & The Application

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Create the full-stack application you'll spend the rest of the project containerizing — a React frontend, an Express backend, and a PostgreSQL database — and understand exactly how the three will talk to each other.

## ✅ Prerequisites

```text
[ ] 🐳 Docker installed (Guide 01)
[ ] 📦 Node.js v18+ locally (only to generate lockfiles)
[ ] 🐙 Git available
```

---

## 🗺️ The Big Picture

By the end of this project, `docker compose up` starts three containers:

```
              ┌──────────────────┐
              │  🎨 Frontend     │  React build served by Nginx
              │  Container :8080 │  proxies /api/* to backend
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  ⚡ Backend      │  Node.js + Express REST API
              │  Container :3000 │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  🐘 PostgreSQL   │  data persists in a Docker volume
              │  Container :5432 │
              └──────────────────┘
```

### Key insight before you write any code

**Containers talk to each other over a shared Docker network, using service names as hostnames.** So inside the backend, the database host is literally `db` — not `localhost`. Guide 05 explains why; for now, design your code around this:

```text
Frontend  →  never connects to the DB. Only calls /api via the proxy.
Backend   →  connects to postgresql://db:5432  (hostname = service name)
Database  →  accepts connections only from the Docker network
```

---

## 📝 Step 1 — Create the Project Skeleton

```bash
mkdir docker-fullstack-app
cd docker-fullstack-app

mkdir frontend backend database
```

Final structure you're aiming for:

```
docker-fullstack-app/
├── frontend/
│   ├── src/
│   ├── Dockerfile          (Guide 04)
│   ├── nginx.conf          (Guide 04)
│   └── ...
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   └── db.js
│   ├── Dockerfile          (Guide 03)
│   └── ...
├── database/
│   └── init.sql            ← runs automatically on first DB start
├── docker-compose.yml      (Guide 07)
├── .env.example            (Guide 07)
└── .gitignore
```

---

## 📝 Step 2 — Create the Backend

### 2.1 Initialize the Node project

```bash
cd backend
npm init -y
npm install express pg dotenv
npm install --save-dev nodemon
```

**What each package does:**

```text
express  →  web framework for the API
pg       →  PostgreSQL client for Node.js
dotenv   →  loads environment variables from .env
nodemon  →  auto-restarts on file changes (dev only — Guide 10)
```

### 2.2 Update `backend/package.json`

Replace the `scripts` section and add `"type": "module"`:

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

### 2.3 Create `backend/src/index.js`

```js
import express from 'express';
import cors from 'cors';
import { pool, initDb } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---------- health endpoint (used by Docker health checks in Guide 08) ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ---------- real endpoints -------------------------------------------------
app.get('/api/messages', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, message, created_at FROM messages ORDER BY created_at DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/messages failed:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/messages', async (req, res) => {
  const { name, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: 'name and message are required' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO messages (name, message) VALUES ($1, $2) RETURNING *',
      [name, message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/messages failed:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ---------- startup: wait for DB, then listen ------------------------------
async function start() {
  try {
    await initDb();          // creates the table if it doesn't exist
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Backend listening on 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup failed (is the database up?):', err.message);
    process.exit(1);         // exit → container restarts (see Guide 07)
  }
}

start();
```

> 💡 **Two details that matter in containers:**
> 1. Listen on `0.0.0.0`, **not** `localhost` — inside a container, `localhost` means "this container only", and nothing could reach your API.
> 2. If startup fails, `process.exit(1)` makes the container unhealthy → Compose restarts it and it recovers once the DB is ready (Guide 08).

### 2.4 Create `backend/src/db.js`

```js
import pg from 'pg';

const config = {
  host: process.env.DB_HOST || 'localhost',     // in Docker: 'db' (the service name)
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'appdb',
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

> 💡 Every config value comes from **environment variables** with sensible local fallbacks. This one habit is what makes the same code work on your laptop AND inside containers AND in production.

### 2.5 Create `backend/.gitignore`

```text
node_modules/
.env
```

### 2.6 Test it locally (optional but useful)

```bash
cd backend
node src/index.js
```

It will print `❌ Startup failed (is the database up?)` — **that's correct!** There's no database yet. The code is ready for the DB container in the coming guides. `Ctrl+C` to stop.

---

## 📝 Step 3 — Create the Frontend

### 3.1 Scaffold a Vite React app

```bash
cd ..   # back to docker-fullstack-app root
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

### 3.2 Create the app UI

Replace the contents of `frontend/src/App.jsx`:

```jsx
import { useState, useEffect } from 'react';
import './App.css';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadMessages() {
    try {
      const res = await fetch('/api/messages');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setMessages(await res.json());
      setError('');
    } catch (err) {
      setError('Could not reach the API. Is the backend running?');
    }
  }

  useEffect(() => { loadMessages(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message }),
      });
      if (!res.ok) throw new Error('Request failed');
      setName('');
      setMessage('');
      loadMessages();
    } catch {
      setError('Could not send your message.');
    }
  }

  return (
    <div className="container">
      <h1>🐳 Full-Stack in Docker</h1>
      <p>Frontend → Backend → PostgreSQL — all in containers.</p>

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          placeholder="Your message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>

      {error && <p className="error">{error}</p>}

      <h2>Messages</h2>
      {messages.length === 0 && <p>No messages yet — send the first one!</p>}
      <ul>
        {messages.map((m) => (
          <li key={m.id}>
            <strong>{m.name}:</strong> {m.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 3.3 Simplify the styling

Replace the contents of `frontend/src/App.css`:

```css
.container {
  max-width: 640px;
  margin: 3rem auto;
  font-family: system-ui, sans-serif;
  padding: 0 1rem;
}

form {
  display: flex;
  gap: 0.5rem;
  margin: 1.5rem 0;
}

input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 6px;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: #2563eb;
  color: white;
  cursor: pointer;
}

.error {
  color: #dc2626;
}

li {
  margin: 0.5rem 0;
}
```

> 💡 Clean out the default Vite boilerplate (`App.css` contents, logo imports) as needed — the code above is self-contained. If `frontend/src/index.css` has default styles, that's fine to keep or empty out.

### 3.4 The critical detail: relative `/api` URLs

Notice the frontend calls `fetch('/api/messages')` — **no host, no port.**

```text
Dev:        Vite dev server will proxy /api → backend      (Guide 10)
Production: Nginx will proxy /api → backend                (Guide 04)
```

Your frontend code never changes between environments. **This single decision is what makes the containerization clean.** A common beginner mistake is hardcoding `http://localhost:3000` in the frontend — don't.

### 3.5 Test the UI locally

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 — you'll see the page with an error message about the API. That's expected; the backend/DB don't fully exist yet.

---

## 📝 Step 4 — Create the Database Bootstrap

### 4.1 Create `database/init.sql`

```sql
-- This file runs automatically the FIRST time the PostgreSQL container
-- starts with an empty volume (official postgres image behavior).
-- All app tables are also created defensively by the backend on startup.

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.2 Create the root `.gitignore`

In `docker-fullstack-app/.gitignore`:

```text
node_modules/
dist/
.env
*.log
```

> ⚠️ **Never commit `.env`** — it will hold your database password. The `.env.example` file (Guide 07) is the committed template.

---

## ✅ Checkpoint

```text
[ ] backend/  — Express API with /api/health, /api/messages (GET/POST)
[ ] frontend/ — React app calling relative /api endpoints
[ ] database/init.sql — table schema as code
[ ] You can explain WHY the backend must listen on 0.0.0.0
[ ] You can explain WHY the frontend uses relative /api URLs
```

---

## 💡 What's Next

You now have a working app that can't run yet — it needs three things:

```text
1. Docker images for frontend and backend   →  Guides 03–04
2. A Docker network to talk over            →  Guide 05
3. A volume so the database persists        →  Guide 06
4. Compose to wire it all together          →  Guide 07
```

---

**Next:** [Guide 03 — Backend Dockerfile](03-backend-dockerfile.md) →
