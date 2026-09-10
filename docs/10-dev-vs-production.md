# 10 — 🧪 Dev vs Production Configuration

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Get both worlds from one codebase:

```text
Development:   hot reload, bind-mounted code, verbose logs
Production:    optimized images, baked-in code, lean runtime
```

— using **Compose override files**, the standard pattern for per-environment configuration.

## ✅ Prerequisites

```text
[ ] 🎼 Working production Compose stack (Guide 07)
[ ] 📋 Comfortable reading logs (Guide 09)
```

---

## 🧠 The Pattern: Base + Override

Compose automatically merges files. Same keys later in the list **override** earlier ones:

```
docker-compose.yml          ← the common, production-shaped base
docker-compose.dev.yml      ← dev-only changes on top
```

```bash
# Production (what you have now)
docker compose up --build

# Development (base + dev overrides)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

You get one source of truth for the shared parts, and small, readable diffs per environment.

```
        docker-compose.yml (base)
        ├── services, network, volumes, healthchecks
        ▼
        docker-compose.dev.yml (overlay)
        ├── bind mounts for live code
        ├── nodemon instead of node
        ├── Vite dev server instead of static build
        └── verbose logging
```

---

## 📝 Step 1 — Create `docker-compose.dev.yml`

At the project root, next to `docker-compose.yml`:

```yaml
# Development overrides — merged ON TOP of docker-compose.yml
services:
  backend:
    # Rebuild the dev image using the dev-stage Dockerfile target
    build:
      context: ./backend
      target: dev
    environment:
      NODE_ENV: development
    volumes:
      # Bind mount: live host code replaces the baked-in copy
      - ./backend/src:/app/src:ro
    command: npm run dev          # nodemon → auto-restart on changes
    ports:
      - "3000:3000"

  frontend:
    # Run Vite's dev server instead of serving a static build
    build:
      context: ./frontend
      target: dev
    volumes:
      - ./frontend/src:/app/src:ro
    ports:
      - "5173:5173"
    environment:
      # Inside containers, the proxy target is the backend SERVICE name
      VITE_API_PROXY_TARGET: http://backend:3000
    command: npm run dev -- --host 0.0.0.0

  db:
    # Dev convenience: reach the DB from host tools (psql, DBeaver…)
    ports:
      - "5432:5432"
```

### What changed and why

| Override | Why |
|----------|-----|
| `target: dev` | Builds a different stage of the same Dockerfiles (you'll add these stages in Step 2) — dev images keep nodemon/vite |
| `volumes: ./backend/src:/app/src` | **Bind mount** — edits on your laptop instantly appear in the container. No rebuild, no image copy |
| `command: npm run dev` | nodemon watches for file changes and restarts Node |
| Vite dev server for the frontend | Hot Module Replacement — browser updates as you type |
| `VITE_API_PROXY_TARGET` | The Vite dev server needs to know where to proxy `/api` — inside Compose, that's `http://backend:3000` |
| db `ports: 5432` | Dev-only convenience. Production DB stays unpublished (Guide 07) |

> 💡 Notice what did **not** change: the database, the volume, the healthchecks, the network. Those are identical in both worlds — that's the point of the base file.

---

## 📝 Step 2 — Add `dev` Stages to Both Dockerfiles

Multi-stage builds aren't just for slimming production — they can carry dev-only stages too.

### `backend/Dockerfile` — add a dev stage

Append to the existing file:

```dockerfile
# ============================================================
# Stage 3 — dev: full tooling + nodemon for hot reload
# ============================================================
FROM node:20-alpine AS dev
WORKDIR /app

# devDependencies included (nodemon lives here)
COPY package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
USER node

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### `frontend/Dockerfile` — add a dev stage

Append to the existing file:

```dockerfile
# ============================================================
# Stage 3 — dev: Vite dev server with hot reload
# ============================================================
FROM node:20-alpine AS dev
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --chown=node:node . .
USER node

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

> 💡 `--host 0.0.0.0` matters: Vite binds to localhost by default, which inside a container means "unreachable". Same lesson as the backend in Guide 02.

