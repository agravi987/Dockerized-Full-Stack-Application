# 🐳 Dockerized Full-Stack Application

> **Last Updated:** September 9, 2026
> **Portfolio Project 2 — Containerized React + Node.js + PostgreSQL**

---

## 🎯 Project Overview

Take a full-stack web application and make it **fully reproducible with one command**:

```bash
docker compose up
```

No "install Node on your machine", no "install PostgreSQL locally" — everything runs in containers.

```
              ┌──────────────────┐
              │      You 🧑‍💻      │
              │  Browser :8080   │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  🎨 Frontend     │  React built + served by Nginx
              │  Container :8080 │  (also proxies /api requests)
              └────────┬─────────┘
                       │  /api/*
                       ▼
              ┌──────────────────┐
              │  ⚡ Backend      │  Node.js + Express API
              │  Container :3000 │
              └────────┬─────────┘
                       │  SQL over :5432
                       ▼
              ┌──────────────────┐
              │  🐘 PostgreSQL   │  Data persisted in a Docker volume
              │  Container :5432 │
              └──────────────────┘
```

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| 🎨 Frontend | React (Vite) | User interface |
| 🔷 Web Server | Nginx (unprivileged) | Serves frontend + reverse-proxies `/api` |
| ⚡ Backend | Node.js 20 / Express | REST API |
| 🐘 Database | PostgreSQL 16 | Data storage |
| 🐳 Containers | Docker + Docker Compose | Everything above, reproducible |

---

## ✨ What Makes This "Real World" (Not a Toy)

| Practice | Why It Matters |
|----------|----------------|
| 🧱 Multi-stage builds | Small production images (no build tools inside) |
| 👤 Non-root containers | Security — even the app running inside can't wreck the container |
| 🚫 `.dockerignore` | Fast builds, no secrets/junk copied into images |
| 🏥 Health checks | Docker knows if each service is *actually* working |
| 💾 Persistent volume | Database survives `docker compose down` |
| 🌐 Custom Docker network | Containers talk by name; DB is **not** exposed to the internet |
| 🔐 Environment variables | No passwords baked into images or code |
| 🧪 Dev vs production config | Hot-reload while developing, lean images in production |
| 📋 Container logging | `docker logs` + log rotation, like a real deployment |

---

## 📚 Quick Links

**Follow the guides in order.** Each one builds on the previous.

| # | 📖 Guide | 🎯 What You Do | ⏱️ Est. Time |
|---|---------|----------------|--------------|
| 1 | [🐳 Docker Fundamentals](docs/01-docker-fundamentals.md) | Understand images/containers + install Docker | ~20 min |
| 2 | [🏗️ Project Overview & App](docs/02-project-overview.md) | Create the app you will containerize | ~30 min |
| 3 | [⚡ Backend Dockerfile](docs/03-backend-dockerfile.md) | Multi-stage, non-root backend image | ~20 min |
| 4 | [🎨 Frontend Dockerfile](docs/04-frontend-dockerfile.md) | Build with Node, serve with Nginx | ~25 min |
| 5 | [🌐 Docker Networks](docs/05-docker-networks.md) | Container-to-container communication | ~15 min |
| 6 | [💾 Docker Volumes](docs/06-docker-volumes.md) | Make database data survive restarts | ~15 min |
| 7 | [🎼 Docker Compose](docs/07-docker-compose.md) | Run the whole stack with one command | ~25 min |
| 8 | [🏥 Health Checks](docs/08-health-checks.md) | Smart startup order + self-healing | ~15 min |
| 9 | [📋 Logging & Debugging](docs/09-logging-and-debugging.md) | Read logs, exec into containers, rotate logs | ~15 min |
| 10 | [🧪 Dev vs Production](docs/10-dev-vs-production.md) | Hot reload in dev, lean images in prod | ~20 min |
| 11 | [🚀 Optimization & Security](docs/11-optimization-and-security.md) | Shrink images, lock things down | ~20 min |
| 12 | [🔧 Troubleshooting](docs/12-troubleshooting.md) | Fix the errors everyone hits | ~15 min |
| 13 | [✅ Final Validation](docs/13-final-validation.md) | Full checklist + portfolio write-up | ~15 min |

**Total estimated time:** ~4 hours (including hands-on practice)

---

## 🚀 Quick Start (After Completing the Guides)

Once you finish the guides, your finished project runs anywhere Docker runs:

```bash
# 1. Get the code
git clone <your-repo-url>
cd docker-fullstack-app

# 2. Create your environment file
cp .env.example .env
# → open .env and change the password!

# 3. Start everything
docker compose up --build

# 4. Open the app
# 🌐 http://localhost:8080
```

Stop everything (data is kept in a volume):

```bash
docker compose down
```

Stop and wipe the database too:

```bash
docker compose down -v
```

---

## 📁 Project Structure

```
Dockerized Full-Stack Application/
├── README.md                  ← You are here
├── docs/                      ← The 13-part step-by-step guide
└── docker-fullstack-app/      ← The app you build in Guide 02+
    ├── frontend/              ← React + Nginx (container 1)
    ├── backend/               ← Express API (container 2)
    ├── database/
    │   └── init.sql           ← Table created on first startup
    ├── docker-compose.yml     ← The whole stack in one file
    ├── docker-compose.dev.yml ← Dev overrides (Guide 10)
    ├── .env.example           ← Template for secrets
    └── .gitignore
```

---

## 🎓 What You Will Be Able To Say After This

> *"I containerized a full-stack application with multi-stage builds, non-root
> users, health checks, persistent volumes, and separate dev/production
> configurations — the entire stack starts with `docker compose up`."*

That sentence is exactly what DevOps interviewers want to hear. 🚀
