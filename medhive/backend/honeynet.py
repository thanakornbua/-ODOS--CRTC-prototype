HONEYNET = {
    "nodes": [
        {
            "id": "gateway",
            "label": "IoMT Gateway",
            "type": "gateway",
            "os": "Linux 5.4",
            "ports": [443, 8883],
            "has_honeyrecords": False,
            "logs": [
                "[2026-04-24 08:55:14] MQTT: device=infusion-07 topic=/ward/icu/pump qos=1 CONNECT",
                "[2026-04-24 09:04:28] TLS: client=10.12.4.22 cipher=TLS_AES_256_GCM_SHA384 ACCEPT",
                "[2026-04-24 09:21:33] ROUTE: src=10.12.4.41 dst=his.local proto=https ALLOW",
                "[2026-04-24 10:13:07] SYS: interface=eth0 link=up speed=1000Mbps",
            ],
        },
        {
            "id": "his",
            "label": "Hospital HIS",
            "type": "server",
            "os": "Windows Server 2016",
            "ports": [445, 3389, 1433],
            "has_honeyrecords": True,
            "logs": [
                "[2026-04-24 09:14:02] AUTH: user=nurse_01 src=192.168.1.45 ACCEPT",
                "[2026-04-24 09:31:17] DB: SELECT patient_records WHERE ward=ICU rows=142",
                "[2026-04-24 10:02:44] AUTH: user=admin src=192.168.1.10 ACCEPT",
                "[2026-04-24 10:25:39] SMB: share=clinical_docs user=ward_clerk READ",
            ],
        },
        {
            "id": "pacs",
            "label": "PACS Workstation",
            "type": "workstation",
            "os": "Windows 10",
            "ports": [104, 80, 445],
            "has_honeyrecords": False,
            "logs": [
                "[2026-04-24 08:47:51] DICOM: study=CT-771203 modality=CT STORE_OK",
                "[2026-04-24 09:22:05] HTTP: GET /viewer/study/CT-771203 status=200",
                "[2026-04-24 09:58:31] SMB: user=rad_tech src=192.168.1.63 session=opened",
                "[2026-04-24 10:19:11] DICOM: association=accepted peer=10.12.7.14 ae=PACS_AE",
            ],
        },
        {
            "id": "ehr",
            "label": "EHR Server",
            "type": "server",
            "os": "Linux 4.15",
            "ports": [443, 3306, 22],
            "has_honeyrecords": True,
            "logs": [
                "[2026-04-24 08:59:48] nginx: POST /api/vitals patient=MH-039218 status=201",
                "[2026-04-24 09:37:10] mysql: user=ehr_app query=UPDATE medications rows=1",
                "[2026-04-24 10:03:22] sshd: Accepted publickey for backup from 10.12.9.20",
                "[2026-04-24 10:41:06] audit: file=/srv/ehr/exports/ward_round.csv READ",
            ],
        },
        {
            "id": "infusion",
            "label": "Infusion Pump Ctrl",
            "type": "iot",
            "os": "VxWorks 6.9",
            "ports": [102, 20000],
            "has_honeyrecords": False,
            "logs": [
                "[2026-04-24 09:01:15] PLC: channel=medbus rate=4.0ml/h checksum=ok",
                "[2026-04-24 09:18:43] ALARM: pump=ICU-07 occlusion=false battery=91%",
                "[2026-04-24 09:50:08] CTRL: profile=saline order=ORD-120488 applied",
            ],
        },
        {
            "id": "monitor",
            "label": "Bedside Monitor",
            "type": "iot",
            "os": "QNX 7.0",
            "ports": [102, 2575],
            "has_honeyrecords": False,
            "logs": [
                "[2026-04-24 08:52:02] HL7: ORU_R01 patient=MH-028193 spo2=98 hr=74",
                "[2026-04-24 09:16:29] DEVICE: lead_status=attached battery=AC",
                "[2026-04-24 10:06:18] EXPORT: dest=his.local stream=vitals interval=5s",
            ],
        },
        {
            "id": "nhso",
            "label": "NHSO e-Claim GW",
            "type": "gateway",
            "os": "Linux 5.15",
            "ports": [443, 8080],
            "has_honeyrecords": False,
            "logs": [
                "[2026-04-24 09:05:54] CLAIM: batch=CLM-88421 records=38 status=queued",
                "[2026-04-24 09:44:13] TLS: remote=claim.nhso.example handshake=ok",
                "[2026-04-24 10:11:57] API: POST /claims/submit status=202 latency=418ms",
                "[2026-04-24 10:36:21] SYS: cron=eclaim-sync completed exit=0",
            ],
        },
        {
            "id": "admin",
            "label": "Admin Workstation",
            "type": "workstation",
            "os": "Windows 11",
            "ports": [445, 3389],
            "has_honeyrecords": False,
            "logs": [
                "[2026-04-24 08:49:28] AUTH: user=it_admin src=192.168.1.10 ACCEPT",
                "[2026-04-24 09:26:03] RDP: session=12 user=it_admin state=active",
                "[2026-04-24 09:55:45] GPO: policy=workstation-hardening applied",
                "[2026-04-24 10:32:14] SMB: copy \\\\backup\\configs\\his.ini status=ok",
            ],
        },
        {
            "id": "backup",
            "label": "Backup Server",
            "type": "server",
            "os": "Linux 4.19",
            "ports": [22, 873, 2049],
            "has_honeyrecords": False,
            "logs": [
                "[2026-04-24 02:10:00] rsync: job=his-daily files=1842 bytes=927MB complete",
                "[2026-04-24 03:30:11] nfsd: mount client=10.12.2.18 export=/vault/ehr",
                "[2026-04-24 09:13:40] sshd: Accepted publickey for admin from 192.168.1.10",
                "[2026-04-24 10:00:00] snapshot: volume=ehr-backup retention=7d created",
            ],
        },
        {
            "id": "ghost_pacs",
            "label": "Ghost PACS [FAKE]",
            "type": "honeypot",
            "os": "Windows 10",
            "ports": [104, 80],
            "has_honeyrecords": False,
            "logs": [
                "[2026-04-24 09:00:01] DICOM: fake_ae=GHOST_PACS listener=ready",
                "[2026-04-24 09:07:19] HTTP: GET /pacs/login status=200 decoy=true",
                "[2026-04-24 09:32:44] TRAP: credential_form rendered session=decoy-1932",
                "[2026-04-24 10:18:27] SENSOR: high_interaction_honeypot armed profile=pacs",
            ],
        },
    ],
    "links": [
        {"source": "gateway", "target": "his"},
        {"source": "gateway", "target": "infusion"},
        {"source": "gateway", "target": "monitor"},
        {"source": "his", "target": "ehr"},
        {"source": "his", "target": "pacs"},
        {"source": "his", "target": "admin"},
        {"source": "his", "target": "nhso"},
        {"source": "ehr", "target": "backup"},
        {"source": "ehr", "target": "nhso"},
        {"source": "pacs", "target": "his"},
        {"source": "pacs", "target": "ghost_pacs"},
        {"source": "admin", "target": "his"},
        {"source": "admin", "target": "backup"},
    ],
}


NODE_BY_ID = {node["id"]: node for node in HONEYNET["nodes"]}


def get_node(node_id: str) -> dict:
    return NODE_BY_ID[node_id]


def build_undirected_adjacency() -> dict[str, list[str]]:
    adjacency: dict[str, list[str]] = {node["id"]: [] for node in HONEYNET["nodes"]}
    for link in HONEYNET["links"]:
        source = link["source"]
        target = link["target"]
        adjacency[source].append(target)
        adjacency[target].append(source)
    return adjacency
