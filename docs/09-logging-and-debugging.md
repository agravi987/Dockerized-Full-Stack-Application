# 09 — 📋 Container Logging & Debugging

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Master the daily debugging workflow for containers: read logs, exec into running containers, inspect state, and configure log rotation so logs don't eat your disk.

## ✅ Prerequisites

```text
[ ] 🎼 Running Compose stack (Guide 07)
[ ] 🏥 Healthy services (Guide 08)
```

---

## 🧠 How Container Logging Works

Docker captures **stdout/stderr** of each container's main process and stores it as JSON files on the host.

```text
Your app:  console.log("✅ Backend listening")  →  stdout
           console.error("❌ DB error")          →  stderr
                          ↓
        Docker writes both to a JSON log file
                          ↓
        docker logs / docker compose logs read it back
```

**The rule that makes this work:** your app must log to stdout/stderr — never to files inside the container. Container filesystems are ephemeral; logs written to a file inside a container vanish with it. (That's why the backend from Guide 02 logs to the console.)

```
           ❌ Anti-pattern                    ✅ Container pattern
  app → /var/log/app.log (inside container)   app → stdout/stderr
  log lost when container is removed          docker collects everything
```

---

## 📝 Step 1 — The Log Commands You'll Use Daily

```bash
# All services, live (Ctrl+C stops following, containers keep running)
docker compose logs -f

# One service
docker compose logs backend

# Last 100 lines, no follow — the "what just happened" command
docker compose logs --tail 100 backend

# With timestamps
docker compose logs -t backend

# Since a point in time
docker compose logs --since 10m backend
```

Expected flavor for a healthy backend:

```text
backend-1  | ✅ Database ready (table "messages" verified)
backend-1  | ✅ Backend listening on 0.0.0.0:3000
```

### Also know the raw Docker forms

```bash
docker logs <container>            # same idea, outside Compose
docker logs -f <container>
docker events                      # live stream of Docker-verse events (start/die/health_status…)
```

---

## 📝 Step 2 — Exec Into a Running Container

When logs aren't enough, go inside. The Alpine-based images have `sh` (not bash).

```bash
docker compose exec backend sh
```

Now you're inside — useful things to check:

```sh
# Confirm you're the non-root user
whoami                       # → node

# Environment variables as the app sees them
env | grep DB_

# Can I reach the database? (name resolution + port)
wget -qO- http://localhost:3000/api/health
# from inside backend, DB reachability is implicit — but test DNS:
nslookup db                  # resolves to the db container's IP

# Look around
ls -la /app
cat package.json

exit
```

Same trick for the database:

```bash
docker compose exec db psql -U appuser -d appdb
```

```sql
\dt                        -- list tables
SELECT * FROM messages;    -- see the data
\q                         -- quit
```

> 💡 `docker compose exec` runs a NEW process in an existing container. `docker compose run` creates a one-off new container — different tool, different use.

---

## 📝 Step 3 — Inspect Everything

```bash
# Full container config + state (ports, env, mounts, health)
docker inspect <container-name> | less

# Just the health status
docker inspect --format='{{.State.Health.Status}}' <container-name>

# Live resource usage per container — spot memory leaks fast
docker stats

# What's mounted where
docker compose config | less     # the final merged Compose config incl. .env values
```

> ⚠️ `docker stats` with no flags streams live — press `Ctrl+C` to exit.

---

## 📝 Step 4 — A Debugging Workflow That Always Works

When something's wrong, walk this ladder top to bottom:

```text
1. docker compose ps                  → is everything Up (healthy)? Anything restarting?
2. docker compose logs --tail 50 X    → what did the suspect say?
3. docker compose exec X sh           → is the network/files/env what you expect?
4. docker inspect X                   → deep config and state
5. docker compose up -d --force-recreate X   → rebuild a wedged container
```

### Quick drill: make something fail, then diagnose it

```bash
# 1. Stop the database behind the backend's back
docker compose stop db

# 2. Watch the backend notice
docker compose logs -f backend
# → you'll see pg connection errors appearing

# 3. Check status — db is Exited, backend may look "Up"
docker compose ps

# 4. Bring it back and watch recovery
docker compose start db
docker compose logs -f backend
# → connection pool recovers; new requests work
```

This drill is worth doing once deliberately — real outages feel exactly like this, and now you know the moves.

---

## 📝 Step 5 — Log Rotation (Don't Fill Your Disk)

By default, Docker's JSON log files grow **without limit**. A chatty container can fill a disk in days. Configure rotation in `/etc/docker/daemon.json` (create it if missing; on Docker Desktop, set it via Settings → Docker Engine):

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
max-size: 10m  →  rotate when a log file hits 10 MB
max-file: 3    →  keep at most 3 files (10m × 3 = ~30 MB per container, max)
```

Restart Docker, then verify on a running container:

```bash
docker inspect --format='{{.HostConfig.LogConfig.Config}}' <container-name>
```

Expected: `[max-file:3 max-size:10m]`

> ⚠️ Log settings apply **when the container is created** — existing containers keep old settings until recreated (`docker compose up -d --force-recreate`).

> 💡 In production you'd often switch to the `local` driver or ship logs to a system (Loki, CloudWatch…). JSON-file + rotation is the right default for this project and a perfectly good interview answer.

---

## ✅ Checkpoint

```text
[ ] You can follow, tail, and filter logs per service
[ ] You exec'd into backend and db containers
[ ] You ran the stop-db drill and read the failure from logs
[ ] daemon.json rotation is configured and verified on a container
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| App logs to a file inside the container | `docker logs` is empty | Log to stdout/stderr |
| Debugging with `docker run` instead of `exec` | "it works when I start a new container" | `exec` inspects the *running* state |
| No log rotation | Disk full after weeks | daemon.json max-size/max-file |
| Reading `docker compose logs` from wrong directory | "no configuration file provided" | Compose commands run where the yml lives |
| `docker compose down` to "fix" everything | You lose in-container state you meant to inspect | `restart` / `force-recreate` is usually enough |

---

**Next:** [Guide 10 — Dev vs Production](10-dev-vs-production.md) →
