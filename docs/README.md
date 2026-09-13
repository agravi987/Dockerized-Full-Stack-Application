# 🐳 Dockerized Full-Stack Application — Learning Guide

Learn Docker end-to-end: **build an app → containerize it → test locally → push to Docker Hub → deploy to AWS EC2**. 🚀

---

## 🗺️ The Journey (11 Milestones)

| # | 🏁 Milestone | What you do | ⏱️ Time |
|---|-----------|-------------|------|
| 1 | [🧰 Setup & Docker Basics](01-setup-and-docker-basics.md) | Install Docker Desktop, run your first containers | 25 min |
| 2 | [⚡ Build the Backend](02-build-the-backend.md) | Write a Node/Express API | 25 min |
| 3 | [🎨 Build the Frontend](03-build-the-frontend.md) | Write a React app | 20 min |
| 4 | [📦 Dockerfiles](04-dockerfiles.md) | Turn both apps into Docker images | 35 min |
| 5 | [🌐 Networks & Volumes](05-networks-and-volumes.md) | Make containers talk + data survive | 25 min |
| 6 | [🎼 Docker Compose & Local Test](06-docker-compose-and-local-testing.md) | Run everything with ONE command | 25 min |
| 7 | [🧪 Dev Mode](07-dev-mode.md) | Hot reload — code changes shown instantly | 20 min |
| 8 | [🚢 Push to Docker Hub](08-push-to-docker-hub.md) | Share your images online | 15 min |
| 9 | [🌤️ Deploy to EC2](09-deploy-to-ec2.md) | Put your app on AWS, reachable worldwide | 40 min |
| 10 | [🔒 Domain & HTTPS](10-domain-and-https.md) | Real domain + free SSL (optional) | 35 min |
| 11 | [🛡️ Security & Final Check](11-security-and-final-check.md) | Harden and finish (optional) | 25 min |

**Total: ~5 hours.**

---

## 🎬 The Simple Story (2 minute read)

Here's the whole project in one picture:

```
YOUR LAPTOP (Milestones 1-7)                AWS CLOUD (Milestones 8-9)
┌─────────────────────────────┐            ┌─────────────────────────┐
│ 🖥️ Docker Desktop runs your │            │ ☁️ EC2 Server runs your │
│    containers for testing    │   🚢 push  │    containers for the   │
│                             │ ─────────▶ │    world                 │
│ app at http://localhost:8080│╌╌╌╌╌╌╌╌╌╌╌│ app at http://<your-ip>  │
└─────────────────────────────┘            └─────────────────────────┘
```

Three containers always make up the app:

```
🌐 Browser → 🎨 Frontend (React, port 8080) → ⚡ Backend (Node, port 3000) → 🐘 Database (Postgres)
```

---

## ⚡ Rules for following this guide

1. Do the milestones **in order** — each one builds on the last.
2. Run **every command**. Don't skip the checkpoints.
3. Red/error output is not always failure — the guide says when.
4. If something breaks, Milestone 6 has a debugging section.

---

## 🧭 Important: Dev Mode vs Production Mode

This is the part people get confused by. Here it is up front:

- **Milestones 1-6** are **Production mode** — you build real images and run them. `docker compose up`.
- **Milestone 7** is **Dev mode** — you add DEVELOPMENT ONLY overrides so code changes appear instantly. A separate file + a separate command, `docker compose -f ... up`.
- **Milestones 8-9** (Docker Hub, EC2) use **Production mode only**. The dev stuff never leaves your laptop.

You will NOT need to juggle both at once. Prod first, dev second, and only ever on your laptop.

---

## 📁 The App's File Structure

```
docker-fullstack-app/
├── backend/                  ← Node API (Milestone 2)
│   ├── src/index.js          ← the actual API
│   ├── src/db.js             ← database connection
│   ├── Dockerfile            ← Milestone 4
│   └── package.json
├── frontend/                 ← React app (Milestone 3)
│   ├── src/App.jsx           ← the actual UI
│   ├── Dockerfile            ← Milestone 4
│   ├── nginx.conf            ← Milestone 4
│   └── package.json
├── database/
│   └── init.sql              ← schema (Milestone 6)
├── docker-compose.yml        ← run everything (Milestone 6)
├── docker-compose.dev.yml    ← dev mode only (Milestone 7)
├── .env                      ← real secrets (git-ignored)
└── .env.example              ← template (committed)
```

---

## 🎓 What you'll be able to say at the end

> 💬 *"I containerized a full-stack app, tested it in Docker Desktop, pushed the images to Docker Hub, and deployed it to an AWS EC2 server that anyone can visit."*

---

🚀 **Start here:** [Milestone 1 — Setup & Docker Basics](01-setup-and-docker-basics.md)