CANARY_NODES = ["his", "ehr"]


def check_canary(node_id: str, action: str) -> bool:
    """Return True when a simulated sensitive action touches honeyrecords."""
    return node_id in CANARY_NODES and action in ["EXFILTRATE", "FILE_ACCESS"]
