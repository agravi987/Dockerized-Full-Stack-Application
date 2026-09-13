# 🌐 Milestone 5 — Networks & Volumes

## 🎯 Goal

Learn why containers talk to each other **by name** (not `localhost`), and why database data needs a **volume** to survive. 💾

---

## 🔗 Part A — Networks: containers talk by name

### ❌ The problem with `localhost`

```
💻 On your laptop:      localhost = your machine (Postgres is there)   ✅
🐳 Inside a container:  localhost = THAT container itself              ❌ no Postgres inside
```

Containers are isolated. On a **Docker network**, an embedded DNS maps container names to IPs: 🗺️

```
backend container says "connect to db:5432"
        ↓
Docker DNS: db = 172.18.0.2
        ↓
connected ✅
```

### 🧪 Try it

```powershell
docker network create app-net
```

Start a database container on that network: 🐘

```powershell
docker run -d `
  --name db `
  --network app-net `
  -e POSTGRES_USER=appuser `
  -e POSTGRES_PASSWORD=devpassword `
  -e POSTGRES_DB=appdb `
  postgres:16-alpine
```

Start the backend on the SAME network: ⚡

```powershell
docker run -d `
  --name backend `
  --network app-net `
  -e DB_HOST=db `
  -e DB_USER=appuser `
  -e DB_PASSWORD=devpassword `
  -e DB_NAME=appdb `
  fullstack-backend:1.0
```

`DB_HOST=db` — the hostname IS the container name. Docker DNS does the rest. 🪄

### ✅ Prove it:

```powershell
docker exec backend wget -qO- http://127.0.0.1:3000/api/health
# {"status":"ok",...}
```

The backend reached Postgres **by name** and created its table. Check from the database side:

```powershell
docker exec db psql -U appuser -d appdb -c "\dt"
# messages | table
```

> 🔒 Security win: the database has **no published port** — nothing outside the Docker network can reach it, not even your laptop.

Clean up: 🧹
```powershell
docker rm -f backend db
docker network rm app-net
```

---

## 💾 Part B — Volumes: data survives

### ❌ The problem

A container's files are thrown away when the container is removed. Destroy the container → lose the data. 💀

### ✅ The fix: named volume

A **named volume** is storage stored outside the container, managed by Docker:

```powershell
docker volume create pgdata

docker run -d `
  --name db `
  -e POSTGRES_USER=appuser `
  -e POSTGRES_PASSWORD=devpassword `
  -e POSTGRES_DB=appdb `
  -v pgdata:/var/lib/postgresql/data `
  postgres:16-alpine
```

`-v <volume-name>:<path-in-container>` — `/var/lib/postgresql/data` is where Postgres writes EVERYTHING. 📀

### ✅ Prove it:

```powershell
docker exec db psql -U appuser -d appdb -c "CREATE TABLE test (id int);"
docker rm -f db                     # destroy the container 💥

docker run -d --name db -e POSTGRES_USER=appuser -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=appdb -v pgdata:/var/lib/postgresql/data postgres:16-alpine

docker exec db psql -U appuser -d appdb -c "\dt"
# test | table   ← data SURVIVED the container removal ✨
```

---

## 🆚 Named Volume vs Bind Mount

| Type | ⚙️ Syntax | 🎯 Use for |
|------|--------|---------|
| 🗄️ **Named volume** | `db-data:/var/lib/postgresql/data` | Database files — Docker manages the location |
| 📂 **Bind mount** | `./backend/src:/app/src` | Development — your laptop files appear live inside the container (Milestone 7) |

---

## 🧹 Clean up

```powershell
docker rm -f db
docker volume rm pgdata
```

In Milestone 6, Compose does all of this automatically. 🎼

---

## ✅ Checkpoint

```
[ ] ✔️ You can explain why localhost fails between containers
[ ] ✔️ Backend reached Postgres using the hostname "db"
[ ] ✔️ Data survived container removal thanks to a volume
[ ] ✔️ You know named volume vs bind mount
[ ] ✔️ Cleanup done
```

---

➡️ **Next:** [Milestone 6 — Docker Compose & Local Testing](06-docker-compose-and-local-testing.md)