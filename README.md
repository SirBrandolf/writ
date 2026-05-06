# Writ

[![Live Site](https://img.shields.io/badge/Live%20Site-my.writnotes.ca-2ea44f?style=for-the-badge)](https://my.writnotes.ca/)

Writ is a minimal web app for writing and organizing notes as Markdown. You sign in with email and password (Firebase Authentication), browse and search your notes on one screen, and open each note in an editor that renders Markdown and math (KaTeX) when you read it back. Notes are stored in your own PostgreSQL database behind a small REST API.

## Tech stack

The repo is an **npm workspaces** monorepo with three packages: **`client`**, **`server`**, and **`functions`**. Root scripts (`npm run dev`, `npm run start`) use **concurrently** to launch the client and API side by side (Cloud Functions are deployed separately with the Firebase CLI).

**Client (`client/`):** **Vite** dev server and production build; **React 19** + **TypeScript** + **React Router** for the SPA. Layout and styling use **Tailwind CSS**. Notes are Markdown in the editor and rendered with **react-markdown**, **remark-math**, **rehype-katex**, and **KaTeX**. **Firebase Authentication** handles email/password sign-in in the browser.

**Server (`server/`):** **Express** REST API written in **TypeScript**. Dev uses **`tsx watch`**; production runs compiled output via **`tsc`** then **`node`**. Data lives in **PostgreSQL**, accessed with **`pg`**. **`dotenv`** loads environment variables from **`app.env`** at the repo root (or paths configured in server env loading); **`cors`** gates browser origins using **`CORS_ORIGINS`**. The notes REST surface is mounted at **`/api/notes`** so it does not collide with SPA routes under **`/notes/**`.

Both packages use **ESLint** for linting.

## Project Structure

- `client/` React app
- `server/` Express API
- `functions/` Firebase Cloud Functions (e.g. cleanup Postgres when an Auth user is deleted); config in `firebase.json`
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
- index on `user_id + created_at` for per-user list queries

If you already created `notes` before Firebase server auth, run this migration:

```sql
ALTER TABLE notes ADD COLUMN IF NOT EXISTS user_id TEXT;
UPDATE notes SET user_id = 'legacy-migrated-user' WHERE user_id IS NULL;
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_user_created_at ON notes(user_id, created_at DESC);
```

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

## Firebase Auth (Server-Side Verification)

The client signs users in with Firebase Auth and sends a Firebase ID token on each `/api/notes` request.  
The server verifies that token using Firebase Admin SDK and scopes CRUD to `notes.user_id = <firebase uid>`.

Add these server env vars (same `app.env` loaded by `server/src/config/env.ts`):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (escaped with `\n` in env files)
- `FIREBASE_CHECK_REVOKED` (optional, `true` to check token revocation)

How to get values:

1. Firebase Console → Project Settings → Service Accounts.
2. Generate a new private key.
3. Copy `project_id`, `client_email`, and `private_key` into env vars above.

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
