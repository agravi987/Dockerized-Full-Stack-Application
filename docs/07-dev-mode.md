# Milestone 7 — Dev Mode

## Goal

Add **hot reload** to your stack so code changes show up instantly — without touching your production setup.

---

## First: Get This Straight (2 min)

You now have a working **Production mode** (Milestone 6). It runs real, optimized images. This is what gets deployed.

**Dev mode** is ONLY for when you're writing code on your laptop. It adds one small file of overrides. It never leaves your laptop.

| | Production mode (M6) | Dev mode (M7) |
|---|----------------------|---------------|
| Command | `docker compose up` | `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` |
| Frontend | Nginx serving built files on :8080 | Vite dev server with hot reload on :5173 |
| Backend | plain node | nodemon — restarts on every save |
| Code | baked inside the image | mounted from your laptop (edit → see it live) |
| Where it's used | local test + EC2 deploy | your laptop ONLY |

Same codebase. Two modes. Two commands. That's the entire dev vs prod story.

---

## Step 1 — Create `docker-compose.dev.yml`

This file **overrides parts of** the base file. It doesn't repeat everything — only the differences.

```yaml
# Development overrides — merged ON TOP of docker-compose.yml
services:
  backend:
    build:
      context: ./backend
      target: dev                # the dev stage (keeps nodemon)
    environment:
      NODE_ENV: development
    volumes:
      - ./backend/src:/app/src:ro    # your laptop code, live in the container
    command: npm run dev
    ports:
      - "3000:3000"

  frontend:
    build:
      context: ./frontend
      target: dev                # the dev stage (keeps Vite)
    volumes:
      - ./frontend/src:/app/src:ro
    ports:
      - "5173:5173"
    environment:
      VITE_API_PROXY_TARGET: http://backend:3000
    command: npm run dev -- --host 0.0.0.0

  db:
    ports:
      - "5432:5432"              # convenience: connect from host tools like DBeaver
```

### What changed vs the base file?

| Change | Why |
|--------|-----|
| `target: dev` | Use the dev stages with nodemon/Vite (written in Milestone 4) |
| `volumes: ./backend/src:/app/src:ro` | Your laptop's code is mounted INTO the container — save a file and the container sees it |
| `command: npm run dev` | nodemon restarts the backend on save |
| Vite on :5173 | Browser hot reload as you type |
| db `ports: 5432` | Dev-only convenience to inspect the DB from your laptop |

Everything else — database, volume, healthchecks, network — stays from the base file. That's the point: **base + small override**.

---

## Step 2 — Run Dev Mode

```powershell
cd docker-fullstack-app
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Expected:
```
backend-1  | Backend listening on 0.0.0.0:3000  (via nodemon)
frontend-1 | VITE vX ready in 400 ms
frontend-1 | ➜ Local: http://localhost:5173/
```

Open **http://localhost:5173** — the app works against the containerized database, with hot reload.

---

## Step 3 — Prove Hot Reload

1. Keep the stack running
2. Edit `backend/src/index.js` → watch nodemon restart the backend
3. Edit `frontend/src/App.jsx` → the browser updates instantly
4. `curl http://localhost:5173/api/health` → Vite proxies to the containerized backend

**No rebuild. No restart.** That's development mode.

---

## Step 4 — Switching Between Modes

```powershell
# dev → prod: recreate so bind mounts disappear
docker compose down
docker compose up --build -d

# prod → dev
docker compose down
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

> The database volume is SHARED by both modes — your data survives every switch. `down` (without `-v`) never touches data.

---

## Common Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Editing code, seeing nothing change | Prod mode has no hot reload | Use the dev command (Step 2) |
| Vite unreachable from browser | Missing `--host 0.0.0.0` | Add the flag |
| Hardcoded `localhost:3000` in proxy | Breaks inside Compose | Use `VITE_API_PROXY_TARGET` |
| Using the dev override on the server | Dev code runs in prod | Only the base file goes to EC2 |

---

## Checkpoint

```
[ ] docker-compose.dev.yml exists with bind mounts + dev commands
[ ] Dev mode: editing backend code auto-restarts the API
[ ] Dev mode: editing React code hot-reloads the browser
[ ] Prod mode (M6) still works exactly as before
[ ] You can explain the ONE difference between the two commands
```

---

**Next:** [Milestone 8 — Push to Docker Hub](08-push-to-docker-hub.md)