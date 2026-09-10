# 🐳 Dockerized Full-Stack Application

> **Last Updated:** September 10, 2026
> **Portfolio Project 2 — Containerized React + Node.js + PostgreSQL**

---

## 🎯 Project Overview

Take a full-stack web application and make it **fully reproducible with one command**:

```bash
docker compose up
```

No "install Node on your machine", no "install PostgreSQL locally" — everything runs in containers. Then deploy it to AWS EC2 behind your own domain with HTTPS.

```text
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
              │  Container :3000 │  (non-root user)
              └────────┬─────────┘
                       │  SQL over :5432
                       ▼
              ┌──────────────────┐
              │  🐘 PostgreSQL   │  Data persisted in a Docker volume
              │  Container :5432 │  (not exposed to the internet)
              └──────────────────┘
```

---

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| 🎨 Frontend | React 19 (Vite 8) | User interface |
| 🔷 Web Server | Nginx 1.27 (unprivileged `nginx` user) | Serves frontend + reverse-proxies `/api` |
| ⚡ Backend | Node.js 22 / Express 5 | REST API (unprivileged `node` user) |
| 🐘 Database | PostgreSQL 16 | Data storage |
| 🐳 Containers | Docker + Docker Compose | Everything above, reproducible |

---

## ✨ What Makes This "Real World" (Not a Toy)

| Practice | Why It Matters |
|----------|----------------|
| 🧱 Multi-stage builds (with named `--target`s) | Small production images (no build tools inside) |
| 👤 Non-root containers | Security — even the app inside can't wreck the container |
| 🚫 `.dockerignore` | Fast builds, no secrets/junk copied into images |
| 🏥 Health checks (`127.0.0.1`, IPv6-safe) | Docker knows if each service is *actually* working |
| 💾 Persistent volume | Database survives `docker compose down` |
| 🌐 Custom Docker network | Containers talk by name; DB is **not** exposed to the internet |
| 🔐 Environment variables | No passwords baked into images or code |
| 🧪 Dev vs production config | Hot-reload while developing, lean images in production |
| 🌤️ Real deployment | EC2 + domain + free HTTPS via Let's Encrypt |

---

## 📚 The 11 Milestones

Follow them **in order**. Each one builds on the previous, has runnable commands, and ends with a checkpoint.

| # | 🏁 Milestone | ⏱️ |
|---|--------------|-----|
| 1 | [Prerequisites & Setup](docs/01-prerequisites-and-setup.md) | ~25 min |
| 2 | [Build the Backend](docs/02-build-the-backend.md) | ~25 min |
| 3 | [Build the Frontend](docs/03-build-the-frontend.md) | ~20 min |
| 4 | [Containerize with Dockerfiles](docs/04-containerize-with-dockerfiles.md) | ~35 min |
| 5 | [Networks & Volumes](docs/05-networks-and-volumes.md) | ~25 min |
| 6 | [Compose & Local Testing](docs/06-docker-compose-and-local-testing.md) | ~25 min |
| 7 | [Health Checks, Logging & Debugging](docs/07-health-checks-logging-debugging.md) | ~25 min |
| 8 | [Dev vs Production Config](docs/08-dev-vs-production.md) | ~20 min |
| 9 | [Deploy to EC2](docs/09-deploy-to-ec2.md) | ~40 min |
| 10 | [Domain Name & HTTPS](docs/10-domain-and-https.md) | ~35 min |
| 11 | [Security & Final Checklist](docs/11-security-hardening-and-final-check.md) | ~25 min |

**Total: ~5 hours** including hands-on practice. Every concept has a 🇳🇵 Nepali one-liner.

---

## 🚀 Quick Start (After Milestone 6)

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
├── docs/                      ← The 11-part step-by-step milestone guide
└── docker-fullstack-app/      ← The app you build in Milestone 2+
    ├── frontend/              ← React + Nginx (container 1)
    │   ├── Dockerfile         ← multi-stage: build (node) → serve (nginx) → dev
    │   └── nginx.conf         ← SPA routing + /api proxy to backend:3000
    ├── backend/               ← Express API (container 2)
    │   └── Dockerfile         ← multi-stage: deps → prod-deps → runtime → dev
    ├── database/
    │   └── init.sql           ← Table created on first startup
    ├── docker-compose.yml     ← The whole stack in one file (prod targets)
    ├── docker-compose.dev.yml ← Dev overrides: bind mounts + hot reload
    ├── .env.example           ← Template for secrets (committed)
    ├── .env                   ← Real secrets (git-ignored)
    └── .gitignore
```

---

## 🎓 What You Will Be Able To Say After This

> *"I containerized a full-stack application with multi-stage builds, non-root
> users, health checks, persistent volumes, and separate dev/production
> configurations — then deployed it to AWS EC2 behind a real domain with
> HTTPS. The whole stack starts with `docker compose up`."*

That sentence is exactly what DevOps interviewers want to hear. 🚀