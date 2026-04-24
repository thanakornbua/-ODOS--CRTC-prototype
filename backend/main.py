from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from events import EventBus
from honeynet import HONEYNET
from simulation import reset_simulation_state, run_simulation


event_bus = EventBus()
simulation_task: asyncio.Task | None = None


async def start_simulation() -> asyncio.Task:
    global simulation_task

    if simulation_task is None or simulation_task.done():
        simulation_task = asyncio.create_task(run_simulation(event_bus), name="medhive-simulation")

    return simulation_task


@asynccontextmanager
async def lifespan(app: FastAPI):
    await start_simulation()
    yield

    if simulation_task is not None:
        simulation_task.cancel()
        try:
            await simulation_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="MEDHIVE Simulation API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/honeynet")
async def get_honeynet() -> dict:
    return HONEYNET


@app.get("/api/reset")
async def reset_simulation() -> dict[str, str]:
    reset_simulation_state()
    await start_simulation()
    return {"status": "reset", "message": "Simulation state reset"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    await event_bus.subscribe(websocket)
    await start_simulation()

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await event_bus.unsubscribe(websocket)
    except Exception:
        await event_bus.unsubscribe(websocket)
