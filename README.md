# Writ

Writ is a full-stack notes app with:

- `client`: React + Vite + TypeScript UI
- `server`: Express + TypeScript API
- PostgreSQL for note storage (`formatted_content` is stored as `JSONB`)

The client supports markdown and LaTeX rendering (via KaTeX) when viewing notes.

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS
- Backend: Express 5, TypeScript, `pg`
- Database: PostgreSQL
- Monorepo: npm workspaces (`client`, `server`)

## Project Structure

- `client/` React app
- `server/` Express API
- `server/src/db/notes.sql` schema bootstrap SQL
- `deploy/systemd/` sample systemd service files for Linux deploys

## Prerequisites

- Node.js (project services currently use Node 24 in systemd examples)
- npm
- PostgreSQL (local or remote)

## Database Setup

1. Create your database.
2. Run the SQL in `server/src/db/notes.sql` against your database.

That script creates:

- `notes` table
- update trigger for `updated_at`
- index on `created_at`

## Install

From repo root:

```bash
npm install
```

## Run Locally

### Start client + server together (recommended)

From repo root:

```bash
npm run dev
```

This starts:

- client dev server on `http://localhost:5175`
- API server on `http://localhost:5000`

### Start each service separately

```bash
npm run dev -w client
npm run dev -w server
```

## Production Build and Start

From repo root:

```bash
npm run build
npm run start
```

`start` runs:

- `vite preview` for the client on port `5175`
- compiled API server on port `5000`

## API Endpoints

Base API URL (local): `http://localhost:5000`

- `GET /health` health check
- `POST /notes` create note
- `GET /notes` list notes
- `GET /notes/:id` get single note
- `PUT /notes/:id` update note
- `DELETE /notes/:id` delete note

Example create/update payload:

```json
{
  "title": "My note",
  "formatted_content": {
    "markdown": "Inline math: $x^2$"
  }
}
```

## Deployment Notes

- Example systemd units are in `deploy/systemd/`.
- `writ-server.service` reads env from `EnvironmentFile=/etc/app.env`.
- `writ-client.service` serves the built frontend via `npm run preview -w client`.

## Docker

There are separate Dockerfiles for client and server:

- `client/Dockerfile`
- `server/Dockerfile`

If you need compose-based local/prod orchestration, add a `docker-compose.yml` tailored to your infrastructure.
