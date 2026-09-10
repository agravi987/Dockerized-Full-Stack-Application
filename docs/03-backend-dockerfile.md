# 03 — ⚡ Backend Dockerfile

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Turn the Express backend into a production-grade Docker image using the two practices recruiters look for: **multi-stage builds** and a **non-root user**.

## ✅ Prerequisites

```text
[ ] 🐳 Docker installed (Guide 01)
[ ] ⚡ Working backend code (Guide 02)
```

---

## 🧠 Concepts: Multi-Stage Builds & Non-Root Users

### Why multi-stage?

A naive Dockerfile is one giant image containing **everything**: dev tools, npm cache, source code, and your runtime. Multi-stage builds split the job:

```text
Stage 1 (build):   has ALL the tools → installs full dependencies
Stage 2 (runtime): has ONLY the result → clean, small, safe
```

```
┌─────────────── Stage 1: deps ───────────────┐
│  node:20 (big, has build tools)             │
│  npm ci  →  node_modules/                   │
└──────────────────────┬──────────────────────┘
                       │  COPY --from=deps /app/node_modules
                       ▼
┌─────────────── Stage 2: runtime ────────────┐
│  node:20-alpine (small, no build tools)     │
│  + your source code + production node_modules│
│  → THIS is what ships                       │
└─────────────────────────────────────────────┘
```

### Why non-root?

By default, processes in containers run as **root** — the most powerful account. If your app is ever exploited, the attacker is root *inside* the container. Running as a dedicated user is a one-line-class fix:

```dockerfile
USER appuser     # everything after this runs unprivileged
```

> 💡 In a Node.js image you don't even need `RUN useradd` — official images ship a built-in user called `node`. We'll use it.

---

## 📝 Step 1 — Create `.dockerignore` First

Create `backend/.dockerignore`:

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

> 💡 **Why `.dockerignore` matters:**
> 1. `COPY . .` would otherwise copy your entire `node_modules` (hundreds of MB) into the build context
> 2. `.env` must **never** end up baked into an image — images can end up in registries
> 3. Smaller context = faster builds

> ⚠️ The `.dockerignore` lives **next to the Dockerfile** and applies per build. The frontend will get its own later.

---

## 📝 Step 2 — Write the Dockerfile

Create `backend/Dockerfile`:

```dockerfile
# ============================================================
# Stage 1 — deps: install all dependencies with full tooling
# ============================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copy lockfile + manifest first → this layer is cached until
# package.json / package-lock.json actually change
COPY package.json package-lock.json ./
RUN npm ci

# ============================================================
# Stage 2 — runtime: small image, only what's needed to run
# ============================================================
FROM node:20-alpine

# Security: run as the unprivileged 'node' user that ships
# with the official image
USER node

WORKDIR /app

# Bring over ONLY the installed dependencies from stage 1
COPY --from=deps --chown=node:node /app/node_modules ./node_modules

# Copy application source
COPY --chown=node:node . .

# Document which port the app listens on
EXPOSE 3000

# Health check (full deep-dive in Guide 08 — this wires it in now)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/index.js"]
```

### Instruction-by-instruction walkthrough

| Instruction | What it does | Why it's written this way |
|-------------|--------------|---------------------------|
| `FROM ... AS deps` | Start stage 1, name it | Lets stage 2 reference it |
| `WORKDIR /app` | Set the working directory | All later paths are relative to it |
| `COPY package.json package-lock.json ./` **first** | Copy only manifests | If code changes but deps didn't, Docker reuses the cached `npm ci` layer → **builds go from minutes to seconds** |
| `RUN npm ci` | Install exactly what the lockfile says | `npm ci` = clean, reproducible install; `npm install` can drift |
| `FROM node:20-alpine` (again) | Fresh small stage | Build tools from stage 1 don't leak in |
| `USER node` | Switch to unprivileged user | Root containers = unnecessary risk |
| `COPY --from=deps` | Pull node_modules from stage 1 | The whole point of multi-stage |
| `--chown=node:node` | Own the copied files | Otherwise root owns them and a non-root app may fail to read/write |
| `EXPOSE 3000` | Documentation only | Does NOT publish a port — Compose does that (Guide 07) |
| `HEALTHCHECK` | Docker probes `/api/health` | Knows if the app is *actually* working, not just "process alive" |
| `CMD` | What runs at container start | Exec form (`["node", ...]`) so the process gets Unix signals correctly |

> 💡 **Why copy manifests before source?** Docker builds layer-by-layer and caches each. Big `COPY`s early = cache invalidation storms. Manifests first, source last is the golden pattern.

---

## 📝 Step 3 — Build the Image

```bash
cd backend
docker build -t fullstack-backend:1.0 .
```

```text
-t fullstack-backend:1.0   →  name:tag for your image
.                          →  build context = current directory
```

> ⏳ First build pulls the base image and runs `npm ci` — a few minutes. Later builds will be nearly instant thanks to layer caching.

Expected tail of output:

```text
=> [deps 3/3] RUN npm ci
=> [stage-1 4/6] COPY --from=deps ...
=> exporting to image
=> => naming to docker.io/library/fullstack-backend:1.0
```

Verify it exists:

```bash
docker images fullstack-backend
```

---

## 📝 Step 4 — Run It Standalone (See It Fail Correctly)

```bash
docker run --rm fullstack-backend:1.0
```

Expected logs:

```text
❌ Startup failed (is the database up?): ... connect ECONNREFUSED
```

**This is correct behavior** — there's no database yet. Notice the app tried to exit so the container would be restarted/rescheduled rather than limping along broken.

> 💡 `--rm` deletes the container when it stops — handy for one-off runs like this.

Also confirm it's running as non-root:

```bash
docker run --rm fullstack-backend:1.0 whoami
```

Expected:

```text
node
```

---

## 📝 Step 5 — See the Payoff: Layer Caching

Change something trivial in `backend/src/index.js` (add a comment), rebuild:

```bash
docker build -t fullstack-backend:1.0 .
```

Expected: `npm ci` is shown as `CACHED`, and only the `COPY . .` layer reruns. **That's the manifest-first pattern paying off** — rebuilds take seconds, not minutes.

---

## ✅ Checkpoint

```text
[ ] backend/.dockerignore exists (and excludes .env + node_modules)
[ ] docker build succeeds
[ ] Container exits cleanly with "no database" when run alone
[ ] whoami inside the container prints: node
[ ] Rebuild after a code change is fast (cached npm ci layer)
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| `COPY . .` before `npm ci` | Every rebuild reinstalls everything | Copy manifests first |
| Forgetting `--chown=node:node` | Permission denied at runtime | Add the flag |
| Using `npm install` instead of `npm ci` | Builds not reproducible | Use `npm ci` |
| Expecting `EXPOSE` to publish ports | "Can't reach my app" | `EXPOSE` documents; `-p`/Compose publishes |
| `CMD node src/index.js` (shell form) | Container ignores Ctrl+C, ugly shutdown | Use exec form `["node", ...]` |

---

**Next:** [Guide 04 — Frontend Dockerfile](04-frontend-dockerfile.md) →
