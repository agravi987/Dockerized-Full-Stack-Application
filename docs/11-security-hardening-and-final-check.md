# Milestone 11 — 🔒 Security & Final Checklist

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Harden the EC2 deployment, prove the project is genuinely reproducible, and walk away with a portfolio-grade, interview-ready finish.

## ✅ Prerequisites

```text
[ ] ✅ Milestones 1–10 (live site at https://yourdomain.com)
```

---

## 🧠 Your Threat Model (Briefly)

```text
Your containers run code that handles untrusted input (the internet).
If one service is compromised, what can the attacker reach?

Non-root users        → small blast radius inside the container
DB not published      → database unreachable from outside Docker network
No secrets in images  → .env never COPY'd, passed at runtime
Pinned base images    → no surprise vulnerable versions
Health checks         → failures are detected, not silent
HTTPS                 → traffic encrypted in transit
```

> 🇳🇵 **Saral Byakhya:** Security bhaneko gharko dhoka-jhyal bandha garera taala lagaune ho — non-root user (simit adhikaar), bandha database (bahira dekhidaina), firewall (nachahine port bandha), ra HTTPS (data chorna nasakne) — yi sabai tahako suraksha.

---

## 📝 Step 1 — Verify the Container Security Basics

```bash
docker compose exec backend whoami    # → node
docker compose exec frontend whoami   # → nginx
docker compose exec db whoami         # → root
```

> 💡 The Postgres image initializes as root, then drops to the `postgres` user internally. Since the DB has **no published ports and no host mounts**, its exposure is minimal. Knowing *why* it's acceptable is the interview point.

Confirm secrets never baked into images:

```bash
docker history fullstack-backend:1.0 | grep -i env
# no .env layers — credentials are runtime-only via Compose
```

---

## 📝 Step 2 — Scan Images for Vulnerabilities (Optional, Strong Signal)

