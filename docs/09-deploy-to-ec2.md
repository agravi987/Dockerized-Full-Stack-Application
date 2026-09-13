# Milestone 9 — Deploy to EC2

## Goal

Take the images you pushed in Milestone 8 and run them on an Amazon EC2 server, reachable from anywhere.

---

## The Plan

```
Your images (Docker Hub) ──pull──▶ EC2 server (Ubuntu + Docker) ──▶ http://<public-ip>
```

On EC2 you do NOT rebuild images from source. You **pull the ready-made images** you pushed. That's the point of Docker Hub.

---

## Step 1 — Launch the Instance

1. AWS Console → **EC2** → **Launch Instance**
2. **Name:** `docker-fullstack-app`
3. **OS image (AMI):** Ubuntu 24.04 LTS (Free tier eligible)
4. **Instance type:** `t2.micro` (free tier: 1 vCPU, 1 GB RAM)
5. **Key pair:** Create new → name it `docker-app-key` → download the `.pem` — **you can't download it again** → save to `C:\Users\<you>\.ssh\docker-app-key.pem`
6. **Network settings / Security group:**

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | My IP | log in (restricted to your IP) |
| Custom TCP | 8080 | 0.0.0.0/0 | website traffic (Milestone 10 moves it to port 80) |

7. **Configure storage:** 12 GB (free tier gives you 30)
8. Click **Launch Instance** and wait 2-3 minutes.

> 💡 If you ever get "out of memory" on this size, `t2.small` (2 GB RAM) costs ~$0.023/hr.

---

## Step 2 — Connect via SSH

From PowerShell:

```powershell
cd C:\Users\<you>\.ssh
ssh -i "docker-app-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

Find the public IP in EC2 Console → your instance → **Public IPv4 address**. Type `yes` for the fingerprint. You should see a `ubuntu@ip-...` prompt.

---

## Step 3 — Install Docker on EC2

Run **one command at a time**:

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg

sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker
```

Verify:
```bash
docker --version        # 27.x
docker compose version  # v2.x
```

---

## Step 4 — Login to Docker Hub and Pull

```bash
docker login
docker pull <your-dockerhub-username>/fullstack-backend:latest
docker pull <your-dockerhub-username>/fullstack-frontend:latest
```

---

## Step 5 — Create the Compose File on the Server

Now write a compose file that uses the **pulled images** (not local builds):

```bash
mkdir ~/docker-fullstack-app
cd ~/docker-fullstack-app
nano docker-compose.yml
```

Paste this (change the username):

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: <STRONG-PASSWORD>
      POSTGRES_DB: appdb
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  backend:
    image: <your-dockerhub-username>/fullstack-backend:latest
    environment:
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: appuser
      DB_PASSWORD: <STRONG-PASSWORD>
      DB_NAME: appdb
      PORT: 3000
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    image: <your-dockerhub-username>/fullstack-frontend:latest
    depends_on:
      - backend
    ports:
      - "8080:8080"
    restart: unless-stopped

volumes:
  db-data:
```

Notes:
- Same `<STRONG-PASSWORD>` for both `POSTGRES_PASSWORD` and `DB_PASSWORD` (they must match).
- The database has **no public port** — only the frontend on port 8080 is public.
- Milestone 10 removes the `:8080` from the URL with a host Nginx on port 80.

Exit and save: `Ctrl+X`, `Y`, `Enter`.

---

## Step 6 — Run It!

```bash
docker compose up -d
```

Verify:
```bash
docker compose ps
# db / backend / frontend — all Up (healthy)

curl http://localhost/api/health
curl -X POST http://localhost/api/messages -H "Content-Type: application/json" -d '{"name":"EC2","message":"Deployed!"}'
curl http://localhost/api/messages
```

---

## Step 7 — Open It in the Browser

Go to **http://<YOUR_EC2_PUBLIC_IP>:8080** — your app is live worldwide.

If it doesn't load:
1. `docker compose ps` — all Up?
2. `docker compose logs --tail 50` — any errors?
3. Security group allows port 8080 from `0.0.0.0/0`?

---

## Step 8 — Server Maintenance Commands

```bash
cd ~/docker-fullstack-app

docker compose ps                          # status
docker compose logs --tail 100 backend     # what happened
docker system prune -f                     # clean dead containers/images
docker compose up -d                       # restart after a reboot-crash
```

To update the app later: re-pull the new image and recreate.

```bash
docker compose pull
docker compose up -d
```

---

## Checkpoint

```
[ ] EC2 launched (Ubuntu 24.04, t2.micro, key pair saved)
[ ] Security group: SSH(22) to My IP, Custom TCP 8080 public
[ ] Docker + Compose installed on the server
[ ] Images pulled from YOUR Docker Hub account
[ ] docker compose up -d → all Up (healthy)
[ ] App live at http://<PUBLIC_IP>:8080
```

---

## Troubleshooting on a Fresh Server

| Error | Cause | Fix |
|-------|-------|-----|
| Can't reach the site | Security group missing port 8080 | Add Custom TCP 8080 inbound from 0.0.0.0/0 |
| `permission denied while trying to connect to the Docker daemon` | User not in docker group | `newgrp docker` or log out/in |
| Backend crash-loops | Password mismatch | Make POSTGRES_PASSWORD = DB_PASSWORD, then `down -v && up -d` |
| `docker: command not found` | Docker install incomplete | Re-run Step 3 commands |

---

**Next:** [Milestone 10 — Domain & HTTPS](10-domain-and-https.md) *(optional)*