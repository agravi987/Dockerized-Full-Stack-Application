# 🛡️ Milestone 11 — Security & Final Check *(optional)*

## 🎯 Goal

Harden the server 🔐, prove the project is reproducible from scratch ♻️, and finish with a folder you're proud to show. 🏆

---

## 📝 Step 1 — Verify Container Security Basics

```bash
docker compose exec backend whoami    # → node   (not root) ✅
docker compose exec frontend whoami   # → nginx  (not root) ✅
```

- 👤 Non-root users → small blast radius if a container is compromised
- 🔒 Database has no published port → unreachable from the internet
- 🙈 `.env` never baked into images → credentials passed at runtime only

---

## 📝 Step 2 — Harden SSH (key-only)

```bash
sudo nano /etc/ssh/sshd_config
```

Ensure these are set: ✅

```
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```

```bash
sudo systemctl restart sshd
```

> 🔑 Keep your `.pem` file safe — it's now the only way in.

---

## 📝 Step 3 — Firewall (UFW) 🧱

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Expected:
```
22/tcp    ALLOW  Anywhere      (OpenSSH)
80/tcp    ALLOW  Anywhere
443/tcp   ALLOW  Anywhere
```

---

## 📝 Step 4 — Auto Security Updates 🔄

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
# choose Yes
```

---

## 📝 Step 5 — Docker Log Rotation 🧹

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF

sudo systemctl restart docker
docker compose up -d --force-recreate
```

Keeps every container's logs capped at ~30 MB so disks don't fill. 💽

---

## 📝 Step 6 — The Final Test: Rebuild From Scratch ♻️

A containerized project is done when it works from **only the repo**:

```bash
# 1. Remove everything the project created
docker compose down -v
docker system prune -f

# 2. Confirm a clean slate
docker images        # nothing project-related
docker volume ls     # no db-data

# 3. Pull + run purely from Docker Hub
docker compose pull
docker compose up -d

# 4. Verify
docker compose ps                  # all Up (healthy) ✅
curl http://localhost:8080/api/health
```

If it comes up healthy from nothing but `docker compose pull && up`, your project is **reproducible** — the entire promise of Docker. ✨

---

## ✅ Final Checklist

### 🧱 App & Architecture
```
[ ] ✔️ 3 containers: frontend (Nginx), backend (Node), db (PostgreSQL)
[ ] ✔️ docker compose up starts everything
[ ] ✔️ Multi-stage builds on both app Dockerfiles
[ ] ✔️ Containers run non-root (backend: node, frontend: nginx)
[ ] ✔️ Database has no published ports
[ ] ✔️ Named volume db-data persists data across down/up
```

### 🐳 Docker Practices
```
[ ] ✔️ .dockerignore in backend/ and frontend/
[ ] ✔️ HEALTHCHECK on backend + frontend + db
[ ] ✔️ depends_on: service_healthy for startup order
[ ] ✔️ restart: unless-stopped on all services
[ ] ✔️ Environment via .env (git-ignored) + .env.example (committed)
[ ] ✔️ Dev overrides in docker-compose.dev.yml alone — production untouched
```

### 🌤️ Deployment & Security
```
[ ] ✔️ Deployed to EC2 (Ubuntu 24.04)
[ ] ✔️ App live via images pulled from Docker Hub
[ ] ✔️ SSH: key-only, no password, restricted to My IP
[ ] ✔️ UFW firewall: 22/80/443 only
[ ] ✔️ Unattended security upgrades enabled
[ ] ✔️ Docker log rotation configured
```

### 💰 Cost
```
EC2 t2.micro          → free for 12 months ✨
EBS storage           → free within limits
Domain                → ~$10/year (only real cost)
Let's Encrypt SSL     → always free 🎁
```

---

## 🗺️ Your Final Picture

```
http://yourdomain.com (or your EC2 IP) 🌐
        │
        ▼
EC2 (Ubuntu) — UFW: 22/80/443 🛡️
        │
        ▼ :80
🎨 Frontend Container (nginx) — React SPA + /api proxy
        │
        ▼ :3000
⚡ Backend Container (node) — Express API, non-root
        │
        ▼ :5432 (network only)
🐘 Database Container (postgres) — persistent volume
```

---

## 🎓 What You Can Now Say

> 💬 *"I built a full-stack app, containerized it with multi-stage builds and non-root users, tested it locally in Docker Desktop, pushed the images to Docker Hub, and deployed them to AWS EC2 — where the whole stack starts with `docker compose up`."* 🚀

---

⬅️ **Back to:** [Docs Index](README.md)