Install [Trivy](https://github.com/aquasecurity/trivy) on your laptop, then:

```powershell
trivy image fullstack-backend:1.0
trivy image fullstack-frontend:1.0
```

```text
backend:  expect a few low/medium CVEs from alpine + node — normal
frontend: should be nearly clean — just nginx + static files
```

What to do with findings:

```text
CRITICAL/HIGH in your deps     → npm audit fix / bump versions
CRITICAL/HIGH in the base      → bump the base tag (node:22-alpine moves forward)
LOW/noise                      → note them; don't chase zero
```

> 💡 "I scan images with Trivy in CI and fail on CRITICAL" is a strong interview line — even a manual scan shows the habit.

---

## 📝 Step 3 — Harden SSH

Only key-based login, no root password login:

```bash
sudo nano /etc/ssh/sshd_config
```

Ensure:

```text
PasswordAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
```

```bash
sudo systemctl restart sshd
```

> ⚠️ Keep your `.pem` file safe — it's now the only way in.

---

## 📝 Step 4 — Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

```text
22/tcp            ALLOW  Anywhere (OpenSSH)
80/tcp            ALLOW  Anywhere
443/tcp           ALLOW  Anywhere
```

---

## 📝 Step 5 — Auto Security Updates

```bash
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
# → select Yes
```

---

## 📝 Step 6 — Docker Log Rotation on the Server

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
docker compose up -d --force-recreate   # recreate so containers pick it up
```

Keeps every container's logs capped at ~30 MB.

---

## 📝 Step 7 — The Ultimate Test: Clean Rebuild From Scratch

A containerized project isn't "done" until it works from nothing but the repo. Do this on a **staging copy** (or accept you'll need to re-create a message or two):

```bash
# 1. Remove everything the project created
docker compose down -v
docker system prune -f

# 2. Confirm a clean slate
docker images        # nothing project-related left
docker volume ls     # db-data gone

# 3. Rebuild purely from committed files
cp .env.example .env   # (edit the password again)
docker compose up --build

# 4. Verify from zero
docker compose ps                    # all Up (healthy)
curl http://localhost:8080/api/health
```

If the whole stack comes up healthy from nothing but the repository, **the project is reproducible** — the entire promise of Docker, delivered.

---

## 📝 Step 8 — Push to GitHub (If Not Already)

```bash
git init
git add .
git status        # ⚠️ verify .env is NOT listed — only .env.example
git commit -m "Dockerized full-stack app with EC2 deployment"
git remote add origin https://github.com/<you>/docker-fullstack-app.git
git branch -M main
git push -u origin main
```

> ⚠️ Double-check `.env` before pushing. If it was ever committed, rotate those passwords — git history keeps secrets.

---

## ✅ Final Checklist

### Application & Architecture

```text
[ ] 3 containers: frontend (Nginx), backend (Node), db (PostgreSQL)
[ ] docker compose up starts everything from zero
[ ] Multi-stage builds on both app Dockerfiles
[ ] All containers run non-root (backend: node, frontend: nginx)
[ ] Database has no published ports
[ ] Named volume db-data persists data across down/up
```

### Docker Practices

```text
[ ] .dockerignore in backend/ and frontend/ (no .env, no node_modules)
[ ] HEALTHCHECK in backend + frontend; healthcheck on db service
[ ] depends_on: service_healthy for startup ordering
[ ] restart: unless-stopped on all services
[ ] Base images pinned (node:22-alpine, nginx:1.27-alpine, postgres:16-alpine)
[ ] Environment via .env (git-ignored) + .env.example (committed)
[ ] Dev overrides via docker-compose.dev.yml — prod untouched
```

### Deployment & Security

```text
[ ] Deployed to EC2 (Ubuntu 24.04, Docker + Compose)
[ ] Live at https://yourdomain.com with a valid Let's Encrypt cert
[ ] http → https redirect working
[ ] certbot renew --dry-run passes
[ ] SSH: key-only, no password, restricted to My IP
[ ] UFW firewall: 22/80/443 only
[ ] Unattended security upgrades enabled
[ ] Docker log rotation configured (10m × 3)
[ ] Trivy scan run; criticals addressed or understood
```

### Cost to Operate (AWS Free Tier)

```text
EC2 t2.micro            → free for 12 months
EBS 30 GB               → free for 12 months
Data transfer           → free tier limits
Domain                  → ~$10/year (your only real cost)
Let's Encrypt SSL       → always free
```

---

## 🎓 What You Can Now Say

> *"I containerized a full-stack application with multi-stage builds — cutting
> images from ~1.1 GB to ~180 MB — using non-root users, health checks,
> persistent volumes, and separate dev/prod Compose configs. I deployed it to
> AWS EC2 behind a real domain with HTTPS via Let's Encrypt, a locked-down
> security group, key-only SSH, and a UFW firewall. The whole stack starts
> with `docker compose up`."*

---

## 🚀 Optional Next Steps

```text
[ ] Push images to Docker Hub / GHCR with version tags
[ ] CI pipeline (GitHub Actions): lint → build → Trivy scan on every push
[ ] GitHub Actions deploy: SSH into EC2 → git pull → compose up
[ ] Move host Nginx INTO the compose stack (Caddy or nginx-proxy) 
[ ] Add an /api rate limit in nginx.conf
[ ] Swap postgres app password for AWS Secrets Manager
[ ] Migrate the whole stack to Kubernetes (Volume 2) 😄
```

---

## 🗺️ The Final Deployed Picture

```
https://yourdomain.com  (Let's Encrypt SSL)
        │
        ▼
EC2 (Ubuntu 24.04) — UFW: 22/80/443, key-only SSH
        │
        ├── Host Nginx :80/:443 (SSL termination + redirect)
        │
        ▼ :8080
        Frontend Container (nginx) — React SPA + /api proxy
        │
        ▼ :3000
        Backend Container (node) — Express API, non-root
        │
        ▼ :5432 (network only)
        Database Container (postgres) — persistent db-data volume
```

From zero Docker knowledge to a reproducible, health-checked, persistent, non-root, HTTPS-enabled full-stack deployment on AWS — in 11 milestones. That's a genuinely strong portfolio piece. 🎉

---

**Back to:** [Docs Index](README.md)