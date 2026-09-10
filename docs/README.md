# 🐳 Dockerized Full-Stack Application — Milestone Guide

> **Last Updated:** September 10, 2026

---

## 🎯 What This Journey Produces

A React + Node.js + PostgreSQL application, containerized with Docker, tested in Docker Desktop, and deployed to AWS EC2 with a real domain and HTTPS.

```
https://yourdomain.com
        │
        ▼
EC2 Instance (Ubuntu) ── host Nginx (SSL)
        │
        ▼ Port 8080
Frontend Container (Nginx) ── proxies /api
        │
        ▼ Port 3000
Backend Container (Node/Express)
        │
        ▼ Port 5432
Database Container (PostgreSQL) ── persistent volume
```

---

## 🗺️ The 11 Milestones

Each milestone is a standalone file with commands, expected output, and a checkpoint. Do them **in order** — every one builds on the last.

| # | 🏁 Milestone | 🎯 What You Complete | ⏱️ Est. |
|---|--------------|----------------------|---------|
| 1 | [Prerequisites & Setup](01-prerequisites-and-setup.md) | Docker Desktop, Node, Git installed; first containers run | ~25 min |
| 2 | [Build the Backend](02-build-the-backend.md) | Express API with `/api/health` + `/api/messages` | ~25 min |
| 3 | [Build the Frontend](03-build-the-frontend.md) | React app calling relative `/api` URLs | ~20 min |
| 4 | [Containerize with Dockerfiles](04-containerize-with-dockerfiles.md) | Multi-stage, non-root images for both apps + Nginx proxy | ~35 min |
| 5 | [Networks & Volumes](05-networks-and-volumes.md) | Containers talk by name; database data survives restarts | ~25 min |
| 6 | [Compose & Local Testing](06-docker-compose-and-local-testing.md) | Whole stack runs with `docker compose up` in Docker Desktop | ~25 min |
| 7 | [Health Checks, Logging & Debugging](07-health-checks-logging-debugging.md) | Self-healing stack + a workflow that fixes any error | ~25 min |
| 8 | [Dev vs Production Config](08-dev-vs-production.md) | Hot reload in dev, lean images in prod, one codebase | ~20 min |
| 9 | [Deploy to EC2](09-deploy-to-ec2.md) | Full stack live on AWS at `http://<ip>` | ~40 min |
| 10 | [Domain Name & HTTPS](10-domain-and-https.md) | Your own domain with a free SSL certificate | ~35 min |
| 11 | [Security & Final Checklist](11-security-hardening-and-final-check.md) | Production hardening + portfolio-grade sign-off | ~25 min |

**Total: ~5 hours** including all hands-on verification.

---

## 🧰 What You Need (Nothing Expensive)

| Item | Cost |
|------|------|
| Windows laptop with ~5 GB free disk | Already yours |
| Docker Desktop (free) | $0 |
| AWS account (free tier: t2.micro + 30 GB EBS) | $0 for 12 months |
| A domain name (optional but recommended) | ~$10/year |

---

## 🚀 How to Use This Guide

```text
1. Open the milestone file for where you are
2. Run every command — don't skip the verification steps
3. Red text ≠ failure. Expected errors are labeled as such.
4. Hit a wall? Milestone 07 has a debugging ladder that fixes anything.
5. Finish each file's ✅ Checkpoint before moving on.
```

### 🇳🇵 Nepali One-Liners

Every hard concept has a **one-line Nepali explanation** (marked with the flag 🇳🇵) — read it first, then the English details make more sense.

```text
💡 Example:  Image = recipe, Container = baked cake
             (नेपाली व्याख्या = तपाईंको बुझाइको शुरुवात)
```

> ✅ **Verified stack:** every command and config file in this guide was
> actually built and tested on Docker Desktop (docker-engine 29, Ubuntu-based
> images). The production stack came up `healthy`, the dev mode hot-reloaded
> correctly, and data survived `docker compose down`.

---

## 📁 Project Structure You'll Build

```
docker-fullstack-app/
├── frontend/
│   ├── src/                ← React source
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── index.js
│   │   └── db.js
│   ├── Dockerfile
│   └── package.json
├── database/
│   └── init.sql
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env                    ← real secrets (git-ignored)
├── .env.example            ← template (committed)
└── .gitignore
```

---

## 🎓 What You'll Be Able to Say After This

> *"I containerized a full-stack app with multi-stage builds, non-root users,
> health checks, and persistent volumes — then deployed it to AWS EC2 behind a
> real domain with HTTPS via Let's Encrypt. The whole stack starts with
> `docker compose up`."*

---

**Start here:** [Milestone 1 — Prerequisites & Setup](01-prerequisites-and-setup.md) →