# pikol-frontend

Pikol court booking — Next.js 15 client.

## Local setup

```bash
cp .env.example .env.local     # points at the backend on :8000
npm install
npm run dev                    # http://localhost:3000
```

Run the backend first (`../pikol-backend`, see its README). Port 3000 is
the origin the backend's CORS allow-list expects.

## Checks

```bash
npm run lint:ci && npm run format:check && npm run typecheck && npm test && npm run build
```
