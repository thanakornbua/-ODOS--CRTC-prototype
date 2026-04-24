from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Literal

from fastapi import WebSocket


EventType = Literal[
    "SCAN",
    "LOGIN_ATTEMPT",
    "LOGIN_SUCCESS",
    "LATERAL_MOVE",
    "FILE_ACCESS",
    "EXFILTRATE",
    "CANARY_FIRE",
    "LAYER_TRIGGER",
]

Severity = Literal["info", "warning", "critical"]


@dataclass
class SimEvent:
    type: EventType
    node_id: str
    timestamp: str
    message: str
    severity: Severity
    attacker_ip: str
    layer: int | None = None
    source_node_id: str | None = None
    target_node_id: str | None = None
    token: str | None = None
    cycle: int | None = None


class EventBus:
    def __init__(self) -> None:
        self.subscribers: list[WebSocket] = []

    async def subscribe(self, ws: WebSocket) -> None:
        if ws not in self.subscribers:
            self.subscribers.append(ws)

    async def unsubscribe(self, ws: WebSocket) -> None:
        if ws in self.subscribers:
            self.subscribers.remove(ws)

    async def publish(self, event: SimEvent) -> None:
        payload = asdict(event)
        stale_subscribers: list[WebSocket] = []

        for subscriber in list(self.subscribers):
            try:
                await subscriber.send_json(payload)
            except Exception:
                stale_subscribers.append(subscriber)

        for subscriber in stale_subscribers:
            await self.unsubscribe(subscriber)
