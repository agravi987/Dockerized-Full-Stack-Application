# Milestone 7 — 🏥 Health Checks, Logging & Debugging

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Make Docker *know* your services actually work — not just that their processes exist — and master the workflow that fixes any container error.

## ✅ Prerequisites

```text
[ ] ✅ Milestone 6 (working Compose stack)
```

---

## 🧠 Why Health Checks Exist

Without one, Docker's view is naive:

```text
No healthcheck:  "process is running" → Up        (even if serving 500s)
With healthcheck: "app answers probes correctly" → Up (healthy)
```

A health check is Docker poking your app the way a user would:

```text
every 30s → GET /api/health → {"status":"ok"} → exit 0 → healthy
                                timeout/error → exit non-zero → unhealthy
```

Healthy → Compose can gate startup on it. Unhealthy → Docker can restart it.

---

## 📝 Step 1 — Read the Health Status

```powershell
docker compose ps
# ...-db-1        Up (healthy)
# ...-backend-1   Up (healthy)
# ...-frontend-1  Up (healthy)
```

Or from raw Docker:

```powershell
docker inspect --format='{{.State.Health.Status}}' <container-name>
```

---

## 📝 Step 2 — Understand the Five Knobs

From the backend Dockerfile:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
```

| Option | Meaning | Why this value |
|--------|---------|----------------|
| `--interval` | How often to probe | 30s = noticed quickly, quiet enough not to spam |
| `--timeout` | Give up after N seconds | 5s — a healthy Node app answers in ms |
| `--start-period` | Grace time at boot; failures don't count | 10s — app may still be connecting to the DB |
| `--retries` | Failures before "unhealthy" | 3 — avoids flapping on one hiccup |
| `CMD ...` | The probe itself | `wget -qO- http://127.0.0.1:... || exit 1` |

> 💡 **Why `127.0.0.1`, not `localhost`:** Alpine's BusyBox `wget` can resolve `localhost` to IPv6 `::1`, but Node/Nginx listen on IPv4 only — the probe would get *"connection refused"* while the app is perfectly fine. Using `127.0.0.1` forces IPv4. Same reason we avoid `curl` (not installed in Alpine) and use `wget` instead.

> 🇳🇵 **सरल व्याख्या:** Healthcheck भनेको Docker ले केही समयमा app लाई "ठीक छैन?" भनेर सोध्ने जाँच हो — जवाफ नआए app लाई अस्वस्थ मानेर पुनः सुरु गरिन्छ।

> 💡 Using `curl` in an Alpine image is the classic "works on my machine" bug — Alpine ships BusyBox `wget`, not curl.

---

## 📝 Step 3 — Smart Startup Ordering

This is why your stack starts reliably. In `docker-compose.yml`:

```yaml
backend:
  depends_on:
    db:
      condition: service_healthy
```

```text
Old behavior:   db container CREATED ─────▶ backend starts  ❌ race
With health:    db container HEALTHY ──────▶ backend starts  ✅ safe
```

The DB healthcheck (`pg_isready`) reports actual ability to accept connections, not just that the binary runs.

Belt-and-suspenders you already have: healthchecks + `depends_on` + `restart: unless-stopped` + the backend's own defensive startup (exit 1 → restart). A stack that survives imperfect timing without babysitting.

---

## 📝 Step 4 — The Log Commands You'll Use Daily

```powershell
docker compose logs -f                # all services, live
docker compose logs backend           # one service
docker compose logs --tail 100 backend # last 100 lines
docker compose logs -t backend        # with timestamps
docker compose logs --since 10m backend
```

Health backend looks like:

```text
backend-1 | ✅ Database ready (table "messages" verified)
backend-1 | ✅ Backend listening on 0.0.0.0:3000
```

**The rule:** apps must log to **stdout/stderr** (console), never to files inside the container — container filesystems are ephemeral, and `docker logs` only sees stdout/stderr.

---

## 📝 Step 5 — Exec Into Running Containers

```powershell
docker compose exec backend sh
whoami          # → node
env | grep DB_  # → DB_HOST=db ...
wget -qO- http://127.0.0.1:3000/api/health   # 127.0.0.1, not localhost (IPv6 trap)
exit

# Query the database directly
docker compose exec db psql -U appuser -d appdb
\dt
SELECT * FROM messages;
\q
```

Also useful:

```powershell
docker stats                                   # live CPU/memory per container
docker inspect <container>                     # full config + state
docker inspect --format='{{.State.Health.Status}}' <container>
docker compose config | less                   # merged compose file (env resolved)
```

---

## 📝 Step 6 — The Debugging Ladder

When anything breaks, walk top to bottom:

```text
1. docker compose ps                  → who's up / restarting / unhealthy?
2. docker compose logs --tail 50 X    → what did the suspect say?
3. docker compose exec X sh           → is network/files/env as expected?
4. docker inspect X                   → deep config and state
5. docker compose up -d --force-recreate X   → rebuild a wedged container
```

**Drill:** make something fail on purpose, then diagnose it.

```powershell
docker compose stop db          # kill the DB behind the backend's back
docker compose logs -f backend  # → pg connection errors appear
docker compose ps               # db Exited; backend may still look "Up"
docker compose start db         # watch the pool recover
docker compose logs -f backend  # requests work again
```

This is what real outages feel like — now you know the moves.

---

## 📝 Step 7 — Log Rotation (Don't Fill Your Disk)

Docker's JSON logs grow without limit by default. Configure rotation:

For Docker Desktop: **Settings → Docker Engine**, update the JSON:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```text
max-size: 10m  → rotate at 10 MB per file
max-file: 3    → keep at most 3 → ~30 MB per container, max
```

Apply & restart Docker, then verify on a running container:

```powershell
docker inspect --format='{{.HostConfig.LogConfig.Config}}' <container>
# [max-file:3 max-size:10m]
```

> ⚠️ Log settings apply when a container is **created** — existing containers keep old settings until recreated (`docker compose up -d --force-recreate`).

---

## 📝 Step 8 — Error Reference (the ones everyone hits)

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED 127.0.0.1:5432` | `localhost` as DB host | `DB_HOST: db` |
| `password authentication failed` | Volume holds an old password | `down -v` (reset) or ALTER USER |
| `getaddrinfo ENOTFOUND db` | db not running / service name typo | `docker compose ps`; match the exact name |
| `port is already allocated` | Something owns the host port | Change host side: `"8081:8080"` |
| Frontend loads, API fails | Proxy wrong / backend not on `0.0.0.0` | nginx `proxy_pass http://backend:3000` |
| Refresh on a route → 404 | Missing SPA fallback | `try_files $uri $uri/ /index.html;` |
| `Exited (0)` immediately | Process daemonized / finished | Foreground `CMD` (`nginx -g daemon off;`) |
| Health `unhealthy` but app works | `curl` in Alpine / short `start-period` | Use wget; raise start-period |
| Rebuild shows old behavior | Image wasn't rebuilt | `up --build -d`; or `build --no-cache` |

---

## ✅ Checkpoint

```text
[ ] All three services show Up (healthy)
[ ] You can explain interval/timeout/start-period/retries
[ ] You can explain why service_healthy beats plain depends_on
[ ] You ran the stop-db drill and read the failure from logs
[ ] You exec'd into backend and db and inspected them
[ ] Log rotation configured and verified on a container
```

---

**Next:** [Milestone 8 — Dev vs Production Config](08-dev-vs-production.md) →