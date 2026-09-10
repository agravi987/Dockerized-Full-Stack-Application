# 12 — 🔧 Troubleshooting

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Every error you're likely to hit in this project, with cause and fix. When something breaks, find your error message here first.

## 🧭 How to Debug Anything in This Stack

```text
1. docker compose ps            → who's up, who's restarting, who's unhealthy?
2. docker compose logs --tail 50 <service>   → what did it say?
3. docker compose exec <service> sh          → look around inside
4. Compare with the table below
```

---

## 🗃️ Error Reference

### 1. `ECONNREFUSED 127.0.0.1:5432`

```text
❌ Backend can't reach PostgreSQL
```

**Cause:** the backend is using `localhost` as the DB host. Inside a container, `localhost` is the container itself (Guide 05).

**Fix:** in `docker-compose.yml`, the backend env must be:

```yaml
environment:
  DB_HOST: db        # service name — not localhost, not 127.0.0.1
```

---

### 2. `getaddrinfo ENOTFOUND db` / `name resolution failed`

```text
❌ The hostname "db" doesn't resolve
```

**Causes & fixes:**

```text
a) DB container isn't running        →  docker compose ps, then docker compose up -d db
b) Services on different networks    →  with Compose this "just works"; if manual,
                                        attach all to the same docker network
c) Typo in the service name          →  db vs database vs postgres — match exactly
```

---

### 3. Backend crash-loop: `password authentication failed for user`

```text
❌ PostgreSQL rejects the backend's credentials
```

**Cause:** the volume was initialized with an OLD password. `POSTGRES_PASSWORD` only takes effect on **first** init of an empty volume. Changing `.env` later changes nothing for an existing volume.

**Fixes:**

```bash
# Option A — intentional reset (wipes data):
docker compose down -v
docker compose up -d

# Option B — keep data, change the password inside Postgres:
docker compose exec db psql -U appuser -d appdb \
  -c "ALTER USER appuser WITH PASSWORD 'newpassword';"
# then update DB_PASSWORD in .env to match
```

---

### 4. Backend starts before the DB is ready

```text
❌ ECONNREFUSED at startup, then the container restarts and works
```

**Cause:** `depends_on` without a health condition only waits for container *creation*, not DB *readiness*.

**Fix:** (already in Guide 07, verify it's there)

```yaml
depends_on:
  db:
    condition: service_healthy
```

...and the db healthcheck:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
```

Plus the backend exits on startup failure, and `restart: unless-stopped` recovers it — layered defenses.

---

### 5. `port is already allocated`

```text
Error starting userland proxy: listen tcp4 0.0.0.0:8080: bind: address already in use
```

**Cause:** something else on your machine owns that port — another container, or a non-Docker app.

**Fix:**

```bash
# Find who owns the port (Git Bash/WSL/Linux):
netstat -ano | grep 8080     # or: lsof -i :8080

# Then either stop that process, or change the HOST side of the mapping:
ports:
  - "8081:8080"      # host 8081 → container 8080; container config unchanged
```

> 💡 Only the left-hand (host) port needs to be unique. Two services can both use 8080 inside their own containers.

---

### 6. Frontend loads, but API calls fail

```text
Browser:   app renders ✅  →  "Could not reach the API"
```

**Diagnose layer by layer:**

```bash
# a) Is the backend healthy?
docker compose ps
curl http://localhost:3000/api/health          # direct (if port published)

# b) Through the proxy?
curl http://localhost:8080/api/health          # via Nginx

# c) Can Nginx resolve the backend?
docker compose exec frontend wget -qO- http://backend:3000/api/health
```

**Common causes:**

```text
→ nginx.conf proxy_pass wrong (must be http://backend:3000 — service name)
→ Backend not listening on 0.0.0.0 (Guide 02)
→ Edited nginx.conf but didn't rebuild (docker compose up --build frontend)
```

---

### 7. Refresh on a React route gives Nginx 404

**Cause:** missing SPA fallback in `nginx.conf`.

**Fix:**

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

### 8. `COPY failed: file not found` or wrong files in image

**Causes & fixes:**

```text
a) Wrong build context      →  compose `build: ./backend` must point at the
                               folder holding that Dockerfile
b) .dockerignore overreach  →  check it doesn't exclude src/ or dist/
c) Case sensitivity         →  Linux containers are case-sensitive; Windows
                               host is not. `Index.js` ≠ `index.js` in the image
```

---

### 9. Permissions error at runtime (`EACCES`)

```text
❌ Error: EACCES: permission denied, open '/app/...'
```

**Cause:** files copied as root, app runs as non-root user.

**Fix:** copy with ownership:

```dockerfile
COPY --chown=node:node . .
```

For paths the app must **write** to at runtime, ensure that dir is owned by the runtime user.

---

### 10. Rebuild didn't pick up my changes

```text
You edited code, but the container still behaves the old way
```

**Cause:** images are built once; running containers don't magically update.

**Fix:**

```bash
docker compose up --build -d            # rebuild + recreate

# If truly stuck:
docker compose build --no-cache backend # rebuild from scratch
docker compose up -d --force-recreate backend
```

In **dev mode** (Guide 10), code changes apply live via bind mounts + nodemon/Vite — no rebuild needed.

---

### 11. Container immediately exits (code 0)

```text
STATUS: Exited (0)
```

**Cause:** the main process ended. Usually a server that daemonized (went to background) — e.g. Nginx without `daemon off;`, or a script that finished.

**Fix:** the container's main process must stay in the **foreground**:

```dockerfile
CMD ["nginx", "-g", "daemon off;"]     # ✅
CMD ["node", "src/index.js"]           # ✅
```

---

### 12. Health check shows `unhealthy` but app works

**Causes & fixes:**

```text
a) curl used in an Alpine image (not installed) →  use wget
b) start-period too short                        →  increase it
c) probe hits an authenticated endpoint          →  probe /api/health instead
d) inspect the actual probe result:
   docker inspect --format='{{json .State.Health}}' <container> | less
   → read "Output" of recent probes for the real error
```

---

### 13. Disk full / Docker eating GBs

```bash
docker system df            # what's using space
docker system prune         # remove stopped containers, dangling images, unused networks
docker builder prune        # clear the build cache (builds get slower after)
docker volume ls            # check for forgotten volumes  ⚠️ never prune volumes casually
```

> ⚠️ `docker system prune` doesn't touch named volumes by default — but double-check with `docker volume ls` before any cleanup.

---

### 14. Windows-specific: line endings break shell scripts

```text
/usr/bin/env: 'sh\r': No such file or directory
```

**Cause:** Git on Windows converted LF → CRLF.

**Fix:**

```bash
# In the repo:
git config core.autocrlf input
# Convert the offending file:
dos2unix script.sh        # or set .gitattributes: *.sh text eol=lf
```

Pure `.js`/`.yaml`/`.conf` files are unaffected — this bites entrypoint shell scripts.

---

### 15. Docker Desktop not running (Windows/macOS)

```text
error during connect: ... The system cannot find the file specified
cannot connect to the Docker daemon
```

**Fix:** start Docker Desktop and wait for the whale icon to say "running". On Linux: `sudo systemctl start docker`.

---

## ✅ Checkpoint

```text
[ ] You fixed at least one issue using this reference
[ ] You can debug via ps → logs → exec without guidance
[ ] You know which errors come from localhost-vs-service-name confusion
```

---

**Next:** [Guide 13 — Final Validation](13-final-validation.md) →
