# 🚌 Busly Backend Domain Architecture

This document outlines the production-grade **Stop-Centric, Decision-Node Philosophy** architecture for Busly, a highly scalable public transport navigation platform focusing on informal transit networks (like Danfo buses in Lagos).

The design strictly follows the existing **Modular Express + TypeScript + Mongoose + Repository Pattern** architecture.

---

## 🏗️ Core Database Schema & Entities

### 1️⃣ Users (`src/modules/users`)

The `User` represents an abstract identity across the system.

- **Roles:** Contains strict `PASSENGER`, `DRIVER`, or `ADMIN` enums.
- **Reputation Score:** A gamified value that dictates how much "weight" their community Contributions hold.
- **Relationships:**
  - Saves active `Route`s for quick alerts.
  - Pins frequent `Stop`s (e.g., Home, Work).
  - Linked directly to explicit `DriverProfile` documents if verified as an operator.

### 2️⃣ Stops (The Nodes) (`src/modules/stops`)

A `Stop` is the absolute foundation of the system. **Transport vehicles do not drive on roads; they teleport between Stops.**

- **Concept:** Represents a physical, geographic point (`Location: 2dsphere Point`) where humans congregate.
- **Connected Networks:** Contains `connectedRoutes`—an array explicitly listing what `Routes` physically pass through this specific node.
- **Real-time Reality:** Contains a `popularityScore` and `usageCount` to visually rank hubs on client applications (e.g., _Oshodi Terminal_ has a massive score vs a minor street corner).
- **Relationships:**
  - Anchored implicitly to `Landmarks` for human context.

### 3️⃣ Routes (The Logical Sequences) (`src/modules/routes`)

A `Route` is a strictly ordered sequence of Stops representing a static physical service path (e.g., "CMS to Ajah BRT" or "Oshodi Danfo Line").

- **Nested Structure:** It houses an embedded `stopsSequence` array.
  - This array strictly enforces the **logical order** of stops using an `order` integer.
  - It contains the `estimatedFare` and `averageTravelTimeToNext` algorithms dictating graph traversal weight costs natively.
- **Reliability Score:** Tracks operational consistency (delays, frequency of ghost buses).
- **Search Logic:** Finding a journey path means searching for a `Route` where the `originStop` sequence order mathematically precedes the `destinationStop` sequence order.

### 4️⃣ Landmarks (Spatial Memory) (`src/modules/landmarks`)

People in informal dense cities don't navigate by strict street names (e.g., "734 Main St"). They navigate by visual cues (e.g., "Drop at the junction near the red market").

- **Concept:** A physical, geo-indexed marker.
- **Cues Array:** Crowdsourced text directions (`text`, `directionHint`) tied to the landmark (e.g., "Walk left past the fish sellers").
- **Relationships:**
  - Tied directly to `associatedStops`. When the routing engine generates instructions for a Stop, it automatically pulls the attached Landmark Cues to help the user.

### 5️⃣ Trips (The Session Engine) (`src/modules/trips`)

A `Trip` is a temporal session instance created when a user physically starts moving along a `Route`. It tracks real-time progression.

- **State Machine:** Tracks `originStop`, `destinationStop`, and the exact `currentStop` the user is located at.
- **Logic Rule:** Updates to `currentStop` are strictly checked against the logical `stopsSequence` order of the active `selectedRoute`.
- **Deviation Detection:** If a user updates their `currentStop` to a location deeply unfamiliar to the active `Route` path, the engine throws a `deviationDetected = true` flag (potentially triggering alternate routing or safety alerts).

### 6️⃣ Contributions (The Community Engine) (`src/modules/contributions`)

Busly is built to adapt dynamically. Because routes change spontaneously in informal networks, the community corrects the map.

- **Concept:** A generic proposal schema holding `proposedData` JSON.
- **Entity Mapping:** It maps to an `entityId` dynamically depending on its `type` Enum (`STOP`, `LANDMARK`, `ROUTE`).
- **Voting System:** Other users vote (`UP` / `DOWN`). If the threshold clears against their `reputationScore`, an `ADMIN` approves it, merging the JSON explicitly onto the live target.

### 7️⃣ Drivers (Profiling Meta) (`src/modules/drivers`)

Extra metadata strictly isolated from the Base passenger user schemas.

- **Familiarity Scoring:** Algorithms track how well a driver knows a path. The more they complete a connected `Route`, the higher their explicit point allocation goes.
- **Relationships:** Links explicitly `1:1` back to the `User` schema.

### 8️⃣ Speed (Telemetry Logging) (`src/modules/speed`)

Because driver behavior implies structural safety ratings:

- **Concept:** Massive chronological inserts representing `Point` coordinates and speeds.
- **Indexing:** Heavily optimized on `recordedAt` chronologies and `2dsphere` nodes.
- **Reporting:** Exposes whether an instance was `isOverLimit`, implicitly flagging driver reliability metrics.

---

## ⚡ Routing Engine Design (`src/modules/journeys`)

To achieve `< 2s` routing on complex, informal networks, standard MongoDB queries are too slow.

### A. Core Search Mechanics

1. **Origin / Destination Matrix:**
   - `GET /stops/search` & `GET /stops/nearby` map user coordinate points (`lngelat`) to the closest physical Stop nodes via MongoDB's `$geoNear` aggregation.
2. **Logic Sequence Resolution:**
   - Instead of complex multi-node graph jumping natively in MongoDB, the engine pulls `Route` documents where both `Origin` and `Destination` exist inside the `stopsSequence` array, and mathematically guarantees the `originIndex < destIndex`.

### B. Route Alternate Processing

Users must see alternate physical routing instances.

- Alternate queries fetch any route mathematically overlapping a `currentStop` but parsing differing sequenced branches out.

---

## 📈 Scalability Plan

1. **City-Level Partitioning**:
   - Sharding occurs heavily on geospatial coordinate bounds isolating clusters implicitly without foreign keys.
2. **Indexing Strategy (MongoDB)**:
   - `stops.location` and `landmarks.location`: `2dsphere` (Critical for start/end snapping).
   - `speed.recordedAt`: `<DESC>` Temporal sorts
3. **Caching Strategy (Redis)**:
   - Capable of caching exact Origin-Destination (OD) query combinations for highly requested corridors (e.g., `CMS -> Ajah`) with TTL expiry bindings.
