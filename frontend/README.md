# Nebula Frontend

React and Vite client for the Nebula learning workspace.

## Development

Start the backend first, then run:

```bash
npm ci
npm run dev
```

The development server is available at `http://localhost:5173` and proxies `/api` requests to `http://localhost:3000`.

## Checks

```bash
npm run lint
npm run build
npm run test:star-click
```

The star-click smoke test uses a locally installed Google Chrome by default. Override the browser or target with `CHROME_PATH`, `BASE_URL`, and `PLAN_ID`.

Project architecture and backend setup are documented in the repository root `README.md`.
