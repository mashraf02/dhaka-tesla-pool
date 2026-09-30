# Dhaka Tesla Pool

Share a seat. Split the fare. Survive Dhaka traffic.

## Summary

Dhaka Tesla Pool is a ride-pooling MVP built for the RoBenDevs internship take-home
challenge. Three passengers, one driver, and a three-seat battery rickshaw ("Tesla")
named Bullet make up the story cast used throughout the seed data, tests, and demo:
Jashim (driver), Nusrat, Rafiq, and Shirin (passengers).

## The problem

Nusrat wants to go from Banani to Mohakhali. Rafiq, a stranger, wants to go from
Banani to Gulshan 1 at almost the same time. Jashim's Tesla has three seats. The
system has to decide — in about a second — whether Nusrat and Rafiq can share a
ride, split the fare fairly between them, and track the trip from request to
completion, all while keeping each passenger's fare and status private to them.

This project is the MVP built to solve that: passengers can request rides and get
pooled together when it makes sense, drivers can accept and run pooled trips, and
every ride's full history is kept for later review.

## Features implemented

- **Passenger**: register/login, request a ride (pickup, destination, seats), see
  an estimated fare, track status live (`REQUESTED → MATCHED → DRIVER_ARRIVED →
  STARTED → COMPLETED`, or `CANCELLED`), cancel while the ride hasn't started, view
  ride history with final fares
- **Driver**: register/login, register a vehicle, go online/offline, see unmatched
  nearby requests, accept a ride (opening a new pool or joining an existing one),
  advance a pool through arrival → start → completion
- **Pooling**: a simple area+corridor matching rule decides who can share a ride;
  seat capacity is enforced with a database-level row lock so two simultaneous
  claims for the last seat can never both succeed
