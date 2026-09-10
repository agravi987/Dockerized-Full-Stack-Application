# 05 — 🌐 Docker Networks

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Understand how containers find and talk to each other — and why `localhost` doesn't mean what you think inside a container.

## ✅ Prerequisites

```text
[ ] 🐳 Docker installed (Guide 01)
[ ] 🧠 Backend + frontend images built (Guides 03–04)
```

---

## 🧠 The Core Concept

Containers are isolated — no network, no filesystem, no processes shared with the host **by default**. Docker networks are how you connect them, and user-defined networks come with a superpower: **automatic DNS by container name.**

### The localhost trap (the #1 container networking mistake)

```
On your laptop:
  backend connects to localhost:5432  ✅  (Postgres runs on the same machine)

In a container:
  localhost = THE CONTAINER ITSELF
  backend connects to localhost:5432  ❌  ("where's Postgres? not in here!")
```

Inside a container, the database is not `localhost` — it's the **name of the database's container or service**, e.g. `db`.

### How containers resolve names

```
┌─────────────── Docker network: app-net ───────────────┐
│                                                       │
│   ┌─────────────┐        ┌─────────────┐              │
│   │  backend    │──DNS──▶│    db       │              │
│   │ "ping db"   │  name  │ :5432       │              │
│   └─────────────┘ resolves└─────────────┘              │
│                                                       │
└───────────────────────────────────────────────────────┘
```

On a **user-defined network**, Docker runs an embedded DNS server. Container/service names resolve automatically:

```text
backend:  "connect to db:5432"  →  DNS: db = 172.18.0.2  →  connected ✅
```

> ⚠️ The default `bridge` network does NOT give you name resolution — only user-defined networks do. Compose always creates a user-defined network for you (Guide 07). Right now, we'll do it manually to understand what Compose will automate.

### Security win

Containers on a custom network are reachable from **each other**, but the database doesn't need any published port to the outside world. No published port = not reachable from the internet or even other apps on your machine. That's how you'll run Postgres in production-grade setups.

---

## 📝 Step 1 — List Networks

```bash
docker network ls
```

Expected output shape:

```text
NETWORK ID     NAME      DRIVER    SCOPE
xxxxx          bridge    bridge    local
xxxxx          host      host      local
xxxxx          none      null      local
```

| Network | Purpose |
|---------|---------|
| `bridge` | Default network — containers get IP but no name resolution between them |
| `host` | Container shares the host's network stack (rarely what you want) |
| `none` | No networking at all |

---

## 📝 Step 2 — Create Your Own Network

```bash
docker network create app-net
```

Verify:

```bash
docker network ls
```

You should now see `app-net` with the `bridge` driver. This is a **user-defined** network → DNS included.

---

## 📝 Step 3 — Run Two Containers That Talk

### 3.1 Start a disposable PostgreSQL on the network

```bash
docker run -d \
  --name db \
  --network app-net \
  -e POSTGRES_USER=appuser \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=appdb \
  postgres:16-alpine
```

> 💡 The official postgres image auto-creates the user, password, and database from those environment variables on first start. No install, no `sudo -u postgres psql`.

### 3.2 Start the backend on the same network

```bash
docker run -d \
  --name backend \
  --network app-net \
  -e DB_HOST=db \
  -e DB_USER=appuser \
  -e DB_PASSWORD=devpassword \
  -e DB_NAME=appdb \
  fullstack-backend:1.0
```

> 💡 `DB_HOST=db` — the hostname is literally the container name. This is the embedded DNS at work, and exactly how Compose will name services later.

### 3.3 Check both are up

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

```text
NAMES      STATUS
backend    Up 20 seconds
db         Up 25 seconds
```

### 3.4 Prove the DNS resolution

```bash
docker exec backend wget -qO- http://localhost:3000/api/health
```

Expected:

```text
{"status":"ok","uptime":...}
```

Health OK means the backend successfully reached `db` **by name** and created its table. You can double-check from the database side:

```bash
docker exec db psql -U appuser -d appdb -c '\dt'
```

Expected: the `messages` table listed.

---

## 📝 Step 4 — See the Network Details

```bash
docker network inspect app-net
```

Look at the `Containers` section:

```json
"Containers": {
    "...": { "Name": "db", "IPv4Address": "172.18.0.2/16" },
    "...": { "Name": "backend", "IPv4Address": "172.18.0.3/16" }
}
```

Both containers got IPs on the same network, and names map to those IPs via Docker's DNS.

---

## 📝 Step 5 — Clean Up the Experiment

```bash
docker rm -f backend db
docker network rm app-net
```

> 💡 `rm -f` stops and removes in one step. You'll recreate all of this declaratively in Compose (Guide 07) — manual `docker run` was for learning only.

---

## 🧠 Mental Model to Carry Forward

```text
1. Same user-defined network  →  containers can talk
2. Container/service name     →  is the hostname
3. No published port          →  invisible from outside (perfect for DB)
4. localhost inside container →  means the container itself, nothing else
```

---

## ✅ Checkpoint

```text
[ ] You can explain why localhost fails between containers
[ ] You created a user-defined network and attached containers to it
[ ] Backend reached Postgres using the hostname "db"
[ ] You inspected the network and saw both containers on it
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Using `localhost` as DB host | `ECONNREFUSED 127.0.0.1:5432` | Use the service name (`db`) |
| Containers on different networks | Name doesn't resolve | `--network` the same network on both |
| Relying on default `bridge` for DNS | Name doesn't resolve | Use a user-defined network (or Compose) |
| Publishing the DB port "just in case" | DB reachable from outside | Don't publish it — same-network access is enough |

---

**Next:** [Guide 06 — Docker Volumes](06-docker-volumes.md) →
