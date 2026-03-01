# **BUSLY – PRODUCT REQUIREMENTS DOCUMENT (PRD)**

## 1. PRODUCT OVERVIEW

### Product Name

**Busly**

### Product Type

Web-first public transportation navigation and learning platform  
(Future: mobile apps)

### Target Market

Dense urban environments with informal or semi-formal public transport systems  
Initial focus: **Lagos, Nigeria**

### Primary Users

- **Passengers / Commuters**
- **Public transport drivers**
- **Community contributors (knowledgeable locals)**

---

## 2. PROBLEM STATEMENT

In many African cities (e.g., Lagos), public transportation is:

- Informal and decentralized
- Poorly documented digitally
- Heavily reliant on **oral instructions and local knowledge**
- Difficult for new users, visitors, and even locals traveling to unfamiliar areas

### Core Problems Faced by Users

#### For Passengers

- Not knowing **which bus to take**
- Not knowing **where to alight**
- Being unsure if instructions received are correct
- Having to ask multiple people for directions
- Anxiety from missing stops or boarding the wrong vehicle
- Inability to compare alternate routes or transfers
- Ride-hailing services are often **too expensive**

#### For Drivers

- Learning new routes takes time and mistakes
- Over-reliance on GPS without real spatial understanding
- Poor awareness of area transitions and landmarks
- Difficulty adhering to speed limits consistently

#### For the Transport Ecosystem

- Route knowledge is fragmented and undocumented
- No structured way to improve route accuracy over time
- No system that reflects how people _actually_ navigate cities

---

## 3. VALUE PROPOSITION

### Core Value

**Busly provides stop-by-stop public transport navigation with landmark-based guidance and alternate routes at every decision point — designed for how people actually move in informal cities.**

### Unique Differentiators

- Stop-centric navigation (not road-centric)
- Landmark-based instructions (markets, junctions, bridges)
- Alternate routes at every stop
- Community-sourced and validated route intelligence
- Learning-oriented driver mode
- Built specifically for informal transport systems

### Why Busly Exists (In One Line)

> _Busly removes the uncertainty from public transport by turning local knowledge into a shared, navigable system._

---

## 4. PRODUCT GOALS & SUCCESS METRICS

### Goals

- Reduce commuter confusion and anxiety
- Increase confidence using public transport
- Improve route accuracy over time via community input
- Help drivers build mental maps of the city

### Success Metrics (Examples)

- % of trips completed without asking for directions
- Drop-off rate during navigation
- Alternate route usage rate
- Community contribution rate
- Driver route recall improvement over time

---

## 5. CORE PRODUCT FEATURES (MVP)

### 5.1 Stop-by-Stop Navigation (Core Feature)

**Description**  
Users receive navigation instructions **one stop at a time**, from origin stop to destination stop.

**Key Characteristics**

- Each stop is a navigation checkpoint
- The current stop is always visible
- Users know exactly when to board and alight

---

### 5.2 Alternate Routes at Each Stop

**Description**  
At any stop, users can see **alternative ways forward**.

**Examples**

- Same route, different vehicle
- Different route, same destination
- Faster vs fewer transfers

**Why This Matters**

- Mirrors real-world decision making
- Reduces panic when things go wrong

---

### 5.3 Landmark-Based Navigation

**Description**  
Navigation instructions reference **real-world landmarks**, not just street names.

**Examples**

- “Alight after the big market”
- “Next to the blue pedestrian bridge”
- “Before the roundabout”

---

### 5.4 Community-Driven Route Intelligence

**Description**  
Users can:

- Add new stops
- Suggest landmarks
- Improve route accuracy
- Validate existing data

All changes go through **moderation and trust scoring**.

---

### 5.5 Driver Mode (MVP-lite)

**Description**  
A simplified navigation experience for drivers.

**Includes**

- Route overview
- Upcoming stops
- Speed vs speed-limit awareness
- End-of-route learning summary

