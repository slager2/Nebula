# Nebula

Nebula is a web application for organizing learning topics as interactive skill trees. It combines AI-generated learning plans, progress tracking, spaced repetition, and daily task management in a graph-based interface.

## Features

- Generate structured skill trees from a learning topic.
- Visualize constellations as interactive force-directed graphs.
- Store summaries, key concepts, and practical tasks for each skill node.
- Unlock nodes by submitting knowledge notes and following prerequisite chains.
- Schedule node reviews with spaced-repetition intervals.
- Create and complete daily tasks across cognitive, strength, and agility categories.
- Track routine, cognitive, and synchronization scores.
- Browse generated constellations and verified knowledge in the archive.

## Architecture

### Backend

- Go 1.24
- Fiber v2
- PostgreSQL 15
- GORM
- Groq Chat Completions API
- `openai/gpt-oss-120b` with strict JSON Schema output

### Frontend

- React 19
- Vite 6
- Tailwind CSS 4
- Zustand
- React Router
- `react-force-graph-2d`

## Repository Structure

```text
Nebula/
|-- backend/       Go API, database models, services, and Docker configuration
|-- frontend/      React application
`-- README.md
```

## Requirements

- Docker and Docker Compose
- Node.js 20 or newer
- npm
- A Groq API key

Go 1.24 and a local PostgreSQL installation are only required when running the backend without Docker.

## Configuration

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Set the following variables in `backend/.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `GROQ_API_KEY` | Yes | API key used for skill-tree generation |
| `DATABASE_URL` | No | PostgreSQL connection string for non-Compose environments |
| `CORS_ALLOWED_ORIGINS` | No | Comma-separated list of allowed frontend origins |

The `.env` file is ignored by Git and excluded from the Docker build context.

## Local Development

### Start the Backend

```bash
cd backend
docker compose up -d --build
```

The services are available locally at:

- API: `http://localhost:3000/api/v1`
- PostgreSQL: `localhost:5432`

Both ports are bound to `127.0.0.1` by default.

To stop the backend:

```bash
cd backend
docker compose down
```

### Start the Frontend

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The Vite development server proxies `/api` requests to the backend.

To use a different API location, define `VITE_API_URL` before building or starting the frontend.

## Running Without Docker

Start PostgreSQL, configure `DATABASE_URL`, and run:

```bash
cd backend
go run .
```

The backend automatically applies the current GORM migrations during startup.

## Validation

Backend checks:

```bash
cd backend
go test ./...
go test -race ./...
go vet ./...
go build ./...
```

Frontend checks:

```bash
cd frontend
npm ci
npm run lint
npm run build
```

The live Groq integration test is opt-in because it consumes API quota:

```bash
cd backend
set -a
source .env
set +a
RUN_GROQ_INTEGRATION=1 go test -run TestGroqIntegration ./services
```

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/profile` | Return the current profile |
| `PUT` | `/api/v1/profile/physics` | Update physical metrics |
| `GET` | `/api/v1/universe` | Return unlocked universe data |
| `GET` | `/api/v1/archive` | Return constellations and knowledge nodes |
| `POST` | `/api/v1/constellations/generate` | Generate and persist a skill tree |
| `GET` | `/api/v1/constellations/:id` | Return graph data for a constellation |
| `DELETE` | `/api/v1/constellations/:id` | Delete a constellation |
| `POST` | `/api/v1/nodes/:id/verify` | Verify and unlock a node |
| `POST` | `/api/v1/nodes/:id/review` | Record a spaced-repetition review |
| `GET` | `/api/v1/dailies` | List daily tasks |
| `POST` | `/api/v1/dailies` | Create a daily task |
| `POST` | `/api/v1/dailies/:id/complete` | Complete a daily task |
| `DELETE` | `/api/v1/dailies/:id` | Delete a daily task |

## Security Scope

The current application is designed for local, single-user use. Authentication and multi-user authorization are not implemented. Do not expose the API or database directly to an untrusted network without adding an authentication layer, request quotas, production database credentials, and deployment-specific CORS settings.
