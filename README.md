# IELTS Vocabulary Trainer

A personal IELTS trainer — one TypeScript codebase for **iOS, Android, and web**, backed by a small sync server so progress follows you across devices. Deliberately simple, built to iterate on.

The app is organised into three boards:

- **单词记忆 (Memory)** — spelling and context-choice practice over 3,611 words, scheduled with spaced repetition.
- **AI 助手 (AI Assistant)** — a chat surface (preview). The reply function is a single stub, ready to point at a real model later.
- **听力 (Listening)** — dictation: hear a word, type it.

## Layout

```
packages/core/   Shared logic — word list, quiz builder, SM-2 spaced repetition, API client.
apps/server/     Hono + SQLite (Drizzle) sync server. Accounts + progress sync. Bundles for prod.
apps/mobile/     Expo app (iOS / Android / web): splash, bottom-tab boards, quiz flow.
deploy/          Deployment: minimal runtime package.json, systemd unit, deploy.sh.
docs/            legacy-standalone.html (the original single-file prototype).
scripts/         generate-words.mjs (rebuilds core word data from words.json).
```

`packages/core` is consumed by **both** server and app, so the rules and data model live in one place.

## Prerequisites

- Node 20+ (developed on Node 24)
- For the phone app: **Expo Go** on your device (must support the project's SDK — currently **SDK 54**).

## First-time setup

```bash
npm install
npm run build:core   # compiles packages/core -> dist (needed by server & app)
```

## Running (dev)

Two terminals.

```bash
npm run server        # sync server on http://localhost:8787
```

```bash
npm run web           # the app in your browser
# or, on your phone (same Wi-Fi); use your Mac's LAN IP so sync works:
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:8787 npm run mobile
```

Scan the QR from `npm run mobile` with the iPhone Camera app (iOS Expo Go has no manual-URL field). The app works without an account (progress saved on-device); sign in to sync across devices.

## The AI assistant (later)

`apps/mobile/src/ai.ts` exports one function, `getAssistantReply(history)`, currently returning a canned message. To make it real, replace its body with a call to a backend endpoint (e.g. add `POST /ai/chat` to the Hono server that proxies to an LLM) — keep the signature and the chat UI is unchanged.

## Deploying the server

The server bundles into a **single file** (`apps/server/dist/server.mjs`) containing everything except the native `better-sqlite3`. Two ways to run it on a machine:

### Option A — Docker (one command)

```bash
# edit JWT_SECRET in docker-compose.yml first
docker compose up -d --build
```

SQLite lives in the `ielts-data` volume. Server on port 8787.

### Option B — bare metal (systemd)

One-time on the server:

```bash
# install Node 20+, then:
sudo useradd -r -s /usr/sbin/nologin ielts
sudo mkdir -p /opt/ielts-server/data && sudo chown -R ielts:ielts /opt/ielts-server
sudo cp deploy/ielts-server.service /etc/systemd/system/
printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 32)" | sudo tee /opt/ielts-server/.env
sudo systemctl daemon-reload && sudo systemctl enable ielts-server
```

Then from your machine, each deploy:

```bash
DEPLOY_HOST=user@your-server ./deploy/deploy.sh
```

`deploy.sh` builds the bundle locally, ships `server.mjs` + a tiny `package.json`, installs only `better-sqlite3` on the server, and restarts the service. Logs: `sudo journalctl -u ielts-server -f`.

After deploy, point the app at it: build with `EXPO_PUBLIC_API_URL=https://your-server` (put it behind TLS — a reverse proxy like Caddy/Nginx — before real use).

## Iterating

- **Quiz logic / scheduling** → `packages/core`, then `npm run build:core` (or `npm run dev:core` to watch). Server and app both pick it up.
- **Word list** → edit `words.json`, `node scripts/generate-words.mjs`, `npm run build:core`. Append only; never reorder.
- **New API endpoint** → route in `apps/server/src/routes` + a method on `ApiClient` in `packages/core/src/api.ts`.
- **UI** → `apps/mobile/src/screens` (boards) and `apps/mobile/src/components`.

## Notes

- Env vars: `PORT` (8787), `DB_PATH` (data.db), `JWT_SECRET` (**set this in production**). See `apps/server/.env.example`.
- Sync is last-write-wins per word on `updatedAt` — simple and fine for one user across a few devices.
