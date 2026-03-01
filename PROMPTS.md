### Prompt 1: Global context

```markdown
You are designing UI screens for a product called Busly.

Busly is a web-first public transport navigation platform focused on stop-by-stop navigation in dense urban cities (starting with Lagos, Nigeria).

This is NOT Google Maps and NOT ride-hailing.

Core principles:

- Navigation is stop-centric, not road-centric
- Each stop is a decision node
- Users must see alternative routes at each stop
- Landmarks and informal cues are first-class navigation elements
- UI must be simple, mobile-first, low cognitive load
- Web app now, mobile app later

The UI must support:

- Passengers
- Drivers
- Community contributions

Do NOT invent features like payments, ads, or booking.
Focus on clarity, progression, and real-world usability.
```

### Prompt 2: Passenger onboarding & home

```markdown
Design the passenger onboarding and home screen UI for Busly.

User goals:

- Understand what Busly does in under 30 seconds
- Enter origin and destination
- See that this is stop-by-stop navigation

Screens to design:

1. Landing / onboarding screen
2. Location permission prompt
3. Origin & destination input screen
4. Initial route results preview

UI requirements:

- Mobile-first layout
- Clear CTA: "Find my route"
- Visual emphasis on stops, not roads
- Minimal text, intuitive icons
- Friendly tone for Lagos commuters

Show how the UI communicates:

- Boarding stop
- Estimated stops count
- Transfers (if any)
- Route confidence level (community-backed)

Deliver full HiFi screens with annotations.
```

### Prompt 3: Stop-by-stop navigation

```markdown
Design the core stop-by-stop navigation UI for passengers.

This is the MOST IMPORTANT flow in Busly.

User scenario:
A passenger starts a trip and follows stops one by one until destination.

Screens to design:

1. Active navigation screen
2. Current stop highlighted
3. Next stop preview
4. Stop list progression (completed / current / upcoming)
5. Arrival at transfer stop
6. Arrival at final stop

UI rules:

- The current stop must always be visible
- Users must know when to alight
- Stops must feel like checkpoints
- Avoid overwhelming map visuals

Include:

- Map + stop list hybrid
- Landmark hints per stop
- Estimated time/stops remaining
- Clear "You should alight here" state

Do NOT design turn-by-turn road navigation.
```

### Prompt 4: Alternative routes at each stop

```markdown
Design the UI for showing alternate routes at a stop.

Context:
At any stop, users may need to change routes due to traffic, congestion, or preference.

Screens to design:

1. Stop decision screen
2. Alternate routes list
3. Route comparison view
4. Route switch confirmation

Each alternate route must show:

- Stops remaining
- Transfers required
- Landmark familiarity
- Community reliability indicator

UI requirements:

- Fast decision-making
- Clear trade-offs (faster vs simpler vs familiar)
- One-tap route switching

Show how the UI avoids confusion while offering flexibility.
```

### Prompt 5: Landmark-based navigation

```markdown
Design the landmark-based navigation UI for Busly.

Context:
Busly uses landmarks (markets, bridges, junctions) instead of only street names.

Screens to design:

1. Landmark hint within navigation
2. Landmark detail modal
3. Landmark confirmation ("Yes, I see it")
4. Missed landmark recovery UI

UI requirements:

- Visual + text cues
- Simple language ("after the blue bridge")
- Clear association with stops
- Works even if GPS is noisy

Show how landmarks reduce anxiety and improve confidence.
```

### Prompt 6: Community contribution UI

```markdown
Design the community contribution UI for Busly.

User actions:

- Add a new stop
- Suggest a landmark
- Validate an existing stop
- Upvote helpful routes

Screens to design:

1. Add stop flow
2. Add landmark flow
3. Validation / voting screen
4. Contribution success & trust feedback

UI principles:

- Extremely simple
- Low friction
- Clear review/approval messaging
- Avoid abuse

Show how community trust is visually represented.
```

### Prompt 7: Driver mode UI

```markdown
Design the Driver Mode UI for Busly.

Driver goals:

- Follow assigned routes
- Know upcoming stops
- Maintain speed compliance
- Reduce mental load

Screens to design:

1. Driver home/dashboard
2. Active route screen
3. Speed vs speed-limit indicator
4. Alerts (overspeeding, upcoming stop)
5. End-of-route summary

UI constraints:

- Large text
- Minimal interaction while driving
- Audio-first where possible
- Safety-first design

Show how this differs from passenger UI.
```

### Prompt 8: Learning & Route Memory UI (Optional MVP+)

```markdown
Design the route learning and memory reinforcement UI.

Context:
Busly helps users learn routes over time.

Screens to design:

1. Post-trip summary
2. Route replay visualization
3. Learning insights ("You now know this corridor")
4. Reduced guidance / recall mode toggle

UI goals:

- Encourage independence
- Reinforce spatial memory
- No gamification overload

Design this as an optional enhancement, not core MVP.
```

### Prompt 9: Web app responsiveness

```markdown
Adapt all Busly UI screens for web usage.

Requirements:

- Responsive layouts
- Keyboard-friendly inputs
- Desktop map expansion
- Sidebar navigation where appropriate

Ensure:

- Mobile-first logic is preserved
- No loss of clarity on large screens
- Consistent design language across breakpoints
```

### Prompt 10: Full User story to UI mapping

```markdown
For each Busly feature, map user stories directly to UI screens.

User types:

- First-time passenger
- Daily commuter
- New driver
- Experienced driver
- Community contributor

For each:

- Define the pain point
- Show the UI that solves it
- Describe how the flow starts and ends

Ensure no feature exists without a visible UI purpose.
```