- **Fares**: an integer-poysha fare model (`base + distance×rate`, with a 20% pool
  discount once 2+ passengers share a ride), hand-verifiable for Nusrat and Rafiq's
  trip (see [Fare model](#fare-model) below)
- **Full audit trail**: every ride status change is recorded as its own event, not
  just overwritten

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React (Vite) | Fast dev server (native ES modules, no bundler in dev), simpler than Next.js for a client-only SPA with no SSR/routing-on-the-server need |
| Backend | Node.js + Express | Lightweight for an MVP this size; every route is easy to trace and defend line by line, versus NestJS's heavier DI/module ceremony |
| Database | PostgreSQL 16 | Relational data (users, vehicles, pools, rides all foreign-keyed together), transactions + row locking (`SELECT ... FOR UPDATE`) needed for the seat-concurrency problem, native enums for status/area |
| ORM | Prisma 7 (with `@prisma/adapter-pg`) | Single schema file generates both migrations and a type-safe client; adapter lets Prisma run over the standard `pg` driver |
| Auth | JWT + bcrypt | Stateless (no session store needed for an MVP), bcrypt for one-way password hashing |
| Validation | Zod | Schema-based request validation as middleware, before any business logic runs |
| Testing | Jest + Supertest | Jest for unit + integration, Supertest for hitting the Express app directly without binding a real port |
| Containerization | Docker Compose | One `docker compose up` builds and runs Postgres, the API, and the frontend together, with migrations and seed data applied automatically |

**Alternatives considered:** MySQL/SQLite for the database (Postgres won on
row-locking and native enum support), NestJS for the backend (more structure than
an MVP of this size needs), Redux for frontend state (React Context was enough
for the small amount of shared auth state). None of these were built only to look
impressive — the PRD explicitly warns against that, and every choice above is one
we'd actually defend in the interview.

## Architecture
```
Browser (Passenger / Driver)
│
▼
React (Vite) SPA ──REST + JSON, Bearer JWT──▶ Node.js + Express API
routes → controllers → services
│
▼
PostgreSQL 16 (via Prisma)


```

Inside the API:
- **routes/** — URL + HTTP verb mapping only
- **controllers/** — parse the request, call a service, shape the HTTP response
- **services/** — business rules (matching, fare, state transitions, seat capacity) — framework-agnostic, unit-testable without Express or Prisma running
- **middleware/** — auth (JWT verification + role guard), request validation, central error handler

*A full architecture diagram and ERD (drawn in draw.io) are in [`docs/architecture.png`](docs/architecture.png) and [`docs/erd.png`](docs/erd.png).*

## Project structure

```
dhaka-tesla-pool/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Single source of truth for the data model
│   │   ├── migrations/          # Generated SQL migrations
│   │   └── seed.js              # Demo users, vehicle, and rides
│   ├── src/
│   │   ├── routes/              # URL + HTTP verb mapping only
│   │   ├── controllers/         # Request parsing, response shaping
│   │   ├── services/            # Business rules (matching, fare, seats, state)
│   │   ├── middleware/          # auth, role guard, Zod validation, error handler
│   │   ├── app.js               # Express app (exported for Supertest)
│   │   └── server.js            # Binds the port
│   ├── tests/                   # Jest unit + Supertest integration tests
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/             # Auth context (JWT + current user)
│   │   └── api/                 # Fetch wrapper that attaches the Bearer token
│   └── Dockerfile
├── docs/
│   ├── architecture.png
│   └── erd.png
├── docker-compose.yml
├── .env.example
└── README.md
```

## Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Docker + Docker Compose | Docker 24+ | Recommended path: runs everything with one command |
| Node.js | 20 LTS or newer | Only for running without Docker, or running tests locally |
| PostgreSQL | 16 | Only for running without Docker |
| Git | any recent | Cloning the repo |

## Environment variables

Copy `.env.example` to `.env` before running anything:

```bash
cp .env.example .env
```

| Variable | Example | Purpose |
|---|---|---|
| `POSTGRES_USER` | `tesla` | Database user (used by Docker Compose) |
| `POSTGRES_PASSWORD` | `change_me` | Database password |
| `POSTGRES_DB` | `tesla_pool` | Database name |
| `DATABASE_URL` | `postgresql://tesla:change_me@db:5432/tesla_pool` | Connection string used by Prisma (use `localhost` instead of `db` outside Docker) |
| `JWT_SECRET` | *(long random string)* | Signs auth tokens. Never commit a real value |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime |
| `PORT` | `4000` | API port |
| `VITE_API_URL` | `http://localhost:4000` | Where the frontend sends API requests |

> `.env` is git-ignored. Only `.env.example` (placeholder values) is committed.

## Quick start (Docker)

The fastest way to run everything. Docker Compose starts Postgres, applies migrations, seeds demo data, and launches the API and frontend.

```bash
git clone <your-repo-url>
cd dhaka-tesla-pool
cp .env.example .env
docker compose up --build
```

Once the containers are up:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:4000 |
| Health check | http://localhost:4000/health |

To stop everything: `docker compose down`. To also wipe the database volume and start fresh: `docker compose down -v`.

## Local development (without Docker)

You'll need Node.js 20+ and a running PostgreSQL 16 instance.

**1. Backend**

```bash
cd backend
npm install
# In .env, point DATABASE_URL at localhost instead of the "db" host
npx prisma migrate dev      # applies migrations, generates the Prisma client
npx prisma db seed          # loads demo users, vehicle, and rides
npm run dev                 # API on http://localhost:4000
```

**2. Frontend** (in a second terminal)

```bash
cd frontend
npm install
npm run dev                 # SPA on http://localhost:5173
```

## Demo accounts

The seed script creates these accounts so you can try both roles right away:

| Role | Email | Password |
|---|---|---|
| Driver | `driver@example.com` | `Password123!` |
| Passenger | `passenger1@example.com` | `Password123!` |

## Running tests

```bash
cd backend
npm test                    # unit + integration (Jest + Supertest)
npm test -- --coverage      # with a coverage report
```

Integration tests need a reachable Postgres instance. Set `DATABASE_URL` in `.env` to a test database before running them.

## API reference

Base URL: `http://localhost:4000/api`. All request and response bodies are JSON.

### Authentication

Protected routes need a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Get a token from `POST /auth/login`. Routes marked **Driver** or **Passenger** return `403` for the other role.

### Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create a driver or passenger account |
| POST | `/auth/login` | Public | Exchange credentials for a JWT |
| GET | `/auth/me` | Any user | Current user profile |
| POST | `/pools` | Driver | Open a new pool (area, departure time, seats) |
| GET | `/pools` | Any user | List pools; filter with `?area=` and `?status=` |
| GET | `/pools/:id` | Any user | Pool details, seats left, current fare share |
| POST | `/pools/:id/join` | Passenger | Take a seat (capacity-checked in a transaction) |
| POST | `/pools/:id/leave` | Passenger | Give up a seat before departure |
| PATCH | `/pools/:id/status` | Driver | Move the pool through its allowed states |
| GET | `/rides/me` | Any user | Ride history for the logged-in user |

### Example: register and log in

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"passenger1@example.com","password":"Password123!"}'
```

```json
{
  "token": "<jwt>",
  "user": { "id": 2, "name": "Passenger One", "role": "PASSENGER" }
}
```

### Example: join a pool

```bash
curl -X POST http://localhost:4000/api/pools/1/join \
  -H "Authorization: Bearer <token>"
```

```json
{
  "poolId": 1,
  "seatsRemaining": 2,
  "farePerPassenger": 60
}
```

### Errors

Errors share one shape, produced by the central error handler:

```json
{ "error": "Pool is full" }
```

| Status | Meaning |
|---|---|
| 400 | Validation failed (Zod) or invalid state transition |
| 401 | Missing, invalid, or expired token |
| 403 | Authenticated, but wrong role for this route |
| 404 | Resource not found |
| 409 | Conflict, e.g. no seats left or already joined |
| 500 | Unexpected server error |

### Concurrency note

`POST /pools/:id/join` reads and updates seat count inside a transaction using `SELECT ... FOR UPDATE`. If two passengers try to take the last seat at the same moment, one succeeds and the other gets `409`.

## Design decisions and trade-offs

**Business logic lives in services, not controllers.** Matching, fare calculation, seat capacity, and state transitions sit in `services/` with no Express or HTTP dependency. That keeps them unit-testable in isolation, and controllers stay thin enough to read in seconds.

**Seat capacity is enforced in the database transaction, not in application code.** Checking "seats left" in JavaScript and then writing would race under concurrent requests. The join flow locks the pool row (`SELECT ... FOR UPDATE`) inside a transaction, so the check and the write are atomic. The trade-off is that requests for the same pool are serialized, which is fine at this scale.

**Fare is split evenly across passengers.** [Describe your actual rule, e.g. "total fare / passengers currently seated, recalculated when someone joins or leaves".] It's simple and easy to explain. It does not account for different pickup distances.

**Explicit state machine for pool status.** Statuses can only move along allowed transitions [list yours, e.g. OPEN → FULL → IN_PROGRESS → COMPLETED / CANCELLED]. Invalid transitions are rejected in the service layer with a `400`.

**Stateless JWT auth.** No session store to run, and the API scales horizontally without shared state. The trade-off is that tokens can't be revoked before they expire. Short expiry is the mitigation.

**Validation before logic.** Zod schemas run as middleware, so services can assume well-formed input.

## Known limitations

- **No real-time updates.** The UI polls or refreshes to see seat changes. WebSockets or server-sent events would fix this.
- **No refresh tokens or token revocation.** A stolen JWT is valid until it expires.
- **Areas are a fixed enum**, not real geolocation. Matching is by area name, not distance or route.
- **No payment integration.** Fares are calculated and displayed, never charged.
- **Limited test coverage.** [State honestly what is covered, e.g. "services and the join endpoint are tested; the frontend is not".]
- **No rate limiting or account lockout** on auth endpoints.
- **Single-instance deployment.** Docker Compose is for local and demo use, not production hosting.

## With more time

1. Real-time seat updates over WebSockets.
2. Route-aware matching using coordinates instead of area labels.
3. Refresh-token flow with revocation.
4. Rate limiting and security headers (`helmet`).
5. Frontend component tests and a browser end-to-end test of the join flow.
6. CI pipeline running lint and tests on every push.

## Author

Built by Mashraful for the RoBenDevs internship challenge.
