# MEDHIVE

Hackathon prototype for a proactive cyber defense simulation dashboard. The backend runs a scripted attacker through a fake hospital IoMT honeynet and streams events over WebSocket. The frontend visualizes movement, canary fires, layer triggers, and device logs in real time.

No real scanning, exploitation, DNS beaconing, or external attacker tooling is used. The entire attack flow is simulated in memory.

## Run Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

If `uvicorn` is not on PATH after install, run it through Python:

```bash
python -m uvicorn main:app --reload --port 8000
```

API endpoints:

```text
GET /api/honeynet
GET /api/reset
WS  /ws
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard opens at:

```text
http://localhost:5173
```

On Windows PowerShell, if `npm` is blocked by execution policy, use the `.cmd` shim:

```powershell
npm.cmd install
npm.cmd run dev
```

## Demo Flow

1. Start the backend on port `8000`.
2. Start the frontend on port `5173`.
3. Open the dashboard and watch the attacker move through all 10 fake nodes.
4. HIS/EHR honeyrecord access fires canary alerts.
5. Ghost PACS triggers the honeynet trap layer.
6. The simulation resets and starts over automatically.
