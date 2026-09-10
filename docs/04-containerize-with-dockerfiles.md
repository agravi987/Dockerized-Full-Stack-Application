# Milestone 4 — 📦 Containerize with Dockerfiles

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Turn both apps into production-grade images using **multi-stage builds** and **non-root users**.

## ✅ Prerequisites

```text
[ ] ✅ Milestone 2 (backend code + package-lock.json)
[ ] ✅ Milestone 3 (frontend code + package-lock.json)
[ ] 🐳 Docker Desktop running
```

---

## 🧠 The Two Core Patterns

### Multi-stage builds

```text
Stage 1 (build):  has ALL tools → installs deps, compiles assets
Stage 2 (runtime): has ONLY the result → small, safe, fast to pull
```

Backend: install deps in one stage, copy only `node_modules` + source into the slim runtime stage. Frontend: compile React in a Node stage, serve the static output with a tiny Nginx stage.

> 🇳🇵 **सरल व्याख्या:** Multi-stage build भनेको एउटा ठूलो "रसोइया" image ले app बनाउँछ, तर अन्तिम image मा पकाएको तयारी खाना मात्र राखिन्छ — भारी औजारहरू customer लाई पठाइँदैन।

### ⚠️ The "last stage wins" gotcha

In a multi-stage Dockerfile, the **default** build image is the **last** `FROM` stage written in the file. If your `dev` stage is written last (we keep it as an appendix for Milestone 8), a plain `docker build .` would silently build the **dev** image.

- Always **name every stage** (`AS runtime`, `AS serve`, `AS dev`)
- Always **pin the target** with `--target <name>` when building, and `target:` in Compose (Milestones 6 & 8)

### Non-root users

By default processes in containers run as `root`. If your app is ever exploited, the attacker is root *inside* the container. A one-line fix:

```dockerfile
USER node        # official Node images ship this built-in user
USER nginx       # Nginx images too
```

> 🇳🇵 **सरल व्याख्या:** Container लाई सधैं "root" (सबैथोक गर्न सक्ने प्रयोगकर्ता) को रूपमा चलाउनु हुँदैन — हामी node/nginx जस्तै सीमित प्रयोगकर्ताले चलाउँछौं, ताकि कुनै आक्रमण भए पनि क्षति थोरै होस्।

### 🐛 The `localhost` vs `127.0.0.1` healthcheck trap

Inside Alpine images, BusyBox `wget` may resolve `localhost` to the IPv6 address `::1` — but our servers listen on IPv4 (`0.0.0.0`). Result: *"connection refused"* even though the app is fine. **Always use `127.0.0.1` in healthchecks.**

> 🇳🇵 **सरल व्याख्या:** `localhost` ले कहिलेकाहीँ IPv6 ठेगाना (::1) खोज्छ तर हाम्रो server IPv4 मा मात्र सुन्छ — त्यसैले स्वास्थ्य जाँचमा सधैं `127.0.0.1` प्रयोग गरिन्छ।

---

## 📝 Step 1 — Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
# ============================================================
# Stage 1 — deps: full install (keeps the dev stage fast + cached)
# ============================================================
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ============================================================
# Stage 2 — prod-deps: production-only dependencies
# ============================================================
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ============================================================
# Stage 3 — runtime: slim image, only what's needed to run
# This is the PRODUCTION image → build with --target runtime
# ============================================================
FROM node:22-alpine AS runtime
USER node
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/index.js"]

# ============================================================
# Stage 4 — dev: keeps nodemon + devDependencies (Milestone 8)
# ============================================================
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

### Why each line

| Instruction | Why |
|-------------|-----|
| `COPY package.json package-lock.json ./` **before** source | Layer caching — deps reinstall only when the lockfile changes → rebuilds drop from minutes to seconds |
| `npm ci` (not `npm install`) | Clean, reproducible install from the lockfile |
| `COPY --from=prod-deps` | Only production deps enter the runtime image |
| `--chown=node:node` | Non-root app can read files other stages created as root |
| `RUN chown -R node:node /app` (dev stage) | Vite/nodemon need to *write* into `/app` — without this you get `EACCES` |
| `EXPOSE 3000` | Documentation only — Compose actually publishes ports (Milestone 6) |
| `HEALTHCHECK` | Docker probes `/api/health` so it knows the app *works* (Milestone 7) |
| `CMD` exec form `["node", ...]` | Correct signal handling on shutdown |

---

## 📝 Step 2 — Build the Backend Image

```powershell
cd D:\docker-fullstack-app\backend
docker build --target runtime -t fullstack-backend:1.0 .
```

