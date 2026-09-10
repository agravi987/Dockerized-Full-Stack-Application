# 07 — 🎼 Docker Compose

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Replace everything you did manually in Guides 05–06 with **one declarative file** — so the entire stack starts with a single command:

```bash
docker compose up
```

## ✅ Prerequisites

```text
[ ] 🐳 Docker + Compose plugin installed (Guide 01)
[ ] ⚡🎨 Backend & frontend images/Dockerfiles ready (Guides 03–04)
[ ] 🌐💾 You understand networks + volumes hands-on (Guides 05–06)
```

---

## 🧠 What Compose Actually Is

Compose takes the flags you typed manually and puts them in **code**:

| Manual (Guide 05) | Compose (this guide) |
|-------------------|----------------------|
| `docker network create app-net` | `networks: app-net:` (auto-created) |
| `docker run --network app-net ...` | `services: backend:` block |
| `-e DB_HOST=db` | `environment:` list |
| `-v pgdata:/var/lib/postgresql/data` | `volumes:` block |
| Starting things in the right order | `depends_on:` |

The file lives at the project root, and every `docker compose` command works from there.

---

## 📝 Step 1 — Create `.env.example` and `.env`

Secrets never go in the Compose file or the code. Create `.env.example` (this one is committed to Git):

```text
# PostgreSQL
POSTGRES_USER=appuser
POSTGRES_PASSWORD=change_me_please
POSTGRES_DB=appdb

# Backend (DB connection is built from the values above)
DB_HOST=db
DB_PORT=5432
DB_NAME=appdb
DB_USER=appuser
DB_PASSWORD=change_me_please
```

Then create your real, git-ignored copy:

```bash
cp .env.example .env
# → open .env and set a real password for BOTH POSTGRES_PASSWORD and DB_PASSWORD
```

> ⚠️ `POSTGRES_PASSWORD` and `DB_PASSWORD` must match — the first is read by the postgres image to initialize itself, the second by your backend to connect.

> 💡 **How env vars flow:** Compose automatically loads `.env` from the project root and substitutes `${VAR}` in the file — and the `environment:` blocks pass variables into the containers. One file, both jobs.

---

## 📝 Step 2 — Write `docker-compose.yml`

At the project root (`docker-fullstack-app/`):

```yaml
services:
  # ------------------------------------------------------------
  # 🐘 Database — never exposed to the host
  # ------------------------------------------------------------
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

  # ------------------------------------------------------------
  # ⚡ Backend — API, talks to db by service name
  # ------------------------------------------------------------
  backend:
    build: ./backend
    environment:
      DB_HOST: db              # ← service name = hostname (Guide 05)
      DB_PORT: 5432
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      PORT: 3000
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3000:3000"            # exposed for curl testing; remove in prod
    restart: unless-stopped

  # ------------------------------------------------------------
  # 🎨 Frontend — Nginx serves the app + proxies /api
  # ------------------------------------------------------------
  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "8080:8080"            # the ONLY door in from your browser
    restart: unless-stopped

# ------------------------------------------------------------
# Named volume for persistence (Guide 06)
# ------------------------------------------------------------
volumes:
  db-data:

# Networks are implicit: Compose creates one shared network
# and service names resolve on it automatically.
```

### Line-by-line: the parts that matter

| Block | Why it's written this way |
|-------|---------------------------|
| `image: postgres:16-alpine` | DB uses a stock image — no custom Dockerfile needed |
| `./database/init.sql:/docker-entrypoint-initdb.d/init.sql:ro` | Official postgres image auto-runs scripts in `/docker-entrypoint-initdb.d/` on **first** startup (empty volume only). `:ro` = read-only mount |
| `build: ./backend` | Build the image from `./backend/Dockerfile` — no manual `docker build` |
| `DB_HOST: db` | The service name is the hostname. Everything from Guide 05, for free |
| `depends_on: condition: service_healthy` | Backend waits until the DB healthcheck passes — not just "container started" |
| `ports: "8080:8080"` (frontend only + backend for testing) | The database has **no** `ports:` — it's unreachable from outside the Docker network. That's deliberate |
| `volumes: db-data:` | Top-level declaration makes the named volume exist and persist |
| `restart: unless-stopped` | If the backend crashes at startup (DB race), Compose brings it back |

---

## 📝 Step 3 — Launch the Whole Stack

```bash
docker compose up --build
```

```text
--build   →  rebuild images from Dockerfiles first
```

Watch the startup sequence — it tells the whole story:

```text
✔ Network docker-fullstack-app_default    Created   ← the shared network
✔ Volume "docker-fullstack-app_db-data"   Created   ← the persistent volume
✔ Container ...-db-1       Healthy                  ← healthcheck passed
✔ Container ...-backend-1  Started                  ← waited for db health
✔ Container ...-frontend-1 Started
```

The db runs its first-time init (user + database + your `init.sql`), the backend connects **by name** and creates the table, Nginx starts serving.

### Verify everything

```bash
docker compose ps
```

Expected:

```text
NAME                   STATUS
...-db-1               Up (healthy)
...-backend-1          Up
...-frontend-1         Up
```

Then the real test — the full path:

```bash
# API through the frontend's Nginx proxy
curl http://localhost:8080/api/health

# Send a message
curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/json" \
  -d '{"name":"Docker","message":"compose up works!"}'

# Read it back
curl http://localhost:8080/api/messages
```

Open **http://localhost:8080** in your browser — create a message through the UI too. Your entire full-stack app is running from one file. 🎉

---

## 📝 Step 4 — Learn the Compose Lifecycle

```bash
docker compose ps          # status of all services
docker compose logs -f     # follow all logs (Ctrl+C to stop following)
docker compose logs backend
docker compose stop        # stop, keep containers
docker compose start       # restart them
docker compose down        # stop + remove containers + network (volume kept!)
docker compose down -v     # ⚠️ also wipes the database volume
```

> 💡 **The everyday loop:**
> ```text
> edit code → docker compose up --build -d → curl to verify → docker compose logs -f if anything's off
> ```

---

## 📝 Step 5 — Prove Persistence (The Payoff)

```bash
# 1. Create a message via the API
curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/json" \
  -d '{"name":"Persist","message":"survive the down"}'

# 2. Tear the stack down — WITHOUT -v
docker compose down

# 3. Bring it back up
docker compose up -d

# 4. Is it still there?
curl http://localhost:8080/api/messages
```

The message is still there — the `db-data` volume did its job (Guide 06, now in practice).

---

## ✅ Checkpoint

```text
[ ] .env created from .env.example (password changed, not committed)
[ ] docker compose up --build starts all three services
[ ] db shows (healthy), backend waited for it via depends_on
[ ] Browser app works end-to-end at localhost:8080
[ ] DB has NO published ports
[ ] Data survives docker compose down (without -v)
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Committing `.env` | Leaked credentials | Commit `.env.example`; `.env` is git-ignored |
| `POSTGRES_PASSWORD` ≠ `DB_PASSWORD` | Auth failed in backend | Set both to the same value in `.env` |
| `depends_on` without healthcheck | Backend starts before DB accepts connections, crashes | `condition: service_healthy` (Guide 08 deep-dive) |
| Publishing the DB port | Security hole | Only frontend (and backend, for testing) get `ports:` |
| `down -v` out of habit | Data gone | `-v` only for intentional resets |
| Editing code and wondering why nothing changed | Old image running | Rebuild: `docker compose up --build -d` |

---

**Next:** [Guide 08 — Health Checks](08-health-checks.md) →
