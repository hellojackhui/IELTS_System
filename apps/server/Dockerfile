# Build the bundled server, then run it with only the native better-sqlite3 present.
# Build context is the repo root: `docker build -f apps/server/Dockerfile .`

# ---- build stage ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install workspace deps (lockfile-driven)
COPY package*.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci

# Build core, then bundle the server into apps/server/dist/server.mjs
COPY packages/core packages/core
COPY apps/server apps/server
RUN npm run build:core && npm run build -w @ielts/server

# ---- runtime stage ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    DB_PATH=/data/ielts.db
# better-sqlite3 ships prebuilt binaries for linux; no build tools needed at runtime
COPY deploy/package.json ./package.json
RUN npm install --omit=dev
COPY --from=build /app/apps/server/dist/server.mjs ./server.mjs
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 8787
CMD ["node", "server.mjs"]
