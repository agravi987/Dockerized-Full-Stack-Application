# Milestone 1 — Setup & Docker Basics

## Goal

Install Docker Desktop and understand the core ideas so everything after is easy.

---

## Step 1 — Install Docker Desktop

1. Download from: https://www.docker.com/products/docker-desktop/
2. Install and open it (it sets up WSL2 automatically)
3. Wait until the whale icon says **"Docker Desktop is running"**
4. Reboot if prompted

Verify in PowerShell:

```powershell
docker --version
docker compose version
```

You need `Docker version 27+` and `Docker Compose version v2+`.

---

## Step 2 — Install Node.js and Git

Node is needed only to create lockfiles. The containers bring their own Node.

```powershell
# LTS version from https://nodejs.org
node --version    # v20 or higher
git --version     # 2.x or higher
```

---

## Step 3 — The 4 Ideas That Explain Everything

| Idea | What it is | Analogy |
|------|-----------|---------|
| **Dockerfile** | A recipe written in code | 📝 Recipe card |
| **Image** | The recipe built once | 🍰 Baked cake |
| **Container** | A running copy of the image | 🍽️ Plate of cake |
| **Docker Hub** | Where images are stored/shared | 🏪 Cake shop |

One image → many containers. Your container behaves identically on your laptop and on an AWS server.

---

## Step 4 — Run Your First Container

```powershell
docker run hello-world
```

### What just happened:
1. Docker looked for an image called `hello-world`
2. Not found → downloaded it from Docker Hub
3. Built a container from it
4. The container ran, printed a message, exited

That's the entire Docker model.

---

## Step 5 — The 10 Commands You'll Use Daily

```powershell
docker images              # list downloaded images
docker build -t name .     # build an image from a Dockerfile
docker run <image>         # start a container
docker ps                  # list RUNNING containers
docker ps -a               # list all containers (including stopped)
docker logs <name>         # see a container's output
docker exec -it <name> sh  # open a shell inside a container
docker stop <name>         # stop a container
docker rm <name>           # delete a container
docker system prune        # clean up dead stuff
```

### Try it with a real web server:

```powershell
docker run -d --name test-nginx -p 8080:80 nginx:alpine
```

Breakdown:
- `-d` → background
- `--name test-nginx` → friendly name
- `-p 8080:80` → host port 8080 maps to container port 80

Open **http://localhost:8080** — you're serving a website from a container.

Explore and clean up:

```powershell
docker logs test-nginx
docker exec -it test-nginx sh        # look around, then type exit
docker stop test-nginx
docker rm test-nginx
```

---

## Step 6 — Create the Project Folder

Inside this repo, the app lives in the `docker-fullstack-app/` folder:

```powershell
cd docker-fullstack-app
mkdir frontend, backend, database
```

---

## Checkpoint

```
[ ] Docker Desktop runs; docker --version works
[ ] docker compose version works (v2)
[ ] Node and Git installed
[ ] You ran hello-world and an nginx container
[ ] You can explain image vs container from memory
```

---

**Next:** [Milestone 2 — Build the Backend](02-build-the-backend.md)