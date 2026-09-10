# ============================================================
# Stage 1 — build: compile React to static files
# ============================================================
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ============================================================
# Stage 2 — serve: tiny Nginx image with just the artifacts
# This is the DEFAULT build target (production image).
# ============================================================
FROM nginx:1.27-alpine AS serve

# Make the runtime dirs writable by the unprivileged nginx user
# so it can write the pid file, caches, and access its config.
RUN chown -R nginx:nginx /var/cache/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

USER nginx

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]

# ============================================================
# Stage 3 — dev: Vite dev server with hot reload
# ============================================================
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN chown -R node:node /app
USER node
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]