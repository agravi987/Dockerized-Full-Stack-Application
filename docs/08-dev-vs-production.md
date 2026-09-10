# Milestone 8 — 🧪 Dev vs Production Config

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Get both worlds from one codebase using **Compose override files**:

```text
Development:  hot reload, bind-mounted code, verbose logs
Production:   optimized images, baked-in code, lean runtime
```

## ✅ Prerequisites

```text
[ ] ✅ Milestone 7 (working prod stack + debugging skills)
```

---

## 🧠 The Pattern: Base + Override

Compose merges files; later files override earlier ones:

```
docker-compose.yml          ← common, production-shaped base
docker-compose.dev.yml      ← dev-only changes on top
```

```bash
# Production (what you have)
docker compose up --build

# Development (base + dev overrides)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

One source of truth for shared parts; small readable diffs per environment.

> 🇳🇵 **सरल व्याख्या:** एउटै codebase लाई दुई मोडमा चलाइन्छ — dev मा "bind mount" (तपाईंको laptop को code सिधै container मा जोडिन्छ, परिवर्तन तुरुन्तै देखिन्छ) र prod मा "baked-in" (code image भित्र पसाइन्छ, छिटो र चुस्त)।

---

## 📝 Step 1 — Create `docker-compose.dev.yml`

At the project root:

```yaml
# Development overrides — merged ON TOP of docker-compose.yml
services:
  backend:
    build:
      context: ./backend
      target: dev
    environment:
      NODE_ENV: development
    volumes:
      - ./backend/src:/app/src:ro
    command: npm run dev
    ports:
      - "3000:3000"

  frontend:
    build:
      context: ./frontend
      target: dev
    volumes:
      - ./frontend/src:/app/src:ro
    ports:
      - "5173:5173"
    environment:
      VITE_API_PROXY_TARGET: http://backend:3000
    command: npm run dev -- --host 0.0.0.0

  db:
    ports:
      - "5432:5432"
```

| Override | Why |
|----------|-----|
| `target: dev` | Uses the `dev` stages from Milestone 4 — images keep nodemon/Vite |
| `volumes: ./backend/src:/app/src:ro` | **Bind mount** — laptop edits appear instantly, no rebuild |
| `command: npm run dev` | nodemon watches files and restarts Node |
| Vite dev server for frontend | Hot Module Replacement — browser updates as you type |
| `VITE_API_PROXY_TARGET` | Vite proxied `/api` → the backend service name |
| db `ports: 5432` | Dev-only convenience for host tools (psql, DBeaver) |

Notice what did **not** change: the database, volume, healthchecks, and network. That's the point of the base file.

---

## 📝 Step 2 — Confirm the Vite Proxy Reads the Env

Your `frontend/vite.config.js` (from Milestone 3) already does:

```js
server: {
  proxy: {
    "/api": {
      target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3000",
      changeOrigin: true,
    },
  },
},
```

```text
Dev (in Compose):  → http://backend:3000  (the API container)
Local (no Docker): → http://localhost:3000 (a local backend)
Prod:               no Vite at all — Nginx proxies /api (Milestone 4)
```

---

## 📝 Step 3 — Run Development Mode

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Expected:

```text
backend-1  | ✅ Backend listening on 0.0.0.0:3000  (via nodemon)
frontend-1 | VITE vX.Y.Z  ready in 400 ms
frontend-1 | ➜ Local: http://localhost:5173/
```

Open **http://localhost:5173** — the app works against the containerized database, with hot reload.

### Prove hot reload

1. Keep the stack running
2. Edit `backend/src/index.js` → nodemon shows a restart
3. Edit any React component → browser updates instantly
4. `curl http://localhost:5173/api/health` → the Vite proxy forwards to the containerized backend

**No rebuild. No `docker compose up` again.** That's development mode. 🎉

---

## 📝 Step 4 — The Two Modes Side by Side

```powershell
# PRODUCTION — build once, serve optimized artifacts
docker compose up --build
# app on :8080 (Nginx static + /api proxy)

# DEVELOPMENT — live code, hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
# app on :5173 (Vite dev server + proxy)
```

| Aspect | 🧪 Development | 🚀 Production |
|--------|---------------|---------------|
| Frontend | Vite dev server (`:5173`) | Nginx + built static files (`:8080`) |
| Backend runner | nodemon, restarts on change | plain node, restarts via Docker |
| Code location | bind-mounted from your laptop | baked into the image |
| DB port | published (host tools) | not published |
| Image contents | full tooling | slim runtime only |

Optional nicety — shell alias:

```powershell
function devup { docker compose -f docker-compose.yml -f docker-compose.dev.yml up $args }
```

---

## 📝 Step 5 — Switching Modes Safely

```powershell
# dev → prod: recreate containers so bind mounts disappear
docker compose down
docker compose up --build -d

# prod → dev
docker compose down
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

> ⚠️ The database volume is shared by both modes — data survives every switch. `down` (no `-v`) never touches it.

---

## ✅ Checkpoint

```text
[ ] docker-compose.dev.yml exists with bind mounts + dev commands
[ ] Both Dockerfiles have working `dev` stages
[ ] Dev mode: editing backend code auto-restarts the API
[ ] Dev mode: editing React code hot-reloads in the browser
[ ] Prod mode still works exactly as Milestone 6 left it
[ ] Nothing was duplicated — base + override only
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Duplicating the whole stack in a second file | Configs drift apart | Base + small override |
| Bind mount without a dev runner | Files sync but nothing restarts | nodemon / Vite dev server |
| Vite without `--host 0.0.0.0` in Docker | Browser can't reach dev server | Add the flag |
| Hardcoding `localhost:3000` in the proxy | Breaks inside Compose | Read `VITE_API_PROXY_TARGET` from env |
| Using dev override in production deploys | Dev code runs in prod | Only the base file is the deploy artifact |

---

**Next:** [Milestone 9 — Deploy to EC2](09-deploy-to-ec2.md) →