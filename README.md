# EMERHNET Backend

Phase 1 backend for the EMERHNET hospital network platform.

## Stack

Node.js + Express + TypeScript + Mongoose + MongoDB. JWT in httpOnly cookies, CSRF via double-submit `XSRF-TOKEN`. See [CLAUDE.md](./CLAUDE.md) for the full rules.

## Setup

```bash
cp .env.example .env
# edit .env — at minimum set MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
npm install
npm run dev
```

Health check: `GET http://localhost:4000/api/v1/health`
OpenAPI spec: `GET http://localhost:4000/api/v1/openapi.json`

## Scripts

| Script | What |
|---|---|
| `npm run dev` | nodemon + tsx, watches `src/` |
| `npm run build` | compile to `dist/` |
| `npm start` | run compiled build |
| `npm run typecheck` | tsc no-emit |
| `npm run lint` | eslint |
| `npm test` | vitest |

## Layout

See [CLAUDE.md §3](./CLAUDE.md).
