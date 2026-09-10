# Milestone 9 — 🌤️ Deploy to EC2

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Move the stack from your laptop to a real Linux server on AWS EC2 — reachable from anywhere in the world.

## ✅ Prerequisites

```text
[ ] ✅ Milestones 1–8 (working stack in Docker Desktop)
[ ] 📧 AWS account (aws.amazon.com — free tier eligible)
[ ] 🔑 A domain is optional for this milestone (Milestone 10 adds it)
```

---

## 🧠 Why EC2

EC2 is a virtual machine in AWS's cloud. It runs Ubuntu, where Docker is a first-class citizen — exactly what your stack needs. It's also the most common "I deployed Docker to a server" interview story.

> 🇳🇵 **सरल व्याख्या:** Security group भनेको EC2 को आगो पर्खाल हो — कुन पोर्ट (22, 80, 443) कसले खोल्न पाउँछ भन्ने नियम। SSH (22) लाई तपाईंको आफ्नै IP मा मात्र खोल्नु बुद्धिमानी हो।

---

## 📝 Step 1 — Launch the Instance

1. AWS Console → **EC2 Dashboard** → **Launch Instance**

2. **Name:** `docker-fullstack-app`

3. **AMI (OS):** Ubuntu Server 24.04 LTS (Free tier eligible)

4. **Instance type:** `t2.micro` (Free tier — 1 vCPU, 1 GB RAM)
   > ⚠️ 1 GB RAM is tight. If you see out-of-memory errors, move up to `t2.small` (2 GB, ~$0.023/hr).

5. **Key pair:** Create a new one
   - Name: `docker-app-key`
   - Download the `.pem` file — **you cannot download it again**
   - Save it to `C:\Users\YourName\.ssh\docker-app-key.pem`

6. **Network settings — Security Group:**

   | Type | Port | Source | Purpose |
   |------|------|--------|---------|
   | SSH | 22 | My IP | Secure shell access |
   | HTTP | 80 | 0.0.0.0/0 | Website traffic (add now; used in Milestone 10) |
   | HTTPS | 443 | 0.0.0.0/0 | Secure traffic (add now) |

7. **Storage:** 12 GB (default). Free tier gives you 30 GB.

8. Click **Launch Instance**. Wait 2–3 minutes for initialization.

---

## 📝 Step 2 — Connect via SSH

From PowerShell:

```powershell
cd C:\Users\YourName\.ssh
ssh -i "docker-app-key.pem" ubuntu@<YOUR_EC2_PUBLIC_IP>
```

Find the public IP in EC2 Console → **Instance summary** → **Public IPv4 address**.

Accept the fingerprint with `yes`. You should see:

```
Welcome to Ubuntu 24.04.x LTS ...
ubuntu@ip-172-31-xx-xx:~$
```

---

## 📝 Step 3 — Install Docker on EC2

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
newgrp docker   # apply group change for this session
```

Verify:

```bash
docker --version       # Docker version 27.x.x
docker compose version # Docker Compose version v2.x.x
```

---

## 📝 Step 4 — Get Your Code onto EC2

**Option A — Git (recommended):** push the repo first, then:

```bash
git clone https://github.com/yourusername/docker-fullstack-app.git
cd docker-fullstack-app
```

**Option B — SCP (from your laptop):**

```powershell
scp -i "C:\Users\YourName\.ssh\docker-app-key.pem" -r "D:\docker-fullstack-app\*" ubuntu@<YOUR_EC2_PUBLIC_IP>:~/docker-fullstack-app
```

---

## 📝 Step 5 — Set Up `.env` on the Server

```bash
cd ~/docker-fullstack-app

cp .env.example .env
nano .env
```

Set the SAME strong password for `POSTGRES_PASSWORD` and `DB_PASSWORD`. Use a fresh, strong value — not your dev laptop password.

> ⚠️ Never commit this file. `.env` is git-ignored; only `.env.example` is in the repo.

---

## 📝 Step 6 — Deploy!

```bash
docker compose up --build -d
```

Verify:

```bash
docker compose ps
# db / backend / frontend — Up (healthy)

# From the server itself:
curl http://localhost:8080/api/health

curl -X POST http://localhost:8080/api/messages \
  -H "Content-Type: application/json" \
  -d '{"name":"EC2","message":"Deployed!"}'

curl http://localhost:8080/api/messages
```

---

## 📝 Step 7 — Open It in the Browser

`http://<YOUR_EC2_PUBLIC_IP>:8080`

> 💡 If it doesn't load:
> 1. Did you allow inbound **8080** in the security group? (Add a temporary rule if needed.)
> 2. `docker compose ps` — all Up?
> 3. `docker compose logs` for errors.

---

## 📝 Step 8 — Serve It on Port 80 (No `:8080`)

People shouldn't type ports. Install a host-level Nginx as the front door:

```bash
sudo apt-get install -y nginx
sudo nano /etc/nginx/sites-available/default
```

Replace the file contents:

```nginx
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo nginx -t                  # test the config
sudo systemctl restart nginx
```

Now visit:

```
http://<YOUR_EC2_PUBLIC_IP>
```

No port number. 👍

---

## 📝 Step 9 — Useful Server Maintenance Commands

```bash
cd ~/docker-fullstack-app

docker compose ps                                  # status
docker compose logs --tail 100 backend             # what happened
docker compose up --build -d                       # deploy new code
docker compose down                                # stop (data kept)
docker system prune -f                             # clean dead containers/images

# Update code (if using git):
git pull
docker compose up --build -d
```

---

## ✅ Checkpoint

```text
[ ] EC2 instance launched (Ubuntu 24.04, t2.micro, key pair saved)
[ ] Security group: SSH(22) + HTTP(80) + HTTPS(443), SSH locked to My IP
[ ] Docker + Compose installed and verified on the server
[ ] Code on the server via git clone or scp
[ ] docker compose up --build -d → all three Up (healthy)
[ ] App reachable at http://<PUBLIC_IP>:8080
[ ] Host Nginx proxies port 80 → 8080 → http://<PUBLIC_IP> works
```

---

## 💡 Troubleshooting on a Fresh Server

| Error | Likely cause | Fix |
|-------|--------------|-----|
| Browser can't reach `:8080` | Security group | Add inbound rule for 8080 (temporarily) |
| `permission denied while trying to connect to the Docker daemon` socket | User not in docker group (yet) | `newgrp docker` or re-login |
| `docker compose` not found | Plugin not installed | Reinstall `docker-compose-plugin` |
| Backend crash-loops | `.env` password mismatch | Make POSTGRES_PASSWORD = DB_PASSWORD, then `down -v && up -d` |
| Server slow / apps killed | 1 GB RAM too small | Stop t2.micro, launch t2.small |

---

**Next:** [Milestone 10 — Domain Name & HTTPS](10-domain-and-https.md) →