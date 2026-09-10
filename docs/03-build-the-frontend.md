# Milestone 3 — 🎨 Build the Frontend

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Create the React app that will become the frontend container — with one critical design decision: **relative `/api` URLs**.

## ✅ Prerequisites

```text
[ ] ✅ Milestone 2 (backend code exists)
```

---

## 📝 Step 1 — Scaffold a Vite React App

```powershell
cd D:\docker-fullstack-app
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

---

## 📝 Step 2 — Create the App UI

Replace the contents of `frontend/src/App.jsx` with a message board:

```jsx
import { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadMessages() {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      setMessages(await res.json());
      setError("");
    } catch (err) {
      setError("Could not reach the API. Is the backend running?");
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
      if (!res.ok) throw new Error("Request failed");
      setName("");
      setMessage("");
      loadMessages();
    } catch {
      setError("Could not send your message.");
    }
  }

  return (
    <div className="container">
      <h1>Dockerized Full-Stack App</h1>
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

Replace `frontend/src/App.css`:

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

---

## 📝 Step 3 — The Critical Detail: Relative `/api` URLs

Notice the frontend calls `fetch("/api/messages")` — **no host, no port**.

```text
Dev:        Vite dev server proxies /api → backend      (Milestone 8)
Production: Nginx proxies /api → backend                (Milestone 4)
```

Your frontend code **never changes between environments**. A common beginner mistake is hardcoding `http://localhost:3000` — never do that.

> 🇳🇵 **Saral Byakhya:** Frontend le sadhai `/api` (sapeksha thegana) ma bolaunchha — Nginx wa Vite le tyo anurodha sahi backend ma puryaunchha, tyasaile frontend code lai app kaha chalta cha (local wa cloud) bhanne thaha hunai pardaina.

---

## 📝 Step 4 — Configure the Vite Proxy

Replace `frontend/vite.config.js`:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
```

```text
Local dev (no Docker): proxy → http://localhost:3000     (your laptop backend)
Inside Compose:        VITE_API_PROXY_TARGET → http://backend:3000
```

---

## 📝 Step 5 — Add `.dockerignore`

`frontend/.dockerignore`:

```text
node_modules
dist
.env
.env.*
Dockerfile
.dockerignore
.git
*.md
```

---

## 📝 Step 6 — Test Locally

```powershell
npm run dev
```

Open **http://localhost:5173** — the page renders with an error banner about the API. That's expected; there's no backend yet.

---

## ✅ Checkpoint

```text
[ ] frontend/ is a working Vite React app (npm run dev renders)
[ ] App.jsx calls fetch("/api/messages") with NO hardcoded host
[ ] vite.config.js proxies /api with an env-var target
[ ] You can explain WHY relative URLs are the right choice
[ ] frontend/.dockerignore exists
```

---

## 💡 Common Beginner Mistakes

| Mistake | Fix |
|---------|-----|
| Hardcoding `http://localhost:3000` in the frontend | Use relative `/api` URLs |
| Keeping Vite boilerplate mess | Replace App.jsx/App.css with clean self-contained code |
| Forgetting the proxy | Without it, `/api` calls 404 on the Vite server |
| Ignoring `changeOrigin: true` | Some servers reject proxied requests without it |

---

**Next:** [Milestone 4 — Containerize with Dockerfiles](04-containerize-with-dockerfiles.md) →