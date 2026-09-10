# Milestone 5 — 🌐 Networks & Volumes

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Understand (hands-on) why containers talk by **name**, not `localhost` — and why database data needs a **volume** to survive.

## ✅ Prerequisites

```text
[ ] ✅ Milestone 4 (backend image built)
[ ] 🐳 Docker Desktop running
```

---

## 🧠 Why `localhost` Fails Between Containers

```
On your laptop:      localhost = your machine (Postgres is here)  ✅
Inside a container:  localhost = THAT container itself           ❌ no Postgres inside
```

> 🇳🇵 **Saral Byakhya:** Container bhitra `localhost` bhaneko tyahi container aafai ho, aru kunai service hoina — tyasaile services lai ek-arkako naamle bolainchha (`db`, `backend`), `localhost` le hoina.

Containers are isolated by default. On a **user-defined Docker network**, an embedded DNS server maps container/service names to IPs:

```text
backend:  "connect to db:5432"  →  DNS: db = 172.18.0.2  →  connected ✅
```

```
                ┌────── Docker network: app-net ──────┐
                │                                      │
                │   ┌─────────────┐   ┌─────────────┐  │
                │   │  backend    │──▶│    db       │  │
                │   │ "wget db"   │ DNS│ :5432       │  │
                │   └─────────────┘    └─────────────┘  │
                └──────────────────────────────────────┘
```

> ⚠️ The default `bridge` network does **not** give name resolution. User-defined networks (which Compose creates automatically) do.

---

## 📝 Step 1 — Create a Network and Run Two Containers

```powershell
docker network create app-net
```

Start a disposable database:

```powershell
docker run -d \
  --name db \
  --network app-net \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=appdb \
  postgres:16-alpine
```

Start the backend on the same network:

```powershell
docker run -d \
  --name backend \
  --network app-net \
  -e DB_HOST=db \
  -e DB_USER=appuser \
  -e DB_PASSWORD=devpassword \
  -e DB_NAME=appdb \
  fullstack-backend:1.0
```

> 💡 `DB_HOST=db` — the hostname IS the container name. This is Docker's embedded DNS doing its job.

---

## 📝 Step 2 — Prove the DNS Resolution

```powershell
docker exec backend wget -qO- http://127.0.0.1:3000/api/health
```

Expected:

```text
{"status":"ok","uptime":...}
```

The backend reached `db` **by name** and created its table. Check from the database side:

```powershell
docker exec db psql -U appuser -d appdb -c '\dt'
# public | messages | table   ← created by the backend's initDb()
```

Peek under the hood:

```powershell
docker network inspect app-net
```

Both containers have IPs on the network, mapped by Docker DNS.

### The security win

The DB has **no published port** — it's reachable from the Docker network only, invisible to the internet and even to your host machine.

---

## 📝 Step 3 — See the Data-Loss Problem

```powershell
docker rm -f db
docker run -d --name db -e POSTGRES_PASSWORD=x postgres:16-alpine
docker exec db psql -U postgres -c "\dt"
# Did not find any tables.  ← every container removal destroyed the data
docker rm -f db
```

A container's writable layer is **thrown away on removal** — your users' data would vanish on every redeploy.

> 🇳🇵 **Saral Byakhya:** Container metie pani data nametiyos bhanera database ko data volume naamak bahiri bhandarma rakhinchha — ghar bhatkaayepani bahirako godamma rakheko saman joginchha.

---

## 📝 Step 4 — Fix It With a Named Volume

```powershell
docker volume create pgdata

docker run -d \
  --name db \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=appdb \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

```text
-v <volume-name>:<path-inside-container>
/var/lib/postgresql/data = where PostgreSQL writes EVERYTHING
```

Add data, destroy, recreate, verify:

```powershell
docker exec db psql -U appuser -d appdb -c "CREATE TABLE test (id int);"
docker rm -f db

docker run -d \
  --name db \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=appdb \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

docker exec db psql -U appuser -d appdb -c "\dt"
# public | test | table  ← data SURVIVED the container removal
```

---

## 📝 Step 5 — Named Volume vs Bind Mount

| Type | Syntax | Use for |
|------|--------|---------|
| 🗄️ **Named volume** | `db-data:/var/lib/postgresql/data` | Database files — Docker manages location, works on every OS |
| 📂 **Bind mount** | `./backend/src:/app/src` | Development — your host files live-edit inside the container (Milestone 8) |

---

## 📝 Step 6 — Clean Up the Experiment

```powershell
docker rm -f db
docker volume rm pgdata
docker network rm app-net
```

In Milestone 6, Compose automates all of this declaratively.

---

## ✅ Checkpoint

```text
[ ] You can explain WHY localhost fails between containers
[ ] Backend reached Postgres using hostname "db" on a user-defined network
[ ] You inserted data, destroyed the container, and saw the data survive
[ ] You can state named volume vs bind mount (and when to use each)
[ ] The DB ran with NO published port — you can explain why that's good
[ ] Cleanup done (db container, pgdata volume, app-net network removed)
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| `localhost` as DB host | `ECONNREFUSED 127.0.0.1:5432` | Use the service name (`db`) |
| Containers on different networks | Name doesn't resolve | Same network on both |
| Relying on default `bridge` for DNS | Name doesn't resolve | User-defined network or Compose |
| Publishing the DB port "just in case" | DB reachable from outside | Don't publish — same-network access is enough |
| `docker compose down -v` by habit | Database mysteriously empty | `-v` only for intentional resets |

---

**Next:** [Milestone 6 — Compose & Local Testing](06-docker-compose-and-local-testing.md) →