```text
--target runtime → build the PRODUCTION stage, not the dev stage (which is
                   written last and therefore the DEFAULT)
```

Verify:

```powershell
docker images fullstack-backend
# fullstack-backend   1.0   ~180MB

docker run --rm fullstack-backend:1.0 whoami
# node  ← confirms non-root
```

---

## 📝 Step 3 — Nginx Config for the Frontend

Create `frontend/nginx.conf`:

```nginx
server {
    listen       8080;
    server_name  _;

    root   /usr/share/nginx/html;
    index  index.html;

    # SPA routing: unknown paths get index.html (no 404 on refresh)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to the backend CONTAINER by service name
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

**Key details:**

| Block | Why |
|-------|-----|
| `listen 8080` | Ports < 1024 need root — we run as a non-root `nginx` user |
| `try_files ... /index.html` | Lets React Router-style routes work on refresh |
| `proxy_pass http://backend:3000` | `backend` is the Compose service name — Docker DNS resolves it (Milestone 5) |

> 🇳🇵 **सरल व्याख्या:** Nginx ले browser को `/api` अनुरोध उठाएर backend container लाई पुर्‍याउँछ — user लाई backend को ठेगाना कहिल्यै थाहा दिँदैन।

---

## 📝 Step 4 — Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
# ============================================================
# Stage 1 — build: compile React to static files
# ============================================================
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ============================================================
# Stage 2 — serve: tiny Nginx image with just the artifacts
# This is the PRODUCTION image → build with --target serve
# ============================================================
FROM nginx:1.27-alpine AS serve

# Make runtime dirs writable by the unprivileged nginx user
# (pid file, caches) so non-root nginx can actually start.
RUN chown -R nginx:nginx /var/cache/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

USER nginx

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]

# ============================================================
# Stage 3 — dev: Vite dev server with hot reload (Milestone 8)
# ============================================================
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN chown -R node:node /app
USER node
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

> 💡 A React build is just HTML+JS+CSS. Nginx serves those in ~80 MB total — versus ~1 GB if you shipped a Node image with dev tools.

> 💡 We run nginx as the unprivileged `nginx` user. The `RUN chown ...` lines give it write access to its pid file and caches — without them, non-root nginx crashes at startup with permission errors.

---

## 📝 Step 5 — Build the Frontend Image

```powershell
cd D:\docker-fullstack-app\frontend
docker build --target serve -t fullstack-frontend:1.0 .
```

Check the payoff:

```powershell
docker images fullstack-frontend
# fullstack-frontend   1.0   ~80MB
```

Compare with the builder stage alone: `node:22-alpine` is ~130 MB *before* your dependencies. The two-stage build deleted all of that from the final image.

---

## 📝 Step 6 — See What's Really Inside

```powershell
dive fullstack-backend:1.0     # if you have dive installed
docker history fullstack-backend:1.0   # layer-by-layer (no install needed)
```

Look for: tiny app layers at the bottom, no `.git`/tests/`node_modules`-of-dev-deps, no `.env`.

---

## ✅ Checkpoint

```text
[ ] backend/Dockerfile: deps, prod-deps, runtime, and dev stages (all named)
[ ] frontend/Dockerfile: build, serve, and dev stages (all named)
[ ] frontend/nginx.conf proxies /api/ to http://backend:3000
[ ] docker build --target runtime / --target serve produce the images
[ ] Backend ~180MB and frontend ~80MB
[ ] Backend container runs as "node"; frontend as "nginx"
[ ] Container runs pass their HEALTHCHECK (127.0.0.1, not localhost)
[ ] Rebuild after a trivial code change is seconds (cached deps)
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| `COPY . .` before `npm ci` | Every rebuild reinstalls everything | Manifests first, source last |
| Missing `--chown` | Permission denied at runtime | Add `--chown=node:node` / `--chown=nginx:nginx` |
| `dev` stage written last, no `--target` | You get Vite/nodemon in "production" | Always `--target runtime` / `--target serve` |
| Healthcheck uses `localhost` | "unhealthy" + connection refused | Use `127.0.0.1` (IPv6 trap in Alpine wget) |
| `npm install` instead of `npm ci` | Non-reproducible builds | Use `npm ci` |
| Proxying to `localhost:3000` | API fails inside containers | `http://backend:3000` (service name) |
| no `chown` of runtime dirs for nginx | Non-root nginx crashes at start | The `RUN chown ...` lines in the serve stage |
| Nginx without `daemon off;` | Container exits immediately | `CMD ["nginx", "-g", "daemon off;"]` |

---

**Next:** [Milestone 5 — Networks & Volumes](05-networks-and-volumes.md) →