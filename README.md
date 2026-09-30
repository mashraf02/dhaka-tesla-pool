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
