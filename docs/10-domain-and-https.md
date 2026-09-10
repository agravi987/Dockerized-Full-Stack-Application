# Milestone 10 — 🌐 Domain Name & HTTPS

> **Last Updated:** September 10, 2026

---

## 🎯 Goal

Give your EC2 deployment a real domain name and a free SSL certificate — the final pieces between "IP address demo" and "actual website".

## ✅ Prerequisites

```text
[ ] ✅ Milestone 9 (app live at http://<PUBLIC_IP> on port 80)
[ ] 💳 A domain registrar account (or ~$10/year)
```

---

## 🧠 Why a Domain + HTTPS

```text
http://52.15.44.201        →  looks like a dev toy
https://fullstack.app      →  looks like a product
```

HTTPS also:
- Removes the browser's "Not Secure" warning
- Is required for forms, logins, and cookies
- Is free via Let's Encrypt

> 🇳🇵 **सरल व्याख्या:** A record भनेको domain नामलाई EC2 को IP सँग जोड्ने "फोनबुक entry" हो; Certbot ले त्यही domain को लागि निःशुल्क SSL प्रमाणपत्र दिन्छ जसले browser र server बीचको सबै data इन्क्रिप्ट गर्छ।

---

## 📝 Step 1 — Buy a Domain

Any registrar works — pick the cheapest TLD for learning:

| Registrar | Notes |
|-----------|-------|
| Namecheap | Cheap, beginner-friendly |
| Cloudflare | Sells domains at-cost, free DNS/CDN on top |
| Porkbun | Cheap renewals |

Good learning choices: `yourname.app`, `mydockerapp.site`, or any `<something>.dev` / `.com` you like.

---

## 📝 Step 2 — Point the Domain at EC2

In the registrar's **DNS settings**, create these records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_EC2_PUBLIC_IP | 300 |
| A | www | YOUR_EC2_PUBLIC_IP | 300 |

```text
@        → yourdomain.com     → EC2 public IP
www      → www.yourdomain.com → EC2 public IP
```

> 💡 Some registrars use `@`, others a blank field. Goal: both the bare domain and `www` resolve to your EC2 IP.

**Optional but recommended:** Cloudflare as your DNS. Point the domain's nameservers at Cloudflare, add the same two A records there, and you get free CDN + extra features later.

---

## 📝 Step 3 — Wait for DNS Propagation

From your laptop (PowerShell):

```powershell
nslookup yourdomain.com
```

Expected: the `Address` line returns your EC2 public IP.

Propagation usually takes under 30 minutes but can take up to 48 hours. If it's slow, be patient — or speed it up by setting your computer's DNS to `1.1.1.1` or `8.8.8.8`.

---

## 📝 Step 4 — Tell Host Nginx the New Domain

SSH into EC2 and update the host Nginx so it answers only for your domain:

```bash
sudo nano /etc/nginx/sites-available/default
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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
sudo nginx -t
sudo systemctl restart nginx
```

Visit `http://yourdomain.com` — it should load your app.

---

## 📝 Step 5 — Install Certbot for Free SSL

```bash
sudo apt-get install -y certbot python3-certbot-nginx
```

---

## 📝 Step 6 — Issue the Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Answer the prompts:

```text
Enter email            → for renewal notices
TOS                    → agree
Share email with EFF?  → N is fine
HTTP → HTTPS redirect? → 2 “Redirect” (recommended)
```

Certbot automatically:
1. Verifies you own the domain (via DNS + HTTP challenge)
2. Installs the certificate into Nginx
3. Configures HTTPS + redirect
4. Sets up auto-renewal

---

## 📝 Step 7 — Verify Everything

Visit **https://yourdomain.com** — you should see the padlock 🔒.

```bash
# Confirm the cert:
sudo certbot certificates

# Confirm renewal works:
sudo certbot renew --dry-run
```

Both domains redirect:

```bash
curl -sI http://yourdomain.com | head -5
# HTTP/1.1 301 Moved Permanently  → Location: https://yourdomain.com/...
```

---

## 📝 Step 8 — Final Security Group

Your EC2 security group should now be:

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | My IP | Remote access (restricted) |
| HTTP | 80 | 0.0.0.0/0 | Receives requests → redirects to HTTPS |
| HTTPS | 443 | 0.0.0.0/0 | Secure traffic |

Remove any temporary `8080` rule you added during Milestone 9 — the public never reaches the app container directly anymore.

---

## ✅ Checkpoint

```text
[ ] A records point @ and www to your EC2 IP; nslookup confirms
[ ] Host Nginx server_name is your real domain
[ ] certbot --nginx succeeded with NO errors
[ ] https://yourdomain.com loads with a padlock
[ ] http://yourdomain.com redirects to https
[ ] certbot renew --dry-run passes (auto-renewal working)
[ ] Port 8080 rule removed from the security group
```

---

## 💡 Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| DNS not resolving | Propagation/typo | `nslookup` again; check A records; change resolver to 1.1.1.1 |
| Certbot "unable to verify domain" | A record still propagating | Wait; `dig yourdomain.com +short` until it shows your IP |
| Pages load over HTTP but not HTTPS | Cert issued before DNS settled | Rerun `sudo certbot --nginx` after resolving |
| Email renewal notices landing in spam | Normal for Let's Encrypt | Whitelist expiring-notices@letsencrypt.org |

---

**Next:** [Milestone 11 — Security & Final Checklist](11-security-hardening-and-final-check.md) →