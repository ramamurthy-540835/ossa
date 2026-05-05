"""Agent UUID registry — decouples display names from YAML slugs"""

import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

REGISTRY_PATH = Path(__file__).parent / "data" / "registry.json"


def _load() -> Dict[str, Any]:
    try:
        return json.loads(REGISTRY_PATH.read_text())
    except Exception:
        return {"agents": {}}


def _save(data: Dict[str, Any]) -> None:
    REGISTRY_PATH.write_text(json.dumps(data, indent=2))


def register(slug: str, display_name: str, description: str,
             use_cases: list[str] | None = None,
             requirements: list[dict] | None = None,
             tags: list[str] | None = None) -> str:
    """Create a registry entry for a manifest. Returns UUID."""
    data = _load()
    agent_uuid = str(uuid.uuid4())
    data["agents"][agent_uuid] = {
        "uuid": agent_uuid,
        "slug": slug,
        "display_name": display_name,
        "description": description,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "use_cases": use_cases or [],
        "requirements": requirements or [],
        "tags": tags or [],
    }
    _save(data)
    return agent_uuid


def update(agent_uuid: str, **kwargs) -> bool:
    data = _load()
    if agent_uuid not in data["agents"]:
        return False
    data["agents"][agent_uuid].update(kwargs)
    data["agents"][agent_uuid]["updated_at"] = datetime.utcnow().isoformat()
    _save(data)
    return True


def delete_by_slug(slug: str) -> None:
    data = _load()
    data["agents"] = {
        k: v for k, v in data["agents"].items()
        if v.get("slug") != slug
    }
    _save(data)


def get_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    data = _load()
    for entry in data["agents"].values():
        if entry.get("slug") == slug:
            return entry
    return None


def get_by_uuid(agent_uuid: str) -> Optional[Dict[str, Any]]:
    return _load()["agents"].get(agent_uuid)


def list_all() -> list[Dict[str, Any]]:
    return list(_load()["agents"].values())
