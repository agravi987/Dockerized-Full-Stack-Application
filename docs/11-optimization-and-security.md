# 11 — 🚀 Optimization & Security

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Shrink images, speed up builds, and lock down containers — the finishing touches that separate a working project from a portfolio-grade one.

## ✅ Prerequisites

```text
[ ] 🎼 Full stack running (Guides 07 & 10)
[ ] 🧠 Multi-stage builds understood (Guides 03–04)
```

---

## 🧠 Part A — Image Optimization

### Why image size matters

```text
Small image = faster pulls + faster deploys + smaller attack surface
             + less disk + lower registry bills
```

### Where your images stand now

```bash
docker images
```

Typical numbers for this project:

```text
fullstack-frontend   1.0   ~80MB    (nginx + static files)
fullstack-backend    1.0   ~180MB   (alpine + node_modules)
```

Compare to the naive versions:

```text
single-stage backend (node:20 base):      ~1.1 GB
single-stage frontend (node + all deps):  ~1.2 GB
```

Multi-stage already cut ~90%. Now let's squeeze further.

---

## 📝 Step 1 — Audit a Image With `dive`

`dive` shows every layer and what each added: https://github.com/wagoodman/dive

```bash
dive fullstack-backend:1.0
```

Look for:

```text
❌ layers holding node_modules you don't need (dev deps, npm cache)
❌ layers holding .git, tests, docs — .dockerignore gaps
✅ your app layers — should be tiny and last
```

Even without `dive`, `docker history` gives a quick view:

```bash
docker history fullstack-backend:1.0
```

---

## 📝 Step 2 — Apply the Optimization Checklist

### 2.1 Production dependencies only

The backend runtime needs no devDependencies (nodemon etc.). Add a dedicated prod-install stage so runtime never carries them. Update `backend/Dockerfile` stage 1:

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci                        # full deps (used by the dev stage)
```

And in the runtime stage, build prod-only deps instead:

```dockerfile
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
```

Then in the runtime stage:

```dockerfile
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
```

```text
Typical saving: 30–60 MB per service — and fewer packages = fewer CVEs
```

### 2.2 npm cache discipline

`npm ci` leaves caches in the layer. Clean within the same `RUN` so the cache never enters the layer at all:

```dockerfile
RUN npm ci --omit=dev && npm cache clean --force
```

### 2.3 Pin base image versions

```dockerfile
FROM node:20-alpine        # ✅ pinned major + variant
FROM nginx:1.27-alpine     # ✅
FROM node:latest           # ❌ non-reproducible, surprise upgrades
```

### 2.4 Order layers from stable to volatile

```text
most stable  →  FROM / apt-get / system deps
             →  package.json + npm ci
             →  application source
most volatile→  assets, config you tweak constantly
```

Your Dockerfiles already follow this — now you know *why* the order is never random.

### 2.5 One Dockerfile concern per line-group

Don't stack unrelated changes in one `RUN` — cache efficiency comes from logical grouping:

```dockerfile
# ✅ good: related operations share a layer, no cache left behind
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
```

### 2.6 Frontend: build with prod env

Vite already builds minified assets, but ensure you don't ship dev artifacts:

```dockerfile
RUN npm run build          # outputs minified, hashed dist/ — already optimal
```

---

## 📝 Step 3 — Measure Your Improvement

```bash
docker compose build
docker images
```

Compare before/after. Also check rebuild speed after a source-only change:

```bash
# touch a source file, then:
docker compose build backend   # should complete in seconds (cached deps)
```

---

## 🧠 Part B — Security Hardening

### The threat model, briefly

```text
Your containers run code that handles untrusted input (the internet).
If one service is compromised, what can the attacker reach?

Non-root users      →  limited blast radius inside the container
No published DB     →  DB unreachable from outside the Docker network
No secrets in image →  .env never COPY'd (dockerignore), passed at runtime
Pinned bases        →  no surprise vulnerable versions
Health checks       →  failures are detected, not silent
```

---

## 📝 Step 4 — Verify Non-Root Everywhere

```bash
docker compose exec backend whoami     # → node
docker compose exec frontend whoami    # → nginx
docker compose exec db whoami          # → root (postgres image manages its own user; acceptable — it never publishes ports)
```

> 💡 The postgres image runs init as root then drops to the `postgres` user internally. Since the DB has no published ports and no host mounts, its exposure is minimal. Mention this tradeoff in interviews — knowing *why* is the point.

---

## 📝 Step 5 — Scan Images for Vulnerabilities

Trivy scans images for known CVEs:

```bash
# Install (macOS: brew install trivy / Linux: see aquasecurity/trivy)
trivy image fullstack-backend:1.0
trivy image fullstack-frontend:1.0
```

Reading the output:

```text
backend:  expect some low/medium CVEs from alpine + node — normal for Node apps
frontend: should be nearly clean — it's just nginx + static files
```

What to do about findings:

```text
HIGH/CRITICAL in your app deps    →  npm audit fix / bump versions
HIGH/CRITICAL in the base image   →  bump the base tag (node:20-alpine moves forward)
LOW/noise                         →  note them; don't chase zero
```

> 💡 CI pipelines commonly run Trivy on every build and fail on CRITICAL. Saying "I scan images with Trivy in CI" in an interview is a strong signal.

---

## 📝 Step 6 — Final Security Checklist

```text
[ ] Both app containers run non-root (node, nginx users)
[ ] .dockerignore excludes .env, node_modules, .git
[ ] No secrets in Dockerfiles, compose file, or images
[ ] .env is git-ignored; only .env.example is committed
[ ] Database has no published ports in production compose
[ ] Base images pinned to versions (no :latest)
[ ] Health checks on all services
[ ] npm ci --omit=dev for runtime images
[ ] Trivy scan run; criticals addressed or understood
[ ] restart: unless-stopped on all services
```

---

## ✅ Checkpoint

```text
[ ] Backend image uses prod-only deps in the runtime stage
[ ] You can explain WHY layer order affects build speed
[ ] You scanned images with Trivy and read the report
[ ] You can state the security properties of the stack from memory
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Chasing zero CVEs | Days lost to noise | Fix criticals/highs; document the rest |
| Copying prod files in a dev stage (or vice versa) | Confusing image contents | One stage per purpose, clearly named |
| `apt-get install` without cleanup in same RUN | Huge layers | `&& rm -rf /var/lib/apt/lists/*` in the same command |
| Random layer order | Slow rebuilds | Stable → volatile, always |
| Publishing DB ports "for convenience" | Security hole | Dev-only override (Guide 10) |

---

**Next:** [Guide 12 — Troubleshooting](12-troubleshooting.md) →
