# 🚢 Milestone 8 — Push to Docker Hub

## 🎯 Goal

Upload the two production images to Docker Hub ☁️ so any machine (like your EC2 server) can download them.

---

## 📝 Step 1 — Create a Docker Hub account

1. Go to https://hub.docker.com 🏪
2. Sign up (username will become part of your image names)
3. Confirm your email

---

## 📝 Step 2 — Login from your terminal

```powershell
docker login
# enter your username + password/app-token
```

You should see: `Login Succeeded` ✅

---

## 📝 Step 3 — Tag Your Images

Your images currently have local names (`fullstack-backend:1.0`). Docker Hub needs them prefixed with your username: 🏷️

```powershell
# Format:  docker tag <local-name> <username>/<name>:<tag>
docker tag fullstack-backend:1.0 <your-dockerhub-username>/fullstack-backend:1.0
docker tag fullstack-frontend:1.0 <your-dockerhub-username>/fullstack-frontend:1.0

# Add "latest" too — handy trick for always grabbing the newest build
docker tag fullstack-backend:1.0 <your-dockerhub-username>/fullstack-backend:latest
docker tag fullstack-frontend:1.0 <your-dockerhub-username>/fullstack-frontend:latest
```

Check your work: 👀

```powershell
docker images
# you should see both your local names and the new username/name entries
```

---

## 📝 Step 4 — Push 📤

```powershell
docker push <your-dockerhub-username>/fullstack-backend:latest
docker push <your-dockerhub-username>/fullstack-frontend:latest
docker push <your-dockerhub-username>/fullstack-backend:1.0
docker push <your-dockerhub-username>/fullstack-frontend:1.0
```

The first push uploads layers; later pushes are fast (unchanged layers are skipped). ⚡

---

## 📝 Step 5 — Verify

Go to https://hub.docker.com → your repositories. You should see `fullstack-backend` and `fullstack-frontend`. ✅

---

## 📝 Step 6 — (The Payoff) Pull It On Any Machine

On ANY machine with Docker: 🌍

```powershell
docker pull <your-dockerhub-username>/fullstack-backend:latest
docker run -d --name check -p 3000:3000 <your-dockerhub-username>/fullstack-backend:latest
docker logs check
docker rm -f check
```

The backend runs identically — the whole reason Docker exists. ✨

---

## ✅ Checkpoint

```
[ ] ✔️ docker login succeeds
[ ] ✔️ Images tagged with your username
[ ] ✔️ docker push succeeds
[ ] ✔️ Images visible on hub.docker.com
[ ] ✔️ You pulled and ran the backend on a fresh container
```

---

➡️ **Next:** [Milestone 9 — Deploy to EC2](09-deploy-to-ec2.md)