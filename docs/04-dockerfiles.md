# 📦 Milestone 4 — Dockerfiles

## 🎯 Goal

Turn the backend and frontend into Docker images using **multi-stage builds** and **non-root users**. 🏗️

## 🧠 Background: Two patterns you must know

### 🔄 Pattern 1 — Multi-stage builds

```
Stage 1 (build):      full image with ALL tools → install, compile 🛠️
Stage 2 (runtime):    only the result            → small, safe 🪶
```

The backend image ends up ~180 MB. The frontend ~80 MB. Without multi-stage they'd be over 1 GB. 💾

### 👤 Pattern 2 — Non-root users

Containers default to running as `root` 👑. If your app is attacked, the attacker has root. One line fixes it:

```dockerfile
USER node      # a normal user that ships inside Node images 🙋
USER nginx     # a normal user inside Nginx images 🙋
```

---

## 📝 Step 1 — Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
# Stage 1 — deps: full install (fast rebuilds via layer cache)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2 — prod-deps: production-only dependencies
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 3 — runtime: THE PRODUCTION IMAGE
FROM node:22-alpine AS runtime
USER node
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/index.js"]

# Stage 4 — dev: keeps nodemon + devDependencies (used in Milestone 7)
FROM node:22-alpine AS dev
WORKDIR /app
RUN npm ci
COPY --chown=node:node . .
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm", "run", "dev"]
```

### 🏗️ Build it — and note the `--target`

```powershell
cd docker-fullstack-app\backend
docker build --target runtime -t fullstack-backend:1.0 .
```

**⚠️ Important:** the `dev` stage is written LAST, and Docker defaults to the last stage. So you must always say `--target runtime` when building the production image. This is the single most confusing thing about Dockerfiles — now you know it. 🧠

Verify:
```powershell
docker images fullstack-backend     # ~180MB
docker run --rm fullstack-backend:1.0 whoami   # prints "node" → non-root ✅
```

---

## 📝 Step 2 — Nginx Config for the Frontend (`frontend/nginx.conf`)

The React build is static files. Nginx serves them AND forwards `/api` calls to the backend container. 🔀

```nginx
server {
    listen 8080;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA routing: unknown paths get index.html (no 404 on refresh)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Forward API calls to the BACKEND CONTAINER by service name
    location /api/ {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

`proxy_pass http://backend:3000` — `backend` is the Compose service name. Docker's DNS resolves it. 🌐

---

## 📝 Step 3 — Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
# Stage 1 — build: compile React to static files
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2 — serve: tiny Nginx image with just the artifacts
FROM nginx:1.27-alpine AS serve

# Let the unprivileged nginx user write its pid file and caches
RUN chown -R nginx:nginx /var/cache/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

USER nginx

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]

# Stage 3 — dev: Vite dev server (used in Milestone 7)
FROM node:22-alpine AS dev
WORKDIR /app
RUN npm ci
COPY --chown=node:node . .
RUN chown -R node:node /app
USER node
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

### 🏗️ Build it:

```powershell
cd docker-fullstack-app\frontend
docker build --target serve -t fullstack-frontend:1.0 .
docker images fullstack-frontend     # ~80MB
```

---

## 🧹 Clean up your test containers/images

```powershell
docker system prune
```

---

## ✅ Checkpoint

```
[ ] ✔️ backend/Dockerfile: deps, prod-deps, runtime, and dev stages (all named)
[ ] ✔️ frontend/Dockerfile: build, serve, and dev stages (all named)
[ ] ✔️ frontend/nginx.conf proxies /api/ to http://backend:3000
[ ] ✔️ Images built with --target runtime / --target serve
[ ] ✔️ Backend ~180MB, frontend ~80MB
[ ] ✔️ Backend runs as "node"; frontend as "nginx"
```

---

➡️ **Next:** [Milestone 5 — Networks & Volumes](05-networks-and-volumes.md)