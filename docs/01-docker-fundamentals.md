# 01 — 🐳 Docker Fundamentals

> **Last Updated:** September 9, 2026

---

## 🎯 Goal

Understand what Docker actually is (not just buzzwords), install it, and run your first containers.

## ✅ Prerequisites

```text
[ ] 💻 Local computer with terminal access
[ ] ⌨️ Admin rights to install software
[ ] ~5 GB free disk space
```

---

## 🧠 The Mental Model

### What problem does Docker solve?

Without containers, running an app means installing its runtime, its database, its web server — with **the exact right versions** — on every machine that touches it.

```
Your laptop:  Node 20, Postgres 16, Nginx 1.27  ✅ works
Teammate:     Node 18, Postgres 14, Nginx 1.18  💥 breaks
Server:       ???                                😱 good luck
```

Docker fixes this by packaging the app **together with everything it needs**:

```
Image = your code + runtime (Node) + libraries + system tools + config
```

### Image vs Container (the #1 beginner confusion)

| Concept | Analogy | One-liner |
|---------|---------|-----------|
| 🖼️ **Image** | A recipe 🍰 | Read-only template with your app inside |
| 📦 **Container** | The cake 🎂 | A *running instance* of an image |

```text
One image  →  can run many containers
Your code  →  built ONCE into an image
That image →  runs the SAME on your laptop, CI, and the cloud
```

### The three files you will live in

| File | What it does |
|------|--------------|
| `Dockerfile` | Recipe for building **one image** (per service) |
| `docker-compose.yml` | Defines **all services** and how they connect |
| `.dockerignore` | Files Docker should NOT copy into images |

---

## 📝 Step 1 — Install Docker

### Windows / macOS

1. Download **Docker Desktop**: https://www.docker.com/products/docker-desktop/
2. Install and launch it
3. Wait until the whale 🐳 icon shows **"Docker Desktop is running"**

> 💡 **Windows:** Docker Desktop uses WSL2 — the installer sets it up automatically. You may be asked to reboot.

### Linux (Ubuntu/Debian)

```bash
# Remove old versions
sudo apt-get remove docker docker-engine docker.io containerd runc

# Install from Docker's official repository
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Run docker without sudo (log out & back in after this)
sudo usermod -aG docker $USER
```

### Verify the installation

```bash
docker --version
```

Expected: `Docker version 27.x.x` (or newer)

```bash
docker compose version
```

Expected: `Docker Compose version v2.x.x`

> ⚠️ If `docker compose` fails but `docker-compose` works, you have the old standalone tool. Use the plugin (`docker compose`, no hyphen) or update Docker.

---

## 📝 Step 2 — Run Your First Container

```bash
docker run hello-world
```

**What just happened (this is important):**

```text
1. Docker looked for a local image called "hello-world"
2. Didn't find it → pulled it from Docker Hub (the public registry)
3. Created a container from the image
4. The container ran, printed a message, and exited
```

You just used every core Docker concept in one command. 🎉

---

## 📝 Step 3 — Understand Images

### Pull a specific version (tag)

```bash
docker pull node:20-alpine
```

> 💡 The part after `:` is a **tag** — the version. `20-alpine` = Node.js 20 on Alpine Linux (tiny image). **Never rely on `latest`** in real projects; pin versions.

### List your images

```bash
docker images
```

Expected output shape:

```text
REPOSITORY     TAG          IMAGE ID       SIZE
node           20-alpine    xxxxxxxxxxxx   ~130MB
hello-world    latest       xxxxxxxxxxxx   ~10kB
```

### Inspect what's inside an image

```bash
docker history node:20-alpine
```

This shows every layer (every build step) that makes up the image — you'll see how each Dockerfile instruction adds a layer.

---

## 📝 Step 4 — Run a Real Container

```bash
docker run -d --name test-nginx -p 8080:80 nginx:alpine
```

Breaking it down:

```text
-d           →  detached (runs in background)
--name       →  give it a friendly name
-p 8080:80   →  map host port 8080 → container port 80
```

### Check it's running

```bash
docker ps
```

Expected:

```text
CONTAINER ID   IMAGE         STATUS         PORTS                 NAMES
abc123...      nginx:alpine  Up 5 seconds   0.0.0.0:8080->80/tcp  test-nginx
```

Open **http://localhost:8080** in your browser — you should see the Nginx welcome page. 🎉

### Talk to the container

```bash
# See its output
docker logs test-nginx

# Open a shell inside it
docker exec -it test-nginx sh
ls /usr/share/nginx/html    # the files it's serving
exit
```

### Clean up

```bash
docker stop test-nginx
docker rm test-nginx
```

---

## 📝 Step 5 — Learn the Essential Commands

You only need ~10 commands for 95% of daily work:

```bash
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
docker rmi <image>         # delete an image
docker system prune        # clean up stopped containers, dangling images
```

> ⚠️ `docker system prune` deletes unused data — safe now, but be careful later once you have volumes with real data.

---

## ✅ Checkpoint

Before moving on, you should be able to:

```text
[ ] Explain the difference between an image and a container
[ ] Run a container with port mapping and see it in the browser
[ ] View a container's logs and open a shell inside it
[ ] List, stop, and remove containers and images
```

---

## 💡 Why This Matters for This Project

In the coming guides you'll build **your own images** for frontend, backend, and database — instead of pulling `nginx` off the shelf. Everything you just practiced (`run`, `ps`, `logs`, `exec`) will be your daily toolkit for debugging that stack.

---

**Next:** [Guide 02 — Project Overview & App](02-project-overview.md) →
