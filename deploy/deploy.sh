#!/usr/bin/env bash
#
# Deploy the IELTS sync server to a Linux machine over SSH.
#
# The server is bundled locally into a single file (apps/server/dist/server.mjs)
# that contains everything except the native better-sqlite3. We ship that one
# file plus a tiny package.json, install only better-sqlite3 on the server, and
# (re)start a systemd service. No source, no Expo deps, no build tools shipped.
#
# Usage:
#   DEPLOY_HOST=user@your-server ./deploy/deploy.sh
#
# Optional:
#   DEPLOY_DIR=/opt/ielts-server   (default)
#
# One-time server setup (see deploy/README is in the repo README):
#   - install Node 20+
#   - sudo useradd -r -s /usr/sbin/nologin ielts
#   - copy deploy/ielts-server.service to /etc/systemd/system/ and enable it
#   - create /opt/ielts-server/.env with a strong JWT_SECRET

set -euo pipefail

HOST="${DEPLOY_HOST:?Set DEPLOY_HOST=user@server}"
DIR="${DEPLOY_DIR:-/opt/ielts-server}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Building bundle locally"
cd "$ROOT"
npm ci
npm run build   # builds @ielts/core then bundles the server -> apps/server/dist/server.mjs

echo "==> Shipping to $HOST:$DIR"
ssh "$HOST" "mkdir -p '$DIR/data'"
rsync -avz "$ROOT/apps/server/dist/server.mjs" "$HOST:$DIR/server.mjs"
rsync -avz "$ROOT/deploy/package.json" "$HOST:$DIR/package.json"

echo "==> Installing native dep + restarting service"
ssh "$HOST" "cd '$DIR' && npm install --omit=dev && sudo systemctl restart ielts-server && sudo systemctl --no-pager status ielts-server | head -n 5"

echo "==> Done. Health check:"
ssh "$HOST" "curl -fsS http://localhost:\${PORT:-8787}/health && echo" || echo "(health check failed — check: sudo journalctl -u ielts-server -n 50)"
