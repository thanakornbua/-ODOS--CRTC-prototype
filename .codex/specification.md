# MEDHIVE — Full Codex Task Specification
## Proactive Cyber Defense Simulation Dashboard

---

## Project Overview

Build a full-stack web prototype simulating **MEDHIVE** — a three-layer cyber deception system for hospital IoMT networks. A scripted attacker agent moves through a fake hospital honeynet in real time. The React dashboard visualizes attacker movement, fired canary alerts, and system layer status via WebSocket.

This is a **hackathon demo**. No real network traffic. No actual attack tools. Everything is simulated server-side.

---

## Repository Structure

```
medhive/
├── backend/
│   ├── main.py                  # FastAPI app, WebSocket endpoint, CORS
│   ├── honeynet.py              # Honeynet graph: nodes, edges, metadata
│   ├── simulation.py            # Attacker agent async loop
│   ├── canary.py                # Canary token fire logic
│   ├── events.py                # Event dataclasses and event bus
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── src/
    │   ├── App.jsx              # Root layout
    │   ├── components/
    │   │   ├── NetworkGraph.jsx  # react-force-graph-2d network viz
    │   │   ├── EventLog.jsx      # Live scrolling event feed
    │   │   ├── CanaryPanel.jsx   # Canary alert panel
    │   │   ├── LayerStatus.jsx   # Three-layer status indicators
    │   │   └── NodeDetail.jsx    # Side panel: selected node logs
    │   ├── hooks/
    │   │   └── useWebSocket.js   # WebSocket connection + state management
    │   └── index.css            # Global styles (dark theme)
    └── vite.config.js
```

---

## Backend Specification

### Tech Stack
- Python 3.11+
- FastAPI
- uvicorn
- websockets (FastAPI built-in)
- No database — all state in memory

### requirements.txt
```
fastapi
uvicorn[standard]
websockets
```

### `honeynet.py` — Honeynet Graph Data

Define a `HONEYNET` dict with nodes and edges.

**Nodes** (10 total):

| id | label | type | os | ports | has_honeyrecords |
|---|---|---|---|---|---|
| `gateway` | IoMT Gateway | gateway | Linux 5.4 | 443, 8883 | false |
| `his` | Hospital HIS | server | Windows Server 2016 | 445, 3389, 1433 | true |
| `pacs` | PACS Workstation | workstation | Windows 10 | 104, 80, 445 | false |
| `ehr` | EHR Server | server | Linux 4.15 | 443, 3306, 22 | true |
| `infusion` | Infusion Pump Ctrl | iot | VxWorks 6.9 | 102, 20000 | false |
| `monitor` | Bedside Monitor | iot | QNX 7.0 | 102, 2575 | false |
| `nhso` | NHSO e-Claim GW | gateway | Linux 5.15 | 443, 8080 | false |
| `admin` | Admin Workstation | workstation | Windows 11 | 445, 3389 | false |
| `backup` | Backup Server | server | Linux 4.19 | 22, 873, 2049 | false |
| `ghost_pacs` | Ghost PACS [FAKE] | honeypot | Windows 10 | 104, 80 | false |

**Edges** (connections between nodes):
```
gateway → his, infusion, monitor
his → ehr, pacs, admin, nhso
ehr → backup, nhso
pacs → his, ghost_pacs
admin → his, backup
ghost_pacs → (dead end — no outbound edges)
```

Each node also has a `logs` list: 3–5 fake log entries (realistic syslog format with timestamps). Generate plausible entries per device type. Example for HIS:
```
[2026-04-24 09:14:02] AUTH: user=nurse_01 src=192.168.1.45 ACCEPT
[2026-04-24 09:31:17] DB: SELECT patient_records WHERE ward=ICU rows=142
[2026-04-24 10:02:44] AUTH: user=admin src=192.168.1.10 ACCEPT
```

### `events.py` — Event Types

Define a dataclass `SimEvent` with fields:
- `type: str` — one of: `SCAN`, `LOGIN_ATTEMPT`, `LOGIN_SUCCESS`, `LATERAL_MOVE`, `FILE_ACCESS`, `EXFILTRATE`, `CANARY_FIRE`, `LAYER_TRIGGER`
- `node_id: str` — target node
- `timestamp: str` — ISO format
- `message: str` — human-readable description
- `severity: str` — `info`, `warning`, `critical`
- `attacker_ip: str` — fake attacker IP, e.g. `"185.220.101.47"`
- `layer: int | None` — 1, 2, or 3 if a MEDHIVE layer was triggered

Define an `EventBus` class:
- `subscribers: list` of WebSocket connections
- `async subscribe(ws)` — add subscriber
- `async unsubscribe(ws)` — remove subscriber
- `async publish(event: SimEvent)` — serialize event to JSON, send to all subscribers

