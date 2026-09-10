# 📚 Dockerized Full-Stack Application — Guide Series

> **Last Updated:** September 9, 2026

---

## 🎯 What This Guide Does

Takes you from **zero Docker knowledge** to a **fully containerized full-stack application** — with production-grade practices baked in from the start.

**The promise:** at the end, this single command starts your entire application:

```bash
docker compose up
```

---

## 🧠 The One Idea Behind Everything

**A container = your app + everything it needs to run, packaged once, running anywhere.**

Instead of installing Node.js, PostgreSQL, and Nginx on your computer (and hoping a teammate installs the same versions), you describe each piece in a file, and Docker builds and runs them identically on every machine.

| Old Way 😩 | Container Way 😎 |
|-----------|------------------|
| "Works on my machine" | Works on every machine |
| Manual installs, version drift | Version pinned in a `Dockerfile` |
| DB setup documented in a wiki | DB setup is code |
| 20-step deploy doc | `docker compose up` |

---

## ✅ Prerequisites

```text
[ ] 💻 Local computer (Windows, macOS, or Linux)
[ ] ⌨️ Terminal access (Git Bash on Windows works great)
[ ] 🐙 Git installed
[ ] 📦 Node.js v18+ installed locally (only to generate lockfiles — Guide 02)
[ ] 🐳 Docker Desktop (Windows/macOS) or Docker Engine (Linux) — Guide 01
```

> 💡 **Don't have Docker yet?** Guide 01 covers installation step by step.

---

## 📖 Guide Order

**Follow these in order.** Each guide builds on the previous one.

| # | 📖 Guide | 🎯 What You Do | ⏱️ Est. Time |
|---|---------|----------------|--------------|
| 1 | [🐳 Docker Fundamentals](01-docker-fundamentals.md) | Install Docker, learn images vs containers | ~20 min |
| 2 | [🏗️ Project Overview & App](02-project-overview.md) | Create the app: React + Express + PostgreSQL | ~30 min |
| 3 | [⚡ Backend Dockerfile](03-backend-dockerfile.md) | Multi-stage, non-root backend image | ~20 min |
| 4 | [🎨 Frontend Dockerfile](04-frontend-dockerfile.md) | Node build stage → Nginx serve stage | ~25 min |
| 5 | [🌐 Docker Networks](05-docker-networks.md) | Containers talking to each other by name | ~15 min |
| 6 | [💾 Docker Volumes](06-docker-volumes.md) | Persistent database storage | ~15 min |
| 7 | [🎼 Docker Compose](07-docker-compose.md) | The whole stack, one command | ~25 min |
| 8 | [🏥 Health Checks](08-health-checks.md) | Smart startup order + self-healing | ~15 min |
| 9 | [📋 Logging & Debugging](09-logging-and-debugging.md) | Logs, exec, stats, log rotation | ~15 min |
| 10 | [🧪 Dev vs Production](10-dev-vs-production.md) | Two configs, one codebase | ~20 min |
| 11 | [🚀 Optimization & Security](11-optimization-and-security.md) | Small images, hardened containers | ~20 min |
| 12 | [🔧 Troubleshooting](12-troubleshooting.md) | The errors everyone hits, fixed | ~15 min |
| 13 | [✅ Final Validation](13-final-validation.md) | Full checklist + portfolio write-up | ~15 min |

**Total estimated time:** ~4 hours (including hands-on practice)

---

## 🛠️ What You Will Learn

| Skill | Where |
|-------|-------|
| Dockerfile instructions (`FROM`, `COPY`, `RUN`, `CMD`…) | Guides 03–04 |
| Multi-stage builds | Guides 03–04 |
| Non-root containers | Guides 03–04, 11 |
| `.dockerignore` | Guides 03–04 |
| Docker networks + container DNS | Guide 05 |
| Named volumes + persistence | Guide 06 |
| Docker Compose services, env vars, depends_on | Guide 07 |
| Health checks + startup ordering | Guide 08 |
| Container logging + rotation | Guide 09 |
| Compose override files (dev vs prod) | Guide 10 |
| Image optimization + security scanning | Guide 11 |

---

## 🎯 How to Use This Guide

```text
1️⃣  Read each guide top to bottom — don't skip the 💡 Why boxes
2️⃣  Run every command and verify the ✅ checkpoints
3️⃣  Build things in the order given (files → build → test)
4️⃣  If something fails, check Guide 12 (Troubleshooting) first
5️⃣  Don't copy-paste blindly — type the Dockerfiles yourself at least once
```

> **⚠️ Rule:** Never skip a verification step. If a command fails, fix it before continuing — every later guide assumes the earlier ones work.

---

## 📊 Progress Tracker

Use this to track your progress:

```text
Phase 1: Foundations      [ ] Guide 01 — Docker installed & understood
Phase 2: The App          [ ] Guide 02 — App code created
Phase 3: Images           [ ] Guides 03-04 — Backend & frontend Dockerfiles
Phase 4: Docker Concepts  [ ] Guides 05-06 — Networks + volumes hands-on
Phase 5: Orchestration    [ ] Guides 07-08 — Compose + health checks
Phase 6: Operations       [ ] Guides 09-11 — Logging + dev/prod + optimization
Phase 7: Ship It          [ ] Guides 12-13 — Troubleshooting + final validation
```

---

## 🆘 Getting Help

If you get stuck:

1. 📖 Read the **error message** — Docker error messages are usually honest about the problem
2. 📖 Check [🔧 Troubleshooting](12-troubleshooting.md) — your exact error is probably there
3. 🔍 Run `docker compose ps` — is every service `Up`? Is one restarting?
4. 🔍 Run `docker compose logs <service>` — read the last 30 lines

---

**Ready?** Start with [Guide 01 — Docker Fundamentals](01-docker-fundamentals.md) →
