# 08 — 🏥 Health Checks

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Make Docker *know* whether your services are actually working — not just "process exists" — and use that knowledge for smart startup ordering and self-healing.

## ✅ Prerequisites

```text
[ ] 🎼 Working Compose stack (Guide 07)
[ ] ⚡ /api/health endpoint exists in the backend (Guide 02)
```

---

## 🧠 Why Health Checks Matter

Without a health check, Docker's view of reality is naive:

```text
No healthcheck:  "process is running"  →  status: Up ✅
With healthcheck: "process AND app answer correctly" → status: Up (healthy) ✅
```

The gap between those two statements is where outages live:

```text
💀 Node process alive, but DB connection pool is exhausted → "Up", still broken
💀 Nginx running, but serving 500s                          → "Up", still broken
💀 App still booting, connections fail for 20 seconds       → "Up", still broken
```

A health check is Docker periodically poking your app the way a user would:

```
        every 30s
Docker ────────────▶ GET /api/health
        ◀──────────── {"status":"ok"}
        exit code 0 = healthy
```

- Exit `0` → healthy
- Exit non-zero → unhealthy → Docker marks it and (with `restart` + Compose) can act on it

You already added healthchecks in Guides 03, 04, and 07. Now let's understand and tune them.

---

## 📝 Step 1 — Read the Health Status

```bash
docker compose ps
```

Expected:

```text
NAME            STATUS
...-db-1        Up (healthy)
...-backend-1   Up (healthy)
...-frontend-1  Up (healthy)
```

The `(healthy)` tag is the healthcheck working. Also try the raw Docker view:

```bash
docker inspect --format='{{.State.Health.Status}}' <container-name>
```

Expected: `healthy`

---

## 📝 Step 2 — Understand the Five Knobs

From the backend Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
```

| Option | Meaning | Why this value |
|--------|---------|----------------|
| `--interval` | How often to probe | 30s = frequent enough to notice, quiet enough not to spam |
| `--timeout` | Give up waiting after N seconds | 5s — a healthy Node app answers in ms |
| `--start-period` | Grace time at startup; failures don't count | 10s — the app may still be connecting to the DB |
| `--retries` | Consecutive failures before "unhealthy" | 3 — avoids flapping on one hiccup |
| `CMD ...` | The probe itself | `wget -qO- ... \|\| exit 1` — curl/wget exit codes map perfectly |

> 💡 `wget` is used because Alpine images include BusyBox wget but **not** curl. Using curl here is a classic "works on my machine" bug.

### The startup lifecycle you'll observe

```text
container starts → "starting" → probes pass → "healthy"
                              ↘ probes fail past start-period+retries → "unhealthy"
```

---

## 📝 Step 3 — Watch a Failure Be Detected

Prove that health checks actually catch breakage.

### 3.1 Break the backend on purpose

```bash
docker compose exec backend sh
# inside the container:
kill 1           # SIGTERM the main process? No — PID 1 ignores it; instead:
exit
```

Better: scale down to a broken state by pointing the backend at a wrong DB host for one run:

```bash
docker compose stop backend
docker run -d --name broken-backend \
  --network docker-fullstack-app_default \
  -e DB_HOST=wrong-host -e DB_USER=x -e DB_PASSWORD=x -e DB_NAME=x \
  fullstack-backend:1.0
```

### 3.2 Watch it fail

```bash
docker ps --filter name=broken-backend
```

You'll see `Up (health: starting)`, then after start-period + retries, `(unhealthy)` — even though the process may keep "running" while stuck retrying the DB. Exactly the failure mode health checks exist to catch.

### 3.3 Clean up

```bash
docker rm -f broken-backend
docker compose start backend
```

---

## 📝 Step 4 — Smart Startup Ordering (depends_on + healthcheck)

This is why your stack starts reliably. In `docker-compose.yml`:

```yaml
backend:
  depends_on:
    db:
      condition: service_healthy
```

With plain `depends_on: [db]` (old style), Compose only waits for the db *container to exist*. The postgres process inside may still be initializing → backend connects too early → crash loop.

```text
Old behavior:   db container exists ──────────────▶ backend starts  ❌ race
With health:    db container exists → HEALTHY ────▶ backend starts  ✅ safe
```

Compose's own per-service healthcheck (the db one in Guide 07) makes this possible:

```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
```

> 💡 `pg_isready` is Postgres's own readiness probe — it checks the server actually accepts connections, not just that the binary runs. `CMD-SHELL` lets it use environment variables.

### Belt and suspenders

Notice your backend *also* handles the race in code (Guide 02): if startup fails, it exits, and `restart: unless-stopped` brings it back. Health checks + depends_on + restart policy + defensive startup = a stack that survives imperfect timing without you babysitting it.

---

## 📝 Step 5 — Frontend Health Check

Already wired in Guide 04:

```dockerfile
HEALTHCHECK ... CMD wget -qO- http://localhost:8080/ >/dev/null || exit 1
```

It checks that Nginx actually serves the app. If you proxy deeper health (e.g. `/api/health` through Nginx), a failing backend would mark the frontend unhealthy too — a design choice: **do you want the frontend's health to depend on the backend's?** For this project, checking static serving only keeps failure attribution clean (Nginx broken vs backend broken).

---

## ✅ Checkpoint

```text
[ ] docker compose ps shows (healthy) for all services
[ ] You can explain interval / timeout / start-period / retries
[ ] You watched a service become (unhealthy) on purpose
[ ] You can explain why depends_on: service_healthy beats plain depends_on
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Health check hits a URL that needs auth | Always unhealthy | Probe a cheap public endpoint (`/api/health`) |
| Using `curl` in Alpine images | "curl: not found" → permanently unhealthy | Use `wget` |
| `start-period` too short | Marked unhealthy while still booting | Give it the app's realistic boot time |
| Health check too aggressive (1s interval) | Log spam, wasted CPU | 15–30s is fine for this kind of app |
| Confusing `restart` with healthcheck | Crashed containers restart, but broken-but-running ones don't | Healthcheck *detects*; restart *acts*; orchestrators (Swarm/K8s) connect the two |

---

**Next:** [Guide 09 — Logging & Debugging](09-logging-and-debugging.md) →