### `canary.py` — Canary Logic

```python
CANARY_NODES = ["his", "ehr"]  # nodes that contain honeyrecords

def check_canary(node_id: str, action: str) -> bool:
    """Returns True if this action on this node fires a canary."""
    return node_id in CANARY_NODES and action in ["EXFILTRATE", "FILE_ACCESS"]
```

When canary fires, emit two events in sequence:
1. `EXFILTRATE` event on the node (severity: `warning`)
2. `CANARY_FIRE` event (severity: `critical`, message includes: "Canary token beacon received — exfiltration confirmed. Token: MH-[random 6 hex chars]. External IP: [attacker_ip]")

### `simulation.py` — Attacker Agent

The attacker is an async function `run_simulation(event_bus: EventBus)` that runs as a background task.

**Attacker state:**
- `current_node: str` — starts at `"gateway"` (entry point)
- `visited: set` — nodes already compromised
- `attacker_ip: str` — fixed fake IP `"185.220.101.47"`

**Attack loop — repeats indefinitely with reset after full run:**

Each iteration, pick the next action based on current node and visited set. Use `asyncio.sleep()` between actions with random delay between 2.5 and 5 seconds.

Action sequence per node visit:
1. `SCAN` — "Attacker scanning [node label] — discovered [N] open ports: [ports]" (severity: info)
2. `LOGIN_ATTEMPT` — "Brute-force login attempt on [node label]" (severity: warning)  
3. `LOGIN_SUCCESS` — "Credentials accepted on [node label] — shell access gained" (severity: warning)
4. If node has `has_honeyrecords=True`: `FILE_ACCESS` → then check canary → if fires: `EXFILTRATE` + `CANARY_FIRE`
5. `LATERAL_MOVE` — pick an unvisited neighbor, move there. Emit: "Pivoting from [current] to [next]" (severity: warning)
6. If ghost_pacs is reached: emit `LAYER_TRIGGER` — "Layer 2 activated — attacker entered ghost PACS node. Honeynet trap engaged." (severity: critical, layer: 2)

**When all nodes are visited:** sleep 8 seconds, reset state, restart loop. This keeps the demo running continuously.

**Layer trigger events:**
- Layer 1 triggered on first `LOGIN_ATTEMPT` at `gateway`: "Layer 1 — IoMT Gateway encrypted traffic intercepted and redirected to deception endpoint"
- Layer 2 triggered when attacker enters `ghost_pacs`
- Layer 3 triggered on first `CANARY_FIRE`

### `main.py` — FastAPI App

```python
app = FastAPI()

# CORS: allow all origins (hackathon demo)
# WebSocket endpoint: /ws
# On connect: add to event_bus subscribers, start simulation if not running
# On disconnect: remove from event_bus

# Also expose: GET /api/honeynet — returns full honeynet graph JSON for initial load
# Also expose: GET /api/reset — resets simulation state (for demo restarts)

# Start simulation as background task on app startup using lifespan
```

---

## Frontend Specification

### Tech Stack
- React 18 + Vite
- react-force-graph-2d (npm package) — network graph
- No CSS framework — custom CSS only
- WebSocket via native browser API (wrapped in custom hook)

### Visual Design — Dark Cyber Theme

**Color palette:**
```css
--bg-primary: #0a0e1a        /* near-black navy */
--bg-secondary: #111827      /* dark panel bg */
--bg-card: #1a2235           /* card surface */
--border: #1e3a5f            /* subtle blue border */
--accent-blue: #1d6fa4       /* MEDHIVE brand */
--accent-teal: #0ea5a0       /* layer 1 active */
--accent-amber: #d97706      /* warning */
--accent-red: #dc2626        /* critical / canary */
--text-primary: #e2e8f0      /* main text */
--text-secondary: #64748b    /* muted */
--text-mono: #a3e635         /* terminal green for logs */
--node-real: #1d6fa4         /* real nodes */
--node-honeypot: #dc2626     /* honeypot nodes */
--node-compromised: #d97706  /* visited by attacker */
--node-active: #ffffff       /* currently under attack */
```

**Typography:** Use `JetBrains Mono` (Google Fonts) for logs and monospace elements. Use `Inter` for UI labels and headings.

**Layout:** Full viewport. Three-column layout:
```
┌─────────────────────────────────────────────────────┐
│  HEADER: MEDHIVE logo + attacker IP + status badge  │
├──────────────────┬──────────────────┬───────────────┤
│                  │                  │               │
│  Network Graph   │   Event Log      │  Layer Status │
│  (center, large) │   (live scroll)  │  + Canary     │
│                  │                  │  Panel        │
│                  │                  │               │
└──────────────────┴──────────────────┴───────────────┘
```

