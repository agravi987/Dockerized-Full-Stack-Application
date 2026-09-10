# Milestone 6 — 🎼 Compose & Local Testing

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Replace every manual `docker run` with **one declarative file** — the whole stack starts with a single command in Docker Desktop.

## ✅ Prerequisites

```text
[ ] ✅ Milestones 2–5 (code, Dockerfiles, networks, volumes understood)
[ ] 🐳 Docker Desktop running
```

---

## 🧠 What Compose Does

Compose moves all those manual flags into **code**:

| Manual (Milestone 5) | Compose |
|----------------------|---------|
| `docker network create app-net` | network auto-created |
| `docker run --network app-net` | `services:` blocks |
| `-e DB_HOST=db` | `environment:` list |
| `-v pgdata:...` | `volumes:` block |
| Starting things in the right order | `depends_on:` |

> 🇳🇵 **सरल व्याख्या:** Compose भनेको तीनवटै service (frontend, backend, db) लाई एउटै फाइलबाट चलाउने "एउटै कमाण्ड" हो — हातले गर्नुपर्ने सबै जोड-तोड (network, volume, ports) एकै ठाउँमा लेखिएको हुन्छ।

---

## 📝 Step 1 — Create the Database Init Script

Create `database/init.sql`:

```sql
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

This runs automatically the **first time** the DB starts with an empty volume. The backend also creates the table defensively on startup — belt and suspenders.

---

## 📝 Step 2 — Create Environment Files

Secrets go in `.env`, never in the Compose file or code.

Create `.env.example` (this one **is committed to Git**):

```
# PostgreSQL
POSTGRES_USER=appuser
POSTGRES_PASSWORD=change_me_please
POSTGRES_DB=appdb

# Backend
DB_HOST=db
DB_PORT=5432
DB_NAME=appdb
DB_USER=appuser
DB_PASSWORD=change_me_please
```

Create your real `.env` (git-ignored):

```powershell
Copy-Item .env.example .env
# then edit .env and set a strong password for BOTH POSTGRES_PASSWORD and DB_PASSWORD
```

> ⚠️ `POSTGRES_PASSWORD` and `DB_PASSWORD` **must match**. The first initializes Postgres, the second authenticates your backend.

> 💡 Compose loads `.env` from the project root, substitutes `${VAR}` in the file, and passes the values into containers.

---

## 📝 Step 3 — Write `docker-compose.yml`

At the project root (`D:\docker-fullstack-app`):

```yaml
services:
  # ──────────────────────────────────────────────
  # 🐘 Database — never exposed to the host
  # ──────────────────────────────────────────────
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - db-data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # ──────────────────────────────────────────────
  # ⚡ Backend — API, talks to db by service name
  # ──────────────────────────────────────────────
  backend:
    build:
      context: ./backend
      target: runtime          # ← production stage, NOT the dev stage at the bottom
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      PORT: 3000
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3000:3000"
    restart: unless-stopped

  # ──────────────────────────────────────────────
  # 🎨 Frontend — Nginx serves the app + proxies /api
  # ──────────────────────────────────────────────
  frontend:
    build:
      context: ./frontend
      target: serve            # ← production stage (nginx), not the dev stage
    depends_on:
      - backend
    ports:
      - "8080:8080"
    restart: unless-stopped

volumes:
  db-data:
```

### What each block does

| Block | Why |
|-------|-----|
| `image: postgres:16-alpine` | Stock DB image — no custom Dockerfile needed |
| `./database/init.sql:/docker-entrypoint-initdb.d/...` | Auto-runs schema on first boot (`:ro` = read-only mount) |
| `build: ./backend` with `target: runtime` | Builds the *production* stage — the file also has a dev stage, and the LAST stage is the default, so we pin it explicitly (Milestone 4) |
| `DB_HOST: db` | Service name = hostname (Milestone 5, now free) |
| `depends_on: condition: service_healthy` | Backend waits until DB healthcheck passes — no startup race |
| `ports: "8080:8080"` | Frontend is the **only** door from your browser |
| DB has **no** `ports:` | Database is unreachable from outside the Docker network |
| `volumes: db-data:` | Named volume keeps DB data across `down`/`up` |
| `restart: unless-stopped` | Crashed containers come back automatically |

---

## 📝 Step 4 — Launch the Whole Stack

```powershell
docker compose up --build
```

Watch the startup sequence:

```text
✔ Network docker-fullstack-app_default    Created
✔ Volume "docker-fullstack-app_db-data"   Created
✔ Container ...-db-1       Healthy
✔ Container ...-backend-1  Started        ← waited for db health
✔ Container ...-frontend-1 Started
```

---

## 📝 Step 5 — Verify Everything

In a second PowerShell window:

```powershell
docker compose ps
# db / backend / frontend all "Up (healthy)"

# Full path through Nginx:
curl http://localhost:8080/api/health

# Create a message:
curl -X POST http://localhost:8080/api/messages `
  -H "Content-Type: application/json" `
  -d '{"name":"Docker","message":"compose up works!"}'

# Read it back:
curl http://localhost:8080/api/messages
```

Open **http://localhost:8080** and send a message through the UI. Your entire stack runs from one file. 🎉

---

## 📝 Step 6 — Learn the Compose Lifecycle

```powershell
docker compose ps            # status of all services
docker compose logs -f       # follow all logs (Ctrl+C stops following)
docker compose logs backend  # logs for one service
docker compose stop          # stop, keep containers
docker compose start         # restart them
docker compose down          # stop + remove containers + network — VOLUME KEPT
docker compose down -v       # ⚠️ also deletes the database volume
docker compose up --build -d # rebuild + recreate in background
```

---

## 📝 Step 7 — Prove Persistence (The Payoff)

```powershell
# 1. Create a message
curl -X POST http://localhost:8080/api/messages `
  -H "Content-Type: application/json" `
  -d '{"name":"Persist","message":"survive the down"}'

# 2. Tear down WITHOUT -v
docker compose down

# 3. Bring it back
docker compose up -d

# 4. Still there?
curl http://localhost:8080/api/messages
```

The message survives. The `db-data` volume did its job.

---

## ✅ Checkpoint

```text
[ ] .env created from .env.example with a real password (not committed)
[ ] database/init.sql exists
[ ] docker compose up --build starts all three services
[ ] db shows (healthy), backend started only after it
[ ] Full app works at http://localhost:8080
[ ] Data survives docker compose down (without -v)
[ ] You know the everyday loop: up --build → curl → logs if anything's off
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Committing `.env` | Leaked credentials | Commit `.env.example` only |
| `POSTGRES_PASSWORD` ≠ `DB_PASSWORD` | Backend auth failure | Same value in both |
| `depends_on` without healthcheck | Backend crash-loops while DB boots | `condition: service_healthy` |
| Publishing the DB port | Security hole | DB never gets `ports:` in prod compose |
| `down -v` out of habit | Data gone | `-v` only for intentional resets |
| Editing code, seeing no change | Old image still running | `docker compose up --build -d` |

---

**Next:** [Milestone 7 — Health Checks, Logging & Debugging](07-health-checks-logging-debugging.md) →