# 04 — 🎨 Frontend Dockerfile (Multi-Stage + Nginx)

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Build the React app into static files, then serve them with Nginx — using a **two-stage build**: Node compiles, Nginx serves. Also wire up the `/api` proxy here, because the frontend is the only container exposed to your browser.

## ✅ Prerequisites

```text
[ ] 🎨 Working frontend (Guide 02)
[ ] 🐳 Docker installed (Guide 01)
[ ] ⚡ Backend image built (Guide 03 — its name is referenced here)
```

---

## 🧠 The Pattern

A React app is just **HTML + JS + CSS** after it's built. Nobody needs Node.js to serve static files — Nginx does it with far less memory. So:

```
┌──────────── Stage 1: build (Node) ──────────┐
│  node:20-alpine                             │
│  npm ci → npm run build → dist/ (static)    │
└──────────────────────┬──────────────────────┘
                       │  COPY --from=build /app/dist
                       ▼
┌──────────── Stage 2: serve (Nginx) ─────────┐
│  nginx:alpine (tiny)                        │
│  + your dist/ files + custom nginx.conf     │
│  + /api proxy to the backend container      │
└─────────────────────────────────────────────┘
```

The final image has **no Node, no npm, no source code** — just a web server and compiled assets.

> 💡 This is the flagship use case for multi-stage builds, and the #1 thing interviewers want to hear you explain.

---

## 📝 Step 1 — Create `frontend/nginx.conf`

Create `frontend/nginx.conf`:

```nginx
server {
    listen       8080;
    server_name  _;

    # Serve the built React app
    root   /usr/share/nginx/html;
    index  index.html;

    # SPA routing: unknown paths get index.html,
    # so React Router-style routes work on refresh
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to the backend container.
    # 'backend' is the Docker Compose service name — it resolves
    # via Docker's internal network (deep-dive in Guide 05).
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Small production-grade touches
    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

### Why each block exists

| Block | Why |
|-------|-----|
| `listen 8080` | Unprivileged port — required for a non-root container (ports < 1024 need root) |
| `try_files ... /index.html` | Single-page apps handle routing client-side; without this, refreshing a subpage 404s |
| `location /api/` | The magic: browser → frontend:8080 → backend:3000. The frontend never needs to know where the backend lives |
| `proxy_set_header` | Passes the real client info through so backend logs are useful |

---

## 📝 Step 2 — Create `frontend/.dockerignore`

Create `frontend/.dockerignore`:

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

Same reasons as the backend: smaller build context, no secrets in images.

---

## 📝 Step 3 — Write the Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
# ============================================================
# Stage 1 — build: compile React to static files
# ============================================================
FROM node:20-alpine AS build
WORKDIR /app

# Manifests first → dependency layers stay cached
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ============================================================
# Stage 2 — serve: tiny Nginx image with just the artifacts
# ============================================================
FROM nginx:1.27-alpine

# Nginx official images ship an unprivileged user; use it.
# (Keeps us consistent with the non-root backend practice.)
USER nginx

# Replace default config with ours (proxy + SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy ONLY the built static files from stage 1 —
# no Node, no npm, no source code ships
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### Instruction highlights

| Instruction | Why |
|-------------|-----|
| `RUN npm ci` then `COPY . .` | Deps layer cached separately from source layer |
| `npm run build` | Vite outputs static files to `dist/` |
| `FROM nginx:1.27-alpine` | ~50 MB final image instead of a ~1 GB Node image |
| `COPY nginx.conf ...` | Our proxy + SPA config replaces the default |
| `COPY --from=build /app/dist ...` | The artifact handoff between stages |
| `USER nginx` | Non-root serve (port 8080 for this reason) |
| `CMD ["nginx", "-g", "daemon off;"]` | Nginx must run in the foreground in containers, or it exits immediately |

> 💡 Note we pin `nginx:1.27-alpine` rather than `latest` — pinned versions make builds reproducible.

---

## 📝 Step 4 — Build the Image

```bash
cd frontend
docker build -t fullstack-frontend:1.0 .
```

Expected final stages:

```text
=> [build 4/4] RUN npm run build
=> [stage-1 3/4] COPY nginx.conf ...
=> [stage-1 4/4] COPY --from=build /app/dist ...
=> exporting to image
```

Check the size — this is the fun part:

```bash
docker images fullstack-frontend
```

```text
REPOSITORY            TAG    SIZE
fullstack-frontend    1.0    ~80MB
```

Compare with the builder stage: `docker images node` → `node:20-alpine` alone is ~130 MB *before* your dependencies. The two-stage approach deleted all of that from the final image.

---

## 📝 Step 5 — See What's Actually Being Served

```bash
docker run --rm -p 8081:8080 fullstack-frontend:1.0
```

Open **http://localhost:8081** — you should see the React app. Messages will fail to load (the backend isn't running as a reachable service yet), which is expected.

> 💡 If you want to prove the proxy is configured, run the backend on a Compose-style network later — Guide 07 handles the full wiring.

Stop the test container with `Ctrl+C`.

---

## ✅ Checkpoint

```text
[ ] frontend/Dockerfile has TWO stages: build (node) + serve (nginx)
[ ] nginx.conf proxies /api/ to http://backend:3000
[ ] Final image is ~50–100 MB, not ~1 GB
[ ] Container serves the app on port 8080
[ ] Frontend container runs as the nginx (non-root) user
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Serving with Node instead of Nginx | Big, slow image | Two-stage: build in Node, serve with Nginx |
| Copying `dist/` from the wrong path | Empty page / 404 | Vite outputs to `/app/dist` — verify with `docker history` |
| Forgetting `try_files ... /index.html` | Refresh on a route → 404 | Add the SPA fallback |
| Proxying to `localhost:3000` | API calls fail in the container | Proxy to `backend:3000` (service name, Guide 05) |
| Listening on port 80 as non-root | Nginx crashes with permission error | Use `listen 8080` |

---

**Next:** [Guide 05 — Docker Networks](05-docker-networks.md) →