---

## 6. SUPPORTING FEATURES (POST-MVP / PHASED)

- Reduced-guidance / Recall Mode
- Route replay & learning summaries
- Community popularity indicators
- Offline-first navigation
- API access for third-party platforms

---

## 7. USER FLOWS (END-TO-END)

### 7.1 Passenger Flow – First-Time User

1. User opens Busly
2. Sees simple onboarding explaining stop-by-stop navigation
3. Grants location permission
4. Enters destination
5. App identifies nearest boarding stop
6. App shows route preview (stops + transfers)
7. User starts navigation
8. App highlights current stop
9. User progresses stop by stop
10. App alerts user when to alight
11. User arrives successfully

---

### 7.2 Passenger Flow – Alternate Route Decision

1. User reaches a stop
2. App shows 2–3 alternate routes
3. User compares:
   - Stops remaining
   - Transfers
   - Landmark familiarity

4. User selects new route
5. Navigation continues seamlessly

---

### 7.3 Driver Flow – Route Learning

1. Driver selects route
2. App shows route overview with landmarks
3. Driver begins trip
4. App gives minimal prompts
5. Speed compliance is shown subtly
6. Trip ends
7. App summarizes route and learning points

---

### 7.4 Community Contributor Flow

1. User notices missing stop or landmark
2. Taps “Add stop” or “Suggest landmark”
3. Inputs name, location, description
4. Submits for review
5. Community validates
6. Data becomes globally available

---

## 8. USER STORIES (SAMPLE SET)

### Passenger Stories

- _As a commuter, I want to know exactly when to alight so I don’t miss my stop._
- _As a first-time visitor, I want landmark-based directions so I can understand instructions easily._
- _As a daily commuter, I want alternate routes so I can adapt when traffic changes._

### Driver Stories

- _As a driver, I want to learn routes without staring at a map._
- _As a driver, I want feedback on my speed relative to road limits._
- _As a driver, I want to rely less on GPS over time._

### Community Stories

- _As a local, I want to share route knowledge so others don’t get lost._
- _As a contributor, I want my contributions to be recognized and trusted._

---

## 9. FUNCTIONAL REQUIREMENTS

### Core Functional Requirements

- Search for routes by destination
- Identify boarding and alighting stops
- Navigate stop by stop
- Show alternate routes
- Display landmarks
- Allow community contributions
- Admin moderation system
- Driver navigation mode

---

## 10. NON-FUNCTIONAL REQUIREMENTS

### Performance

- Fast route computation (< 2s)
- Smooth navigation updates

### Reliability

- Works with noisy GPS
- Graceful degradation in low connectivity

### Usability

- Minimal interaction while moving
- Clear visual hierarchy
- Low cognitive load

### Scalability

- Supports city-wide growth
- Supports future API usage

### Security

- Rate-limiting for contributions
- Validation to prevent abuse

---

## 11. EDGE CASES & CONSTRAINTS

- GPS drift in dense urban areas
- Informal or changing landmarks
- Conflicting community inputs
- Low or no internet
- Safety concerns for drivers
- Legal compliance for speed monitoring

---

## 12. OUT OF SCOPE (FOR MVP)

- Payments
- Ticket booking
- Ride-hailing
- Ads
- Real-time vehicle tracking

---

## 13. TECH & DATA CONSIDERATIONS (HIGH LEVEL)

- Stop graph (nodes & edges)
- Route variants
- Landmark entities
- Area/corridor mapping
- User learning history
- Trust and validation scores

---

## 14. FUTURE EXPANSION

- Full mobile apps
- Offline navigation packs
- City expansion
- Public APIs
- Transport authority partnerships
- Data analytics dashboards

---

## 15. FINAL NOTE (IMPORTANT)

**Busly is not trying to replace Google Maps.**  
It is solving a **different problem**:

> _How do people actually move through informal cities using public transport?_
