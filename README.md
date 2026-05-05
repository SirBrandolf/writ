# Writ

Writ is a minimal web app for writing and organizing notes as Markdown. You sign in with email and password (Firebase Authentication), browse and search your notes on one screen, and open each note in an editor that renders Markdown and math (KaTeX) when you read it back. Notes are stored in your own PostgreSQL database behind a small REST API.

## Tech stack

The repo is an **npm workspaces** monorepo with two packages. Root scripts (`npm run dev`, `npm run start`) use **concurrently** to launch the client and API side by side.

**Client (`client/`):** **Vite** dev server and production build; **React 19** + **TypeScript** + **React Router** for the SPA. Layout and styling use **Tailwind CSS**. Notes are Markdown in the editor and rendered with **react-markdown**, **remark-math**, **rehype-katex**, and **KaTeX**. **Firebase Authentication** handles email/password sign-in in the browser.

**Server (`server/`):** **Express** REST API written in **TypeScript**. Dev uses **`tsx watch`**; production runs compiled output via **`tsc`** then **`node`**. Data lives in **PostgreSQL**, accessed with **`pg`**. **`dotenv`** loads environment variables from **`app.env`** at the repo root (or paths configured in server env loading); **`cors`** gates browser origins using **`CORS_ORIGINS`**. The notes REST surface is mounted at **`/api/notes`** so it does not collide with SPA routes under **`/notes/**`.

Both packages use **ESLint** for linting.

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

The dev client proxies `/api` to the API so the browser calls `/api/notes` on the same origin.

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

Notes API (Express): base path **`/api/notes`** (direct to API on port `5000`, or via your reverse proxy).

- `GET /health` — health check
- `POST /api/notes` — create note
- `GET /api/notes` — list notes
- `GET /api/notes/:id` — get single note
- `PUT /api/notes/:id` — update note
- `DELETE /api/notes/:id` — delete note

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