Column widths: graph 50%, event log 30%, right panel 20%.

### `useWebSocket.js` Hook

```javascript
// Connects to ws://localhost:8000/ws
// On message: parse JSON, append to events array (max 100 events, FIFO)
// Expose: { events, connected, networkGraph }
// On open: fetch GET /api/honeynet for initial graph data
// Auto-reconnect on disconnect (3s delay)
```

### `NetworkGraph.jsx`

Use `react-force-graph-2d`. Feed it nodes and links from honeynet data.

**Node rendering:**
- Shape: circle, radius 8
- Color by state:
  - Default real node: `--node-real` (blue)
  - Honeypot node (type=honeypot): `--node-honeypot` (red)
  - Compromised (in visited set): `--node-compromised` (amber)
  - Current attacker position: `--node-active` (white, pulsing glow)
- Label below node: device label in small mono font
- On node click: show NodeDetail side panel

**Link rendering:**
- Color: `#1e3a5f` default
- Color: `#d97706` if the attacker has traversed this edge (show movement path)
- Width: 1.5px default, 2.5px traversed

**Attacker position:** render a small red triangle or dot floating on the active node, animated (CSS keyframe pulse).

**Canvas background:** `#0a0e1a`

**Update behavior:** When a `LATERAL_MOVE` event arrives, animate the active node change. When `CANARY_FIRE` arrives, briefly flash the node red.

### `EventLog.jsx`

Scrolling terminal-style feed. Auto-scrolls to bottom on new events.

Each event line:
```
[HH:MM:SS]  [SEVERITY BADGE]  message
```

Severity badge colors:
- `info` → dim blue background
- `warning` → amber background
- `critical` → red background, slight glow

Monospace font throughout. Max height: full column height with overflow-y scroll. New events appear at the bottom with a subtle fade-in animation (0.2s).

Show last 60 events maximum.

### `CanaryPanel.jsx`

Default state: shows "No canary events" with a subtle pulse animation on the canary icon.

When `CANARY_FIRE` event received:
- Panel background flashes red briefly (0.5s)
- Adds a canary card showing:
  - Token ID (e.g. `MH-4f2a91`)
  - Timestamp
  - Node where triggered
  - External IP
  - Layer 3 badge
- Cards stack (show last 3)
- Each card has a red left border

### `LayerStatus.jsx`

Three status indicators, one per MEDHIVE layer:

```
Layer 1 — IoMT Gateway          [ACTIVE / MONITORING]
Layer 2 — Honeynet              [ACTIVE / TRAP ENGAGED]  
Layer 3 — Honeyrecords          [ACTIVE / CANARY FIRED]
```

Default state: all show `MONITORING` in dim teal.
When a layer is triggered via `LAYER_TRIGGER` event: badge changes to the appropriate active state with a brief pulse animation and color shift to amber or red.

### `NodeDetail.jsx`

Side drawer that appears when a node is clicked in the graph (or when attacker moves to a node — auto-focus).

Shows:
- Node label + type badge
- OS, open ports
- Honeyrecord indicator (if applicable) — red badge "Contains Honeyrecords"
- Fake log entries in terminal style (from node's `logs` array)
- Current status: Compromised / Clean / Under Attack

---

## Run Instructions (include in README.md)

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Key Constraints for Codex

1. **No real network calls from the simulation** — all attacker actions are scripted/randomized in Python, no actual scanning or exploitation.
2. **WebSocket must handle multiple concurrent clients** — demo may be shown on multiple screens simultaneously.
3. **Simulation must auto-restart** after completing a full traversal of the honeynet — keeps demo running without manual reset.
4. **Frontend must handle WebSocket reconnection gracefully** — show a "Reconnecting..." badge in the header if connection drops.
5. **All event timestamps in ISO 8601 format** — frontend formats them to HH:MM:SS for display.
6. **Graph must be pre-populated with all nodes on load** — don't wait for simulation events to add nodes. Fetch honeynet on mount.
7. **Do not use any paid API or external service** — canary token firing is simulated, not a real DNS beacon.
8. **Keep backend stateless between WebSocket connections** — simulation state lives in a single module-level object, not per-connection.

---

## What Success Looks Like

When the demo runs:
1. Browser opens → network graph shows all 10 nodes, ghost PACS node visually distinct (red)
2. Simulation starts automatically — attacker begins at gateway
3. Every 3–4 seconds, an event fires — graph updates, event log scrolls
4. Attacker reaches HIS or EHR → canary panel fires → Layer 3 status turns red
5. Attacker enters ghost_pacs → Layer 2 triggers
6. Full cycle completes → resets and reruns
7. Clicking any node shows its fake logs in the detail panel

Total demo runtime per cycle: approximately 60–90 seconds.
