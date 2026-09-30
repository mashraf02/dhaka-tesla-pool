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
