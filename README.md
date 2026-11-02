# HopeHive API

Express and MongoDB REST API for **HopeHive**, a community platform for creating, joining and tracking social service events. The web app lives in the `hopehive-client` repository.

- **Live API:** https://YOUR-SERVER.onrender.com _(replace with your deployed URL)_
- **Client repository:** https://github.com/YOUR-USERNAME/hopehive-client _(replace)_

## How it protects the API

Users sign in through BetterAuth in the Next.js app, which issues short-lived JWTs. This server never sees a password or a signing secret. It downloads the public keys from `AUTH_BASE_URL/api/auth/jwks`, verifies each token's signature, issuer, audience and expiry, and takes the caller's email and name **from the token**. Every create, update, delete and join action uses that verified identity, and update and delete also check that the event's `creatorEmail` matches the caller (otherwise `403`).

## Endpoints

| Method | Path | Access | What it does |
| --- | --- | --- | --- |
| GET | `/api/events` | Public | Upcoming events only. Query: `search`, `type`, `sort` (`soonest` or `latest`), `limit` |
| GET | `/api/events/:id` | Public | One event, including past ones |
| POST | `/api/events` | JWT | Create an event (date must be in the future) |
| GET | `/api/my-events` | JWT | Events created by the caller |
| PUT | `/api/events/:id` | JWT, owner | Update an event |
| DELETE | `/api/events/:id` | JWT, owner | Delete an event and its join records |
| POST | `/api/events/:id/join` | JWT | Join an event (once per user, upcoming events only) |
| GET | `/api/events/:id/join-status` | JWT | Whether the caller already joined |
| GET | `/api/joined-events` | JWT | Events the caller joined, sorted by event date |

Responses to bad input use clear messages, for example `{ "message": "Please fix the highlighted fields", "errors": { "eventDate": "Event date must be in the future" } }`.

## Data

- `events`: title, description, eventType, thumbnail, location, `eventDate` (`YYYY-MM-DD`), creatorEmail, creatorName, participantCount, timestamps
- `joinedEvents`: eventId, userEmail, userName, joinedAt, plus a copy of the event's title, thumbnail, type, location and date. A unique index on `(eventId, userEmail)` stops double joins.

"Today" is calculated in `Asia/Dhaka` time, so an event stays upcoming until its day is over.

## Run it locally

```bash
npm install
cp .env.example .env     # fill in MONGODB_URI and AUTH_BASE_URL
npm run seed             # optional: adds 8 sample events dated in the coming weeks
npm run dev              # http://localhost:5000
```

The client must be running at `AUTH_BASE_URL` so the server can fetch its JWKS.

## Deploy on Render

Create a Web Service from this repository (a `render.yaml` blueprint is included). Build command `npm install && npm run build`, start command `npm start`. Set `MONGODB_URI`, `CLIENT_URL` (your Vercel URL) and `AUTH_BASE_URL` (the same Vercel URL).

## Scripts

- `npm run dev` runs the API with auto-restart
- `npm run build` compiles TypeScript to `dist/`
- `npm start` runs the compiled server
- `npm run seed` inserts sample events
- `npm run typecheck` type-checks without emitting
