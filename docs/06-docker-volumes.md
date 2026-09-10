# 06 — 💾 Docker Volumes

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Make database data **survive** container removal — the difference between a demo and something you can actually rely on.

## ✅ Prerequisites

```text
[ ] 🐳 Docker installed (Guide 01)
[ ] 🌐 Understanding of container networking (Guide 05)
```

---

## 🧠 The Problem: Containers Are Ephemeral

A container's writable layer is **thrown away when the container is removed**.

```bash
docker run -d --name db -e POSTGRES_PASSWORD=x postgres:16-alpine
# ... use it, insert data ...
docker rm -f db          # 💀 all data gone forever
docker run -d --name db ...   # fresh, empty database
```

That means every `docker compose down && up` would wipe your database. Volumes fix this:

```
┌─────────────┐     ┌──────────────────────────────┐
│  Container   │     │  Volume (managed by Docker)  │
│  (ephemeral) │────▶│  survives container removal  │
└─────────────┘     └──────────────────────────────┘
```

**Two kinds of mounts you'll use:**

| Type | Syntax | Use for |
|------|--------|---------|
| 🗄️ **Named volume** | `db-data:/var/lib/postgresql/data` | Database files — Docker manages where they live |
| 📂 **Bind mount** | `./src:/app/src` | Development — live-edit host files inside the container |

This guide focuses on named volumes (persistence). Bind mounts power the dev workflow in Guide 10.

---

## 📝 Step 1 — See the Problem Without a Volume

```bash
docker run -d --name pg-novol -e POSTGRES_PASSWORD=devpass postgres:16-alpine
docker exec pg-novol psql -U postgres -c "CREATE TABLE test (id int);"
docker rm -f pg-novol
docker run -d --name pg-novol -e POSTGRES_PASSWORD=devpass postgres:16-alpine
docker exec pg-novol psql -U postgres -c "\dt"
```

Expected: `Did not find any tables.` — the table is gone. 😱

That's exactly what would happen to your users' data every redeploy.

---

## 📝 Step 2 — Do It Again With a Named Volume

### 2.1 Create the volume

```bash
docker volume create pgdata
```

### 2.2 Run Postgres using it

```bash
docker run -d \
  --name pg-vol \
  -e POSTGRES_PASSWORD=devpass \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

```text
-v <volume-name>:<path-inside-container>
```

> 💡 `/var/lib/postgresql/data` is where PostgreSQL writes everything. Mount a volume there and the data outlives the container.

### 2.3 Insert something

```bash
docker exec pg-vol psql -U postgres -c "CREATE TABLE test (id int);"
docker exec pg-vol psql -U postgres -c "INSERT INTO test VALUES (1);"
```

### 2.4 Destroy and recreate the container

```bash
docker rm -f pg-vol
docker run -d \
  --name pg-vol \
  -e POSTGRES_PASSWORD=devpass \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

### 2.5 Check the data

```bash
docker exec pg-vol psql -U postgres -c "\dt"
```

Expected:

```text
List of relations
 Schema | Name | Type  | Owner
--------+------+-------+----------
 public | test | table | postgres
```

**The data survived.** Container deleted, data kept. That's the whole point. 🎉

---

## 📝 Step 3 — Understand What You Just Did

```bash
docker volume ls
docker volume inspect pgdata
```

`inspect` shows `"Mountpoint"` — a folder Docker manages on the host (on Docker Desktop it's inside the VM). You never touch it directly; Docker handles it. That's the advantage over bind mounts: no path issues, works the same on every OS.

### Volume commands worth knowing

```bash
docker volume ls                  # list volumes
docker volume inspect <name>      # details (mountpoint, driver)
docker volume rm <name>           # delete one (only if unused)
docker volume prune               # delete ALL unused volumes  ⚠️
```

> ⚠️ `docker volume prune` deletes every volume not attached to a container — including your database if the container is stopped. Never run it casually.

---

## 📝 Step 4 — Where Volumes Fit in the Compose World

In Guide 07, this manual flag becomes a declarative block:

```yaml
services:
  db:
    volumes:
      - db-data:/var/lib/postgresql/data   # ← same thing, in code

volumes:
  db-data:                                 # ← declare it at file level
```

And `docker compose down` **keeps** volumes, while `docker compose down -v` **deletes** them — which is exactly the level of control you want:

```text
docker compose down      →  containers gone, data kept    (normal redeploy)
docker compose down -v   →  containers gone, data WIPED   (reset to zero)
```

---

## 📝 Step 5 — Clean Up the Experiment

```bash
docker rm -f pg-vol
docker volume rm pgdata
```

---

## ✅ Checkpoint

```text
[ ] You can explain why a container loses data without a volume
[ ] You inserted data, destroyed the container, and saw the data survive
[ ] You know named volume (persistence) vs bind mount (live dev editing)
[ ] You know down vs down -v — and why the -v flag is dangerous
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| No volume on the database | Data vanishes after `docker compose down` | Add a named volume |
| `docker compose down -v` by habit | Database mysteriously empty | Only use `-v` when you *mean* a full reset |
| Bind-mounting Postgres data on Windows | Permission/slow issues | Use a named volume for DB data |
| Assuming `docker rm` keeps data | It doesn't — writable layer is deleted | Volume first, then delete |

---

**Next:** [Guide 07 — Docker Compose](07-docker-compose.md) →
