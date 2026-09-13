# 🎼 Milestone 6 — Docker Compose & Local Testing

## 🎯 Goal

Replace all manual `docker run` commands with **one file** — the whole stack starts with one command. This is **Production mode** 🚀 (the thing you'll deploy to EC2).

---

## 🧠 What Compose Does

Compose turns every manual flag you used in Milestone 5 into plain text: 📝

| Manual (Milestone 5) 🖐️ | Compose 📄 |
|----------------------|---------|
| `docker network create` | done automatically |
| `docker run --network app-net` | a `services:` block |
| `-e DB_HOST=db` | `environment:` list |
| `-v pgdata:...` | `volumes:` block |
| starting things in the right order | `depends_on:` |

---

## 📝 Step 1 — Database Init Script

Create `database/init.sql`: 🐘

```sql
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

This runs the first time the database starts with an empty volume. 🚀

---

## 📝 Step 2 — Environment Files

Secrets go in `.env`, never in code or Compose files. 🔐

Create `.env.example` (this one IS committed to Git):

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

Create your real `.env` (git-ignored): 🙈

```powershell
Copy-Item .env.example .env
# edit .env → set a STRONG password for BOTH POSTGRES_PASSWORD and DB_PASSWORD
```

> ⚠️ `POSTGRES_PASSWORD` and `DB_PASSWORD` MUST match. One initializes Postgres, the other logs your backend in.

---

## 📝 Step 3 — Write `docker-compose.yml`

At the project root (`docker-fullstack-app/`): 📄

```yaml
services:
  # 🐘 Database — NEVER exposed to the host
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

  # ⚡ Backend — talks to db by service name
  backend:
    build:
      context: ./backend
      target: runtime          # the PRODUCTION stage (Milestone 4)
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

  # 🎨 Frontend — Nginx serves the app + proxies /api
  frontend:
    build:
      context: ./frontend
      target: serve            # the PRODUCTION stage (Milestone 4)
    depends_on:
      - backend
    ports:
      - "8080:8080"
    restart: unless-stopped

volumes:
  db-data:
```

### 🧩 What each part means

| ⚙️ Config | 🔍 Why |
|--------|-----|
| `image: postgres:16-alpine` | Stock DB image — no Dockerfile needed |
| `./database/init.sql:...` | Auto-runs the schema on first boot |
| `build: ... target: runtime` | Builds the production stage (the dev stage is last, so pin it) |
| `DB_HOST: db` | Service name = hostname (Milestone 5, now free) |
| `depends_on: condition: service_healthy` | Backend waits until the DB passes its healthcheck — no race |
| `ports: "8080:8080"` | Frontend is the ONLY door from your browser |
| DB has NO `ports:` | Database is unreachable from outside the Docker network |
| `volumes: db-data:` | DB data survives restarts |
| `restart: unless-stopped` | Crashed containers restart automatically |

---

## 📝 Step 4 — Launch the Whole Stack

```powershell
docker compose up --build
```

Watch the sequence: 🎬
```
✔️ Network docker-fullstack-app_default    Created
✔️ Volume docker-fullstack-app_db-data     Created
✔️ Container ...-db-1       Healthy
✔️ Container ...-backend-1  Started        ← waited for db health
✔️ Container ...-frontend-1 Started
```

---

## 📝 Step 5 — Verify Everything

In a second PowerShell window: 🪟

```powershell
docker compose ps       # all three should show Up (healthy)

# Full path through Nginx:
curl http://localhost:8080/api/health

# Create a message:
curl -X POST http://localhost:8080/api/messages `
  -H "Content-Type: application/json" `
  -d '{"name":"Docker","message":"compose up works!"}'

# Read it back:
curl http://localhost:8080/api/messages
```

Open **http://localhost:8080** and send a message through the UI. Your whole app runs from one file. 🎉

---

## 📝 Step 6 — The Compose Lifecycle

```powershell
docker compose ps                    # 🩺 status
docker compose logs -f               # 📜 follow all logs (Ctrl+C stops)
docker compose logs backend          # 📜 one service's logs
docker compose stop                  # ⏹️ stop, keep containers
docker compose start                 # ▶️ restart them
docker compose down                  # 🧹 stop + remove containers — VOLUME KEPT
docker compose down -v               # ⚠️ also deletes the database volume
docker compose up --build -d         # 🏗️ rebuild + run in background
```

---

## 📝 Step 7 — Prove Data Persists

```powershell
# 1. Add a message
curl -X POST http://localhost:8080/api/messages -H "Content-Type: application/json" -d '{"name":"Test","message":"survive"}' 

# 2. Stop everything (NO -v — this keeps the volume)
docker compose down

# 3. Bring it back
docker compose up -d

# 4. Still there?
curl http://localhost:8080/api/messages
```

The message survives. The `db-data` volume did its job. 💾✨

---

## 🧯 Debugging (when something breaks)

```text
1. docker compose ps                    → who is up / restarting / unhealthy?
2. docker compose logs --tail 50 X      → what did that service say?
3. docker compose exec X sh             → look inside the container
4. docker compose up -d --force-recreate X   → recreate a stuck container
```

### ⚠️ Common errors

| 💥 Error | 🔍 Cause | 🛠️ Fix |
|-------|-------|-----|
| `port is already allocated` | Something owns 8080 | `docker ps` and stop it, or change to `"8081:8080"` |
| backend keeps restarting | DB not ready or env mismatch | Check logs; ensure POSTGRES_PASSWORD = DB_PASSWORD |
| `getaddrinfo ENOTFOUND db` | `db` not running / typo | `docker compose ps`; check the name matches |
| Old behavior after edits | Image not rebuilt | `docker compose up --build -d` |
| `.env` changes not applied | Compose cached it | `docker compose up -d` again (env re-read) |

---

## ✅ Checkpoint

```
[ ] ✔️ .env created from .env.example with a strong password
[ ] ✔️ docker compose up --build starts all three services
[ ] ✔️ db shows (healthy), backend starts after it
[ ] ✔️ App works at http://localhost:8080
[ ] ✔️ Data survives docker compose down
[ ] ✔️ You know the loop: up --build → curl → check logs
```

---

➡️ **Next:** [Milestone 7 — Dev Mode](07-dev-mode.md)