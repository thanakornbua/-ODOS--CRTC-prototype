from __future__ import annotations

import asyncio
import random
import secrets
from collections import deque
from datetime import datetime, timezone

from canary import check_canary
from events import EventBus, SimEvent
from honeynet import build_undirected_adjacency, get_node


ATTACKER_IP = "185.220.101.47"
VISIT_ORDER = [
    "gateway",
    "his",
    "ehr",
    "backup",
    "admin",
    "pacs",
    "ghost_pacs",
    "nhso",
    "monitor",
    "infusion",
]

ACTION_DELAY_RANGE = (0.55, 0.9)
MOVE_DELAY_RANGE = (2.2, 3.2)
RESET_DELAY_SECONDS = 8


class SimulationState:
    def __init__(self) -> None:
        self.cycle = 0
        self.reset_event = asyncio.Event()
        self.current_node = "gateway"
        self.visited: set[str] = set()
        self.traversed_edges: set[tuple[str, str]] = set()
        self.layer1_triggered = False
        self.layer2_triggered = False
        self.layer3_triggered = False

    def begin_cycle(self) -> None:
        self.cycle += 1
        self.current_node = "gateway"
        self.visited = set()
        self.traversed_edges = set()
        self.layer1_triggered = False
        self.layer2_triggered = False
        self.layer3_triggered = False
        self.reset_event.clear()

    def request_reset(self) -> None:
        self.current_node = "gateway"
        self.visited = set()
        self.traversed_edges = set()
        self.layer1_triggered = False
        self.layer2_triggered = False
        self.layer3_triggered = False
        self.reset_event.set()


STATE = SimulationState()
ADJACENCY = build_undirected_adjacency()


def reset_simulation_state() -> None:
    STATE.request_reset()


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ports_for_message(node: dict) -> str:
    return ", ".join(str(port) for port in node["ports"])


def _shortest_path(source: str, target: str) -> list[str]:
    if source == target:
        return [source]

    queue: deque[list[str]] = deque([[source]])
    seen = {source}

    while queue:
        path = queue.popleft()
        for neighbor in ADJACENCY[path[-1]]:
            if neighbor in seen:
                continue
            next_path = [*path, neighbor]
            if neighbor == target:
                return next_path
            seen.add(neighbor)
            queue.append(next_path)

    return [source, target]


async def _sleep_for(seconds: float) -> bool:
    if STATE.reset_event.is_set():
        return True

    try:
        await asyncio.wait_for(STATE.reset_event.wait(), timeout=seconds)
        return True
    except TimeoutError:
        return False


async def _pause(delay_range: tuple[float, float]) -> bool:
    return await _sleep_for(random.uniform(*delay_range))


async def _emit(
    event_bus: EventBus,
    event_type: str,
    node_id: str,
    message: str,
    severity: str,
    *,
    layer: int | None = None,
    source_node_id: str | None = None,
    target_node_id: str | None = None,
    token: str | None = None,
) -> None:
    await event_bus.publish(
        SimEvent(
            type=event_type,
            node_id=node_id,
            timestamp=_timestamp(),
            message=message,
            severity=severity,
            attacker_ip=ATTACKER_IP,
            layer=layer,
            source_node_id=source_node_id,
            target_node_id=target_node_id,
            token=token,
            cycle=STATE.cycle,
        )
    )


async def _visit_node(event_bus: EventBus, node_id: str) -> bool:
    node = get_node(node_id)
    STATE.current_node = node_id

    await _emit(
        event_bus,
        "SCAN",
        node_id,
        f"Attacker scanning {node['label']} - discovered {len(node['ports'])} open ports: {_ports_for_message(node)}",
        "info",
    )
    if await _pause(ACTION_DELAY_RANGE):
        return False

    await _emit(
        event_bus,
        "LOGIN_ATTEMPT",
        node_id,
        f"Brute-force login attempt on {node['label']}",
        "warning",
    )

    if node_id == "gateway" and not STATE.layer1_triggered:
        STATE.layer1_triggered = True
        await _emit(
            event_bus,
            "LAYER_TRIGGER",
            node_id,
            "Layer 1 - IoMT Gateway encrypted traffic intercepted and redirected to deception endpoint",
            "warning",
            layer=1,
        )

    if await _pause(ACTION_DELAY_RANGE):
        return False

    STATE.visited.add(node_id)
    await _emit(
        event_bus,
        "LOGIN_SUCCESS",
        node_id,
        f"Credentials accepted on {node['label']} - shell access gained",
        "warning",
    )
    if await _pause(ACTION_DELAY_RANGE):
        return False

    if node["has_honeyrecords"]:
        await _emit(
            event_bus,
            "FILE_ACCESS",
            node_id,
            f"Sensitive patient export accessed on {node['label']}",
            "warning",
        )
        if await _pause(ACTION_DELAY_RANGE):
            return False

        if check_canary(node_id, "FILE_ACCESS"):
            await _emit(
                event_bus,
                "EXFILTRATE",
                node_id,
                f"Outbound transfer staged from {node['label']} to external host {ATTACKER_IP}",
                "warning",
            )
            if await _pause(ACTION_DELAY_RANGE):
                return False

            token = f"MH-{secrets.token_hex(3)}"
            STATE.layer3_triggered = True
            await _emit(
                event_bus,
                "CANARY_FIRE",
                node_id,
                f"Canary token beacon received - exfiltration confirmed. Token: {token}. External IP: {ATTACKER_IP}",
                "critical",
                layer=3,
                token=token,
            )
            if await _pause(ACTION_DELAY_RANGE):
                return False

    return True


async def _move_to(event_bus: EventBus, target_node_id: str) -> bool:
    path = _shortest_path(STATE.current_node, target_node_id)
    for next_node_id in path[1:]:
        source_node = get_node(STATE.current_node)
        target_node = get_node(next_node_id)
        source_id = STATE.current_node
        STATE.current_node = next_node_id
        STATE.traversed_edges.add((source_id, next_node_id))

        await _emit(
            event_bus,
            "LATERAL_MOVE",
            next_node_id,
            f"Pivoting from {source_node['label']} to {target_node['label']}",
            "warning",
            source_node_id=source_id,
            target_node_id=next_node_id,
        )

        if next_node_id == "ghost_pacs" and not STATE.layer2_triggered:
            STATE.layer2_triggered = True
            await _emit(
                event_bus,
                "LAYER_TRIGGER",
                next_node_id,
                "Layer 2 activated - attacker entered ghost PACS node. Honeynet trap engaged.",
                "critical",
                layer=2,
            )

        if await _pause(MOVE_DELAY_RANGE):
            return False

    return True


async def run_simulation(event_bus: EventBus) -> None:
    while True:
        STATE.begin_cycle()

        for index, node_id in enumerate(VISIT_ORDER):
            if STATE.reset_event.is_set():
                break

            if node_id not in STATE.visited:
                if not await _visit_node(event_bus, node_id):
                    break

            if index < len(VISIT_ORDER) - 1:
                if not await _move_to(event_bus, VISIT_ORDER[index + 1]):
                    break

        if STATE.reset_event.is_set():
            continue

        await _sleep_for(RESET_DELAY_SECONDS)
