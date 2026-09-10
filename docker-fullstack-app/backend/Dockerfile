# ============================================================
# Stage 1 — deps: full install (keeps the dev stage fast + cached)
# ============================================================
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ============================================================
# Stage 2 — prod-deps: production-only dependencies
# ============================================================
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ============================================================
# Stage 3 — runtime: slim image, only what's needed to run
# This is the DEFAULT build target (heroku/ec2 production image).
# ============================================================
FROM node:22-alpine AS runtime
USER node
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/index.js"]

# ============================================================
# Stage 4 — dev: full tooling + nodemon for hot reload
# ============================================================
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm", "run", "dev"]