### Wire the Vite proxy

In `frontend/vite.config.js`, read the proxy target from the environment:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

```text
Dev (in Compose):  VITE_API_PROXY_TARGET=http://backend:3000  → proxied to the API container
Local (no Docker): falls back to http://localhost:3000        → proxied to a local backend
Prod:              no Vite at all — Nginx proxies /api (Guide 04)
```

---

## 📝 Step 3 — Run Development Mode

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Expected:

```text
backend-1   | ✅ Backend listening on 0.0.0.0:3000   (via nodemon)
frontend-1  |   VITE v5.x  ready in 400 ms
frontend-1  |   ➜  Local: http://localhost:5173/
```

Open **http://localhost:5173** — the app works, against the containerized database, with hot reload.

### Prove hot reload works

1. Keep the stack running
2. Open `backend/src/index.js`, change the health endpoint response to `{ status: 'ok', version: 2 }`
3. Watch the logs: nodemon restarts the backend automatically
4. Edit any React component — the browser updates instantly
5. `curl http://localhost:5173/api/health` — the Vite proxy forwards to the containerized backend

**No rebuild. No `docker compose up` again. That's development mode.** 🎉

---

## 📝 Step 4 — The Two Modes Side by Side

```bash
# PRODUCTION — build once, serve optimized artifacts
docker compose up --build
# 🌐 app on :8080 (Nginx static + /api proxy)

# DEVELOPMENT — live code, hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
# 🌐 app on :5173 (Vite dev server + proxy)
```

| Aspect | 🧪 Development | 🚀 Production |
|--------|---------------|---------------|
| Frontend | Vite dev server (`:5173`) | Nginx + built static files (`:8080`) |
| Backend runner | nodemon, restarts on change | plain `node`, restarts only via Docker |
| Code location | bind-mounted from your laptop | baked into the image |
| Image contents | full tooling | slim runtime only |
| DB port | published (host tools) | not published |
| Startup command | `docker compose -f ... -f ... up` | `docker compose up --build` |

### Optional: make dev mode the default

If you get tired of typing both `-f` flags, create a `compose.yaml`-adjacent alias by adding to `docker-compose.dev.yml`... actually, Compose has you covered natively — set a shell alias:

```bash
alias devup='docker compose -f docker-compose.yml -f docker-compose.dev.yml up'
```

> 💡 Teams often also add a `Makefile` with `make dev` / `make prod` targets. Same idea, nicer ergonomics.

---

## 📝 Step 5 — Switching Between Modes Safely

```bash
# Going dev → prod: recreate containers so bind mounts disappear
docker compose down
docker compose up --build -d

# Going prod → dev
docker compose down
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

> ⚠️ The database volume is shared by both modes — your data survives every switch. `down` (no `-v`) never touches it.

---

## ✅ Checkpoint

```text
[ ] docker-compose.dev.yml exists with bind mounts + dev commands
[ ] Both Dockerfiles have a `dev` stage
[ ] Dev mode: editing backend code auto-restarts the API
[ ] Dev mode: editing React code hot-reloads in the browser
[ ] Prod mode: still works exactly as Guide 07 left it
[ ] You didn't duplicate any service config — base + override only
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Duplicating the whole stack in a second compose file | Two configs drift apart | Base + small override file |
| Bind mount without a dev runner | Files sync but nothing restarts | nodemon / Vite dev server |
| Vite without `--host 0.0.0.0` in Docker | Browser can't reach the dev server | Add the flag |
| Hardcoding `localhost:3000` in the Vite proxy | Works locally, breaks in Compose | Read `VITE_API_PROXY_TARGET` from env |
| Expecting prod speed in dev mode | Sluggish on Windows/macOS | Normal — bind mounts + watchers cost I/O; prod has neither |
| Committing the override into prod deploys | Dev code runs in prod | Only `docker-compose.yml` is the deploy artifact |

---

**Next:** [Guide 11 — Optimization & Security](11-optimization-and-security.md) →
