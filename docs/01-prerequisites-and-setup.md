# Milestone 1 — 🧰 Prerequisites & Setup

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Install everything, understand what Docker actually is, run your first containers, and create the project skeleton.

## ✅ Prerequisites

```text
[ ] 💻 Windows laptop with terminal access (PowerShell)
[ ] ⌨️ Admin rights to install software
[ ] ~5 GB free disk space
```

---

## 🧠 What Docker Solves

Without Docker, every machine that runs your app needs the exact same versions installed by hand:

```
Your laptop:  Node 20, Postgres 16, Nginx 1.27  ✅ works
Teammate:     Node 18, Postgres 14, Nginx 1.18  💥 breaks
Your server:  ???                               😱 good luck
```

Docker packages **your code + everything it needs** into one immutable unit:

```text
Image = your code + runtime + libraries + system tools + config
```

| Concept | Analogy | One-liner |
|---------|---------|-----------|
| 🖼️ **Image** | A recipe 🍰 | Read-only template with your app inside |
| 📦 **Container** | The cake 🎂 | A *running instance* of an image |

> 🇳🇵 **सरल व्याख्या:** Image भनेको "पकवान बनाउने विधि (recipe)" हो, container भनेको त्यही विधिबाट बनेको चलिरहेको cake — एउटै विधिबाट जतिवटा cake चाहिन्छ बनाउन सकिन्छ।

One image → many containers. Your code built once → runs identically on your laptop, Docker Desktop, and EC2.

---

## 📝 Step 1 — Install Docker Desktop

1. Download: https://www.docker.com/products/docker-desktop/
2. Install and launch it — it sets up WSL2 automatically
3. Reboot if prompted
4. Wait until the whale 🐳 icon shows **"Docker Desktop is running"**

Verify in PowerShell:

```powershell
docker --version
# Docker version 27.x.x

docker compose version
# Docker Compose version v2.x.x
```

---

## 📝 Step 2 — Install Node.js (for lockfiles)

Download the **LTS** version from https://nodejs.org.

```powershell
node --version   # v20.x.x or higher
npm --version    # 10.x.x or higher
```

> 💡 Node is only needed once, to generate `package-lock.json`. The containers themselves bring their own Node.

---

## 📝 Step 3 — Install Git

```powershell
winget install Git.Git
```

Verify:

```powershell
git --version   # git version 2.x.x
```

---

## 📝 Step 4 — Run Your First Container

```powershell
docker run hello-world
```

**What just happened:**

```text
1. Docker looked for a local image called "hello-world"
2. Didn't find it → pulled it from Docker Hub
3. Created a container from the image
4. The container ran, printed a message, and exited
```

That one command used every core Docker concept.

---

## 📝 Step 5 — Learn the 10 Commands You'll Use Daily

```powershell
docker images              # list images
docker pull <image>        # download an image
docker build -t <name> .   # build an image from a Dockerfile
docker run <image>         # create + start a container
docker ps                  # list running containers
docker ps -a               # ...including stopped ones
docker logs <name>         # see a container's output
docker exec -it <name> sh  # open a shell inside
docker stop <name>         # stop gracefully
docker rm <name>           # delete a container
docker system prune        # clean up dead containers + dangling images
```

### Run a real web app in a container

```powershell
docker run -d --name test-nginx -p 8080:80 nginx:alpine
```

```text
-d           → detached (background)
--name       → friendly name
-p 8080:80   → host port 8080 → container port 80
```

Open **http://localhost:8080** — you've just served a website from a container.

Explore and clean up:

```powershell
docker logs test-nginx
docker exec -it test-nginx sh      # ls /usr/share/nginx/html, then exit
docker stop test-nginx
docker rm test-nginx
```

---

## 📝 Step 6 — Create the Project Skeleton

```powershell
mkdir D:\docker-fullstack-app
cd D:\docker-fullstack-app

mkdir frontend, backend, database
```

Your starting point:

```
docker-fullstack-app/
├── frontend/      ← React app (Milestone 3)
├── backend/       ← Express API (Milestone 2)
├── database/      ← init.sql (Milestone 6)
└── docker-compose.yml, .env, ... (Milestones 6+)
```

---

## ✅ Checkpoint

```text
[ ] Docker Desktop running; docker --version works
[ ] docker compose version works (the plugin, v2.x)
[ ] Node + Git installed
[ ] You ran hello-world and an nginx container
[ ] You can name the 10 core commands from memory
[ ] D:\docker-fullstack-app with frontend/, backend/, database/ exists
```

---

## 💡 Common Beginner Mistakes

| Mistake | Symptom | Fix |
|---------|---------|-----|
| Old standalone `docker-compose` | `docker compose` fails | Update Docker Desktop → use the plugin |
| Forgetting Docker Desktop must run | "cannot connect to the Docker daemon" | Start it and wait for the whale icon |
| `docker system prune` on live data | Data loss (later) | Safe now — never prune volumes casually |

---

**Next:** [Milestone 2 — Build the Backend](02-build-the-backend.md) →