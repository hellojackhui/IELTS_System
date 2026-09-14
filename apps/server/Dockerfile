# Build the bundled server, then run it with only the native better-sqlite3 present.
# Build context is the repo root: `docker build -f apps/server/Dockerfile .`

# npm registry. Defaults to a China-friendly mirror so the image builds from
# mainland networks (Aliyun ECS etc.) without a proxy — registry.npmjs.org is
# often unreachable there. Override for other regions:
#   docker build --build-arg NPM_REGISTRY=https://registry.npmjs.org ...
ARG NPM_REGISTRY=https://registry.npmmirror.com

# ---- build stage ----
FROM node:20-bookworm-slim AS build
ARG NPM_REGISTRY
ENV NPM_CONFIG_REGISTRY=$NPM_REGISTRY
WORKDIR /app
# Point apt at a fast mirror (defaults to Aliyun — LAN speed on an Aliyun ECS;
# deb.debian.org is painfully slow from mainland China). Override if needed.
ARG APT_MIRROR=mirrors.aliyun.com
RUN sed -i "s|deb.debian.org|$APT_MIRROR|g; s|security.debian.org|$APT_MIRROR|g" \
      /etc/apt/sources.list /etc/apt/sources.list.d/debian.sources 2>/dev/null; \
    apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

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

# Compile the production runtime deps (better-sqlite3) HERE, where the compiler
# and the npm mirror are available, so the runtime stage needs neither a
# toolchain nor a GitHub prebuilt-binary download (unreliable behind the GFW).
COPY deploy/package.json /rtdeps/package.json
RUN cd /rtdeps && npm install --omit=dev

# ---- runtime stage ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8787 \
    DB_PATH=/data/ielts.db
# node_modules (with the compiled better-sqlite3) comes from the build stage;
# both stages use the same base image, so the native .node is ABI-compatible.
COPY --from=build /rtdeps/package.json ./package.json
COPY --from=build /rtdeps/node_modules ./node_modules
COPY --from=build /app/apps/server/dist/server.mjs ./server.mjs
RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 8787
CMD ["node", "server.mjs"]
