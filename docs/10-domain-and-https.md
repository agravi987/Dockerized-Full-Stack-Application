# 🔒 Milestone 10 — Domain & HTTPS *(optional)*

## 🎯 Goal

Give your EC2 deployment a real domain name 🏷️ and a free SSL certificate 🔐.

---

## 💡 The Idea

```
http://12.34.56.78        → looks like a dev toy 🧸
https://yourdomain.com    → looks like a product 🏢
```

HTTPS also removes the browser's "Not Secure" warning and is free via Let's Encrypt. 🎁

---

## 📝 Step 1 — Buy a Domain

Any registrar works — Namecheap, Cloudflare, Porkbun, GoDaddy 💳. Pick any cheap `.com` / `.app` / `.site` / `.dev` you like.

---

## 📝 Step 2 — Point the Domain at Your EC2 IP

In the registrar's **DNS settings**, add two A records: 🗺️

| 📦 Type | 🏷️ Name | 🎯 Value |
|------|------|-------|
| A | @ | YOUR_EC2_PUBLIC_IP |
| A | www | YOUR_EC2_PUBLIC_IP |

```
@        → yourdomain.com      → EC2 IP
www      → www.yourdomain.com  → EC2 IP
```

---

## 📝 Step 3 — Wait for DNS to Take Effect

From your laptop: 💻

```powershell
nslookup yourdomain.com
```

The `Address:` line should return your EC2 public IP. Usually under 30 minutes, can take up to 48 hours. ⏳

---

## 📝 Step 4 — Set Up Server-Side Nginx (host-level)

Your app runs on the EC2 host. Install a host Nginx as the front door so a domain maps to your containers: 🚪

```bash
# SSH into EC2
sudo apt-get install -y nginx

sudo nano /etc/nginx/sites-available/default
```

Replace the file contents: 📝

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo nginx -t
sudo systemctl restart nginx
```

Visit `http://yourdomain.com` — it should load your app. 🎉

---

## 📝 Step 5 — Get Free SSL with Let's Encrypt

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Answer the prompts: 💬
```
Enter email            → your email (renewal notices)
TOS                    → agree
Share email with EFF?  → N
HTTP → HTTPS redirect? → 2 (Redirect)
```

Certbot automatically 🪄 verifies the domain, installs the certificate into Nginx, enables HTTPS + redirect, and sets up auto-renewal. 🔄

---

## 📝 Step 6 — Verify

Visit **https://yourdomain.com** — you should see a padlock 🔒.

```bash
sudo certbot certificates          # see your cert
sudo certbot renew --dry-run       # confirm auto-renewal works
```

---

## 🛡️ Final Security Group

| 📦 Type | 🌐 Port | 📍 Source | 🎯 Purpose |
|------|------|--------|---------|
| SSH | 22 | My IP | remote access |
| HTTP | 80 | 0.0.0.0/0 | redirects to HTTPS |
| HTTPS | 443 | 0.0.0.0/0 | secure traffic |

Remove the temporary `8080` rule from Milestone 9 — the public now reaches the app only through the host Nginx on port 80. 🗑️

---

## ✅ Checkpoint

```
[ ] ✔️ A records point @ and www to your EC2 IP
[ ] ✔️ http://yourdomain.com loads the app
[ ] ✔️ https://yourdomain.com loads with a padlock
[ ] ✔️ http → https redirect works
[ ] ✔️ certbot renew --dry-run passes
```

---

## 🧯 Troubleshooting

| 📖 Symptom | 🔍 Likely cause | 🛠️ Fix |
|---------|--------------|-----|
| DNS not resolving | propagation/typo | `nslookup` again; check A records |
| Certbot "unable to verify domain" | A record not settled | wait, then re-run certbot |
| https fails but http works | cert issued too early | re-run `sudo certbot --nginx` |

---

➡️ **Next:** [Milestone 11 — Security & Final Check](11-security-and-final-check.md) *(optional)*