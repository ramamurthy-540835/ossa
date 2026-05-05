"""OSSA Agent Dashboard - FastAPI Backend"""

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
import json
import re
from datetime import datetime
from typing import AsyncGenerator

from config import settings
from schemas.api import ExecuteAgentRequest, ApproveExecutionRequest, CreateManifestRequest, UpdateManifestRequest
from ossa.executor import executor
import registry as reg

app = FastAPI(title=settings.app_name, debug=settings.debug)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routes

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": "0.1.0"
    }


@app.get("/api/manifests")
async def list_manifests():
    """List all available manifests"""
    manifests = executor.list_manifests()
    return {
        "count": len(manifests),
        "manifests": manifests
    }


@app.get("/api/manifests/{manifest_name}")
async def get_manifest(manifest_name: str):
    """Get manifest details"""
    manifest = executor.get_manifest(manifest_name)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Manifest not found: {manifest_name}")

    return {
        "name": manifest.metadata.name,
        "version": manifest.metadata.version,
        "description": manifest.metadata.description,
        "provider": manifest.spec.llm.provider,
        "model": manifest.spec.llm.model,
        "temperature": manifest.spec.llm.temperature,
        "maxTokens": manifest.spec.llm.maxTokens,
        "role": manifest.spec.role,
        "compliance": {
            "frameworks": manifest.spec.compliance.frameworks,
            "classification": manifest.spec.compliance.dataClassification
        },
        "cost": manifest.spec.cost.spendLimits,
        "hitl_enabled": manifest.spec.hitl.enabled,
        "trust_tier": manifest.spec.trust.tier
    }


@app.post("/api/agent/execute")
async def execute_agent(request: ExecuteAgentRequest):
    """Start agent execution"""
    try:
        execution_id = executor.start_execution(request.manifest_name, request.input)
        return {
            "execution_id": execution_id,
            "status": "started",
            "streaming": True
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/agent/status/{execution_id}")
async def get_execution_status(execution_id: str):
    """Get execution status"""
    status = executor.get_execution_status(execution_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Execution not found: {execution_id}")

    return status


@app.post("/api/agent/approve")
async def approve_execution(request: ApproveExecutionRequest):
    """Approve HITL execution"""
    success = executor.approve_execution(request.execution_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Execution not found: {request.execution_id}")

    return {
        "execution_id": request.execution_id,
        "approved": request.approved,
        "status": "updated"
    }


async def event_generator(execution_id: str) -> AsyncGenerator[str, None]:
    """Generate SSE events for execution streaming"""
    async for event in executor.execute_agent_stream(execution_id):
        yield f"data: {json.dumps(event)}\n\n"


@app.get("/api/agent/events/{execution_id}")
async def stream_execution_events(execution_id: str):
    """Stream execution events via SSE"""
    return StreamingResponse(
        event_generator(execution_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@app.post("/api/manifests")
async def create_manifest(request: CreateManifestRequest):
    """Create a new agent manifest YAML file"""
    name = re.sub(r'[^a-z0-9-]', '-', request.name.lower()).strip('-')
    if not name:
        raise HTTPException(status_code=400, detail="Invalid manifest name")

    manifest_file = settings.manifests_dir / f"{name}.ossa.yaml"
    if manifest_file.exists():
        raise HTTPException(status_code=409, detail=f"Manifest '{name}' already exists")

    hitl_section = ""
    if request.hitl_enabled:
        hitl_section = """
  hitl:
    enabled: true
    interventionPoints:
      - id: pre_execution
        trigger:
          type: on_condition
          condition: input_size > 5000
        mode: ALWAYS
        approvers:
          - supervisor"""
    else:
        hitl_section = """
  hitl:
    enabled: false
    interventionPoints: []"""

    frameworks_yaml = "\n".join(f"      - {f}" for f in request.compliance_frameworks)

    yaml_content = f"""apiVersion: ossa/v0.4.6
kind: Agent
metadata:
  name: {name}
  version: 1.0.0
  description: {request.description}
  labels:
    owner: demo-team

spec:
  role: |
{chr(10).join("    " + line for line in request.role.splitlines())}

  llm:
    provider: {request.provider}
    model: {request.model}
    temperature: {request.temperature}
    maxTokens: {request.max_tokens}

  compliance:
    frameworks:
{frameworks_yaml}
    dataClassification: {request.data_classification}
    retentionPolicy:
      duration: 90d
      autoDelete: true

  cost:
    tokenBudget:
      perExecution: {request.token_budget_per_execution}
      daily: 10000
    spendLimits:
      daily: {request.daily_spend_limit}
      alert_threshold: {round(request.daily_spend_limit * 0.8, 2)}{hitl_section}

  trust:
    tier: {request.trust_tier}
    verificationDate: "{datetime.now().strftime('%Y-%m-%d')}"
    verifiedBy: demo-org

  observability:
    auditLog:
      enabled: true
      level: detailed
    logging:
      level: INFO
"""
    manifest_file.write_text(yaml_content)
    agent_uuid = reg.register(
        slug=name,
        display_name=request.name,
        description=request.description,
        use_cases=getattr(request, 'use_cases', []),
        requirements=getattr(request, 'requirements', []),
        tags=getattr(request, 'tags', []),
    )
    return {"name": name, "uuid": agent_uuid, "created": True, "file": f"{name}.ossa.yaml"}


@app.delete("/api/manifests/{manifest_name}")
async def delete_manifest(manifest_name: str):
    """Delete a manifest YAML file"""
    manifest_file = settings.manifests_dir / f"{manifest_name}.ossa.yaml"
    if not manifest_file.exists():
        raise HTTPException(status_code=404, detail=f"Manifest not found: {manifest_name}")
    manifest_file.unlink()
    reg.delete_by_slug(manifest_name)
    return {"name": manifest_name, "deleted": True}


@app.put("/api/manifests/{manifest_name}")
async def update_manifest(manifest_name: str, request: UpdateManifestRequest):
    """Patch editable fields of an existing manifest and rewrite the YAML"""
    manifest = executor.get_manifest(manifest_name)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Manifest not found: {manifest_name}")

    # Resolve current values then apply patches
    cur = manifest.spec
    description  = request.description  if request.description  is not None else manifest.metadata.description
    role         = request.role         if request.role         is not None else cur.role
    provider     = request.provider     if request.provider     is not None else cur.llm.provider
    model        = request.model        if request.model        is not None else cur.llm.model
    temperature  = request.temperature  if request.temperature  is not None else cur.llm.temperature
    max_tokens   = request.max_tokens   if request.max_tokens   is not None else cur.llm.maxTokens
    frameworks   = request.compliance_frameworks if request.compliance_frameworks is not None else cur.compliance.frameworks
    data_cls     = request.data_classification   if request.data_classification   is not None else cur.compliance.dataClassification
    daily_limit  = request.daily_spend_limit     if request.daily_spend_limit     is not None else cur.cost.spendLimits.get("daily", 1.0)
    token_budget = request.token_budget_per_execution if request.token_budget_per_execution is not None else cur.cost.tokenBudget.perExecution
    hitl_enabled = request.hitl_enabled if request.hitl_enabled is not None else cur.hitl.enabled
    trust_tier   = request.trust_tier   if request.trust_tier   is not None else cur.trust.tier

    if hitl_enabled:
        hitl_section = """
  hitl:
    enabled: true
    interventionPoints:
      - id: pre_execution
        trigger:
          type: on_condition
          condition: input_size > 5000
        mode: ALWAYS
        approvers:
          - supervisor"""
    else:
        hitl_section = """
  hitl:
    enabled: false
    interventionPoints: []"""

    frameworks_yaml = "\n".join(f"      - {f}" for f in frameworks)

    yaml_content = f"""apiVersion: ossa/v0.4.6
kind: Agent
metadata:
  name: {manifest_name}
  version: {manifest.metadata.version}
  description: {description}
  labels:
    owner: demo-team

spec:
  role: |
{chr(10).join("    " + line for line in role.splitlines())}

  llm:
    provider: {provider}
    model: {model}
    temperature: {temperature}
    maxTokens: {max_tokens}

  compliance:
    frameworks:
{frameworks_yaml}
    dataClassification: {data_cls}
    retentionPolicy:
      duration: 90d
      autoDelete: true

  cost:
    tokenBudget:
      perExecution: {token_budget}
      daily: 10000
    spendLimits:
      daily: {daily_limit}
      alert_threshold: {round(float(daily_limit) * 0.8, 2)}{hitl_section}

  trust:
    tier: {trust_tier}
    verificationDate: "{manifest.spec.trust.verificationDate or datetime.now().strftime('%Y-%m-%d')}"
    verifiedBy: demo-org

  observability:
    auditLog:
      enabled: true
      level: detailed
    logging:
      level: INFO
"""
    manifest_file = settings.manifests_dir / f"{manifest_name}.ossa.yaml"
    manifest_file.write_text(yaml_content)

    # Return the refreshed manifest details
    updated = executor.get_manifest(manifest_name)
    return {
        "name": manifest_name,
        "updated": True,
        "manifest": {
            "name": updated.metadata.name,
            "version": updated.metadata.version,
            "description": updated.metadata.description,
            "provider": updated.spec.llm.provider,
            "model": updated.spec.llm.model,
            "temperature": updated.spec.llm.temperature,
            "maxTokens": updated.spec.llm.maxTokens,
            "role": updated.spec.role,
            "compliance": {
                "frameworks": updated.spec.compliance.frameworks,
                "classification": updated.spec.compliance.dataClassification,
            },
            "cost": updated.spec.cost.spendLimits,
            "hitl_enabled": updated.spec.hitl.enabled,
            "trust_tier": updated.spec.trust.tier,
        }
    }


@app.get("/api/registry")
async def get_registry():
    """List all agents from the UUID registry"""
    return {"agents": reg.list_all()}


@app.patch("/api/registry/{agent_uuid}")
async def patch_registry(agent_uuid: str, payload: dict):
    """Update registry metadata (display_name, use_cases, requirements, tags)"""
    allowed = {"display_name", "use_cases", "requirements", "tags", "description"}
    filtered = {k: v for k, v in payload.items() if k in allowed}
    if not reg.update(agent_uuid, **filtered):
        raise HTTPException(status_code=404, detail="Agent UUID not found")
    return {"uuid": agent_uuid, "updated": True}


@app.post("/api/recommend")
async def recommend_agents(payload: dict):
    """Use Gemini to recommend agents for a use case, with confidence scores.
    Also optionally generates a new manifest definition."""
    use_case = payload.get("use_case", "").strip()
    scenario = payload.get("scenario", "").strip()
    if not use_case:
        raise HTTPException(status_code=400, detail="use_case is required")

    # Build context from available manifests
    manifests = executor.list_manifests()
    agents_ctx = "\n".join(
        f"- {m['name']}: {m['description']} (provider={m['provider']}, compliance={m['compliance']['frameworks']})"
        for m in manifests
    )

    prompt = f"""You are an OSSA agent governance advisor. Given the available agents and a user use case, respond with a JSON object (no markdown, no code fences, raw JSON only).

Available agents:
{agents_ctx if agents_ctx else "No agents defined yet."}

User use case: {use_case}
Additional scenario context: {scenario or "None provided"}

Respond with this exact JSON shape:
{{
  "recommendations": [
    {{
      "agent_name": "existing-agent-slug",
      "confidence": 0.92,
      "reasoning": "Why this agent fits",
      "gaps": ["What it lacks for this use case"]
    }}
  ],
  "suggest_new": true,
  "new_agent": {{
    "display_name": "Human readable title",
    "slug": "kebab-case-slug",
    "description": "One sentence description",
    "role": "Detailed system prompt for the agent",
    "provider": "gemini",
    "model": "gemini-2.5-flash",
    "temperature": 0.3,
    "max_tokens": 2048,
    "compliance_frameworks": ["SOC2"],
    "data_classification": "internal",
    "daily_spend_limit": 1.0,
    "token_budget_per_execution": 2000,
    "hitl_enabled": false,
    "trust_tier": "org-verified",
    "use_cases": ["list of use cases this covers"],
    "tags": ["relevant", "tags"],
    "requirements": [
      {{
        "id": "REQ-001",
        "title": "Requirement title",
        "description": "What this requirement demands",
        "mapped": true,
        "confidence": 0.85
      }}
    ]
  }},
  "summary": "Brief explanation of your recommendation"
}}

Rules:
- Only include agents in recommendations that actually fit (confidence >= 0.5).
- Set suggest_new=true if no existing agent covers the use case well (best confidence < 0.75), or if a specialised agent would significantly improve outcomes.
- If suggest_new=false, set new_agent to null.
- Infer 2-5 plausible requirements from the use case and map them.
- Return raw JSON only, no explanation text outside the JSON."""

    api_key = settings.gemini_api_key or settings.google_api_key
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")

    from providers.gemini import GeminiProvider
    provider = GeminiProvider(api_key, "gemini-2.5-flash")
    result = provider.call_sync(
        system_prompt="You are an OSSA agent governance advisor. Return raw JSON only.",
        user_message=prompt,
        temperature=0.2,
        max_tokens=2048,
    )

    if result["status"] != "success":
        raise HTTPException(status_code=502, detail=f"LLM error: {result.get('error')}")

    raw = result["output"].strip()
    # Strip markdown code fences if the model wraps them anyway
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=502, detail=f"LLM returned invalid JSON: {e}")

    return parsed


@app.post("/api/generate-requirements")
async def generate_requirements(payload: dict):
    """AI-generate requirement mappings for any agent based on its description, role, and use-cases."""
    description = payload.get("description", "")
    role        = payload.get("role", "")[:600]
    use_cases   = payload.get("use_cases", [])
    compliance  = payload.get("compliance_frameworks", [])
    tags        = payload.get("tags", [])

    prompt = f"""You are an OSSA requirements engineer. Generate a concise set of requirement mappings for the AI agent below.

Agent description: {description}
Use cases: {', '.join(use_cases) if use_cases else 'not specified'}
Compliance frameworks: {', '.join(compliance) if compliance else 'SOC2'}
Tags: {', '.join(tags) if tags else ''}
System role (excerpt): {role}

Generate 3 to 6 requirements that this agent must satisfy.
For each requirement:
- id: use format REQ-<3-LETTER-DOMAIN>-NN (e.g. REQ-SEC-01 for security, REQ-CODE-01 for coding)
- title: short, action-oriented name (max 6 words)
- description: one sentence — what the agent must do or guarantee
- mapped: true
- confidence: float 0.0–1.0 reflecting how clearly the role description covers this requirement

Return ONLY a JSON array — no prose, no markdown fences:
[
  {{"id": "REQ-XXX-01", "title": "...", "description": "...", "mapped": true, "confidence": 0.90}},
  ...
]"""

    api_key = settings.gemini_api_key or settings.google_api_key
    from providers.gemini import GeminiProvider
    # Use flash with thinking disabled (budget=0) — simple JSON, no reasoning needed
    provider = GeminiProvider(api_key, "gemini-2.5-flash", thinking_budget=0)
    result = provider.call_sync(
        system_prompt="You are an OSSA requirements engineer. Return raw JSON only.",
        user_message=prompt,
        temperature=0.2,
        max_tokens=4096,
    )

    if result["status"] != "success":
        raise HTTPException(status_code=502, detail=f"LLM error: {result.get('error')}")

    raw = result["output"].strip()

    # Strip markdown fences only at the START and END (never inside string values)
    raw = raw.strip()
    if raw.startswith('```'):
        nl = raw.find('\n')
        raw = raw[nl + 1:] if nl != -1 else raw[3:]
    raw = raw.strip()
    if raw.endswith('```'):
        raw = raw[:-3].rstrip()
    raw = raw.strip()

    # Try direct parse first, then bracket-extraction fallback
    reqs = None
    parse_err = ""
    try:
        reqs = json.loads(raw)
    except json.JSONDecodeError as e:
        parse_err = str(e)
        start = raw.find('[')
        end = raw.rfind(']')
        if start != -1 and end != -1 and end > start:
            try:
                reqs = json.loads(raw[start:end + 1])
            except json.JSONDecodeError as e2:
                parse_err = str(e2)

    if reqs is None:
        raise HTTPException(status_code=502, detail="LLM returned unparseable output")

    if not isinstance(reqs, list):
        raise HTTPException(status_code=502, detail="LLM did not return a JSON array")

    # Normalise fields
    for r in reqs:
        r.setdefault("mapped", True)
        r.setdefault("confidence", 0.8)
        if isinstance(r.get("confidence"), str):
            try:
                r["confidence"] = float(r["confidence"])
            except ValueError:
                r["confidence"] = 0.8

    return {"requirements": reqs}


# ── Docs endpoints ────────────────────────────────────────────────────────────

import os as _os

DOCS_DIR = _os.path.join(_os.path.dirname(__file__), "..", "docs")

@app.post("/api/suggest-prompts")
async def suggest_prompts(payload: dict):
    """Generate 3 contextual example prompts for a selected agent."""
    agent_name  = payload.get("agent_name", "")
    description = payload.get("description", "")
    role        = payload.get("role", "")[:400]

    prompt = f"""You are helping a user understand how to use an AI agent.

Agent: {agent_name}
Description: {description}
System role (excerpt): {role}

Generate exactly 3 specific, realistic example prompts a user could send to this agent.
Each should demonstrate a different use case.
Return ONLY a JSON array of 3 strings — no prose, no fences:
["prompt 1", "prompt 2", "prompt 3"]"""

    api_key = settings.gemini_api_key or settings.google_api_key
    from providers.gemini import GeminiProvider
    provider = GeminiProvider(api_key, "gemini-2.5-flash", thinking_budget=0)
    result = provider.call_sync(
        system_prompt="Return raw JSON only.",
        user_message=prompt,
        temperature=0.4,
        max_tokens=512,
    )
    if result["status"] != "success":
        raise HTTPException(status_code=502, detail=result.get("error"))

    raw = result["output"].strip()
    if raw.startswith("```"):
        nl = raw.find("\n"); raw = raw[nl + 1:] if nl != -1 else raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3].rstrip()
    raw = raw.strip()

    try:
        prompts = json.loads(raw)
        if not isinstance(prompts, list):
            raise ValueError("not a list")
    except Exception:
        start = raw.find("["); end = raw.rfind("]")
        prompts = json.loads(raw[start:end + 1]) if start != -1 and end > start else []

    return {"prompts": prompts[:5]}


@app.post("/api/generate-role")
async def generate_role(payload: dict):
    """AI-generate a system role from agent display name, description, and use cases."""
    display_name = payload.get("display_name", "")
    description  = payload.get("description", "")
    use_cases    = payload.get("use_cases", [])
    compliance   = payload.get("compliance_frameworks", [])
    tags         = payload.get("tags", [])

    prompt = f"""Write a professional system role (system prompt) for an AI agent.

Name: {display_name}
Description: {description}
Use cases: {', '.join(use_cases) if use_cases else 'not specified'}
Compliance requirements: {', '.join(compliance) if compliance else 'SOC2'}
Tags: {', '.join(tags) if tags else ''}

Requirements for the system role:
1. Begin with "You are [role name]..."
2. State 3-5 specific capabilities or responsibilities
3. Include any compliance or safety constraints
4. Mention output format expectations if relevant
5. Be concise — 80-150 words maximum
6. Write in second person ("You are...", "Your task is to...")

Return ONLY the system role text. No preamble, no explanation, no markdown."""

    api_key = settings.gemini_api_key or settings.google_api_key
    from providers.gemini import GeminiProvider
    provider = GeminiProvider(api_key, "gemini-2.5-flash", thinking_budget=0)
    result = provider.call_sync(
        system_prompt="You write precise AI agent system prompts.",
        user_message=prompt,
        temperature=0.3,
        max_tokens=512,
    )
    if result["status"] != "success":
        raise HTTPException(status_code=502, detail=result.get("error"))

    return {"role": result["output"].strip()}


@app.get("/api/docs")
async def list_docs():
    """List available helper documents."""
    try:
        files = [f for f in _os.listdir(DOCS_DIR) if f.endswith(".md")]
        return {"docs": sorted(files)}
    except FileNotFoundError:
        return {"docs": []}

@app.get("/api/docs/{filename}")
async def get_doc(filename: str):
    """Return raw markdown content for a helper document."""
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = _os.path.join(DOCS_DIR, filename)
    if not _os.path.isfile(path):
        raise HTTPException(status_code=404, detail=f"Doc not found: {filename}")
    with open(path, "r", encoding="utf-8") as fh:
        content = fh.read()
    return Response(content=content, media_type="text/plain; charset=utf-8")


@app.get("/api/artifacts/{execution_id}/download")
async def download_artifact(execution_id: str, fmt: str = "md"):
    """Download execution result as a file"""
    status = executor.get_execution_status(execution_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Execution not found: {execution_id}")

    response_text = status.get("response_text", "")
    manifest_name = status.get("manifest_name", "agent")
    cost = status.get("cost_summary", {})
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if fmt == "json":
        content = json.dumps({
            "execution_id": execution_id,
            "manifest": manifest_name,
            "timestamp": timestamp,
            "response": response_text,
            "cost_summary": cost,
            "status": status.get("status")
        }, indent=2)
        media_type = "application/json"
        filename = f"ossa-{manifest_name}-{execution_id[:8]}.json"
    else:
        # Markdown format
        content = f"""# OSSA Execution Result

**Agent:** {manifest_name}
**Execution ID:** `{execution_id}`
**Timestamp:** {timestamp}
**Status:** {status.get('status', 'unknown')}

## Response

{response_text}

## Cost Summary

- Estimated cost: ${cost.get('cost', {}).get('estimated_usd', 0):.6f}
- Total tokens: {cost.get('tokens', {}).get('total', 0):,}
- Input tokens: {cost.get('tokens', {}).get('input', 0):,}
- Output tokens: {cost.get('tokens', {}).get('output', 0):,}
"""
        media_type = "text/markdown"
        filename = f"ossa-{manifest_name}-{execution_id[:8]}.md"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.get("/api/audit/logs")
async def get_audit_logs(execution_id: str = None):
    """Get audit logs for an execution"""
    if execution_id:
        status = executor.get_execution_status(execution_id)
        if not status:
            raise HTTPException(status_code=404, detail=f"Execution not found: {execution_id}")
        return {
            "execution_id": execution_id,
            "events": status.get("events", [])
        }

    # Return all executions
    return {
        "total": len(executor.executions),
        "executions": [ctx.to_dict() for ctx in executor.executions.values()]
    }


# ── Model Intelligence endpoints ───────────────────────────────────────────────

from ossa.multi_model_graph import MODEL_REGISTRY, TASK_TYPES, MULTI_MODEL_GRAPH

@app.get("/api/models")
async def list_models():
    """Return all models with pricing and capability metadata."""
    return {"models": MODEL_REGISTRY}


@app.post("/api/analyze-task")
async def analyze_task(payload: dict):
    """Analyse user input and return task classification + model recommendation."""
    user_input = payload.get("input", "")
    if not user_input.strip():
        raise HTTPException(status_code=422, detail="input required")

    task_list = list(TASK_TYPES.keys())
    prompt = f"""Classify this user request for an AI agent.

Input: {user_input[:2000]}

Task types: {task_list}

Return JSON only:
{{
  "task_type": "<one of: {', '.join(task_list)}>",
  "complexity": "low|medium|high",
  "estimated_output_tokens": <integer 500-8000>,
  "recommended_model": "<model id>",
  "recommendation_reason": "<one sentence>",
  "alternatives": [
    {{"model": "<id>", "tradeoff": "<one sentence cost vs quality note>"}},
    {{"model": "<id>", "tradeoff": "<one sentence>"}}
  ]
}}"""

    api_key = settings.gemini_api_key or settings.google_api_key
    from providers.gemini import GeminiProvider
    provider = GeminiProvider(api_key, "gemini-2.5-flash", thinking_budget=0)
    result = provider.call_sync("Return concise JSON only.", prompt, temperature=0.1, max_tokens=512)
    if result["status"] != "success":
        raise HTTPException(status_code=502, detail=result.get("error"))

    raw = result["output"].strip()
    if raw.startswith("```"):
        nl = raw.find("\n"); raw = raw[nl + 1:] if nl != -1 else raw[3:]
    if raw.endswith("```"): raw = raw[:-3].rstrip()
    raw = raw.strip()

    try:
        data = json.loads(raw)
    except Exception:
        s = raw.find("{"); e = raw.rfind("}")
        data = json.loads(raw[s:e + 1]) if s != -1 and e > s else {}

    # Validate recommended model exists in registry; fall back to flash
    if data.get("recommended_model") not in MODEL_REGISTRY:
        task_type = data.get("task_type", "general")
        data["recommended_model"] = TASK_TYPES.get(task_type, {}).get("recommend", "gemini-2.5-flash")

    # Attach full model metadata for the recommendation
    rec_model = data.get("recommended_model", "gemini-2.5-flash")
    data["recommended_model_meta"] = MODEL_REGISTRY.get(rec_model, {})

    return data


@app.post("/api/agent/execute-multi")
async def execute_multi_model(payload: dict):
    """Run multi-model LangGraph execution: analyze→plan→execute→review→synthesize."""
    manifest_name = payload.get("manifest_name", "")
    user_input    = payload.get("input", "")

    if not manifest_name or not user_input.strip():
        raise HTTPException(status_code=422, detail="manifest_name and input required")

    from ossa.manifest import ManifestLoader
    loader = ManifestLoader(settings.manifests_dir)
    manifest = loader.load(manifest_name)
    if not manifest:
        raise HTTPException(status_code=404, detail=f"Manifest not found: {manifest_name}")

    import uuid
    execution_id = str(uuid.uuid4())

    # Run graph synchronously in a thread to not block the event loop
    import asyncio
    loop = asyncio.get_event_loop()

    def run_graph():
        state = {
            "input": user_input,
            "system_role": manifest.role or "",
            "task_type": "",
            "complexity": "",
            "recommended_model": "gemini-2.5-flash",
            "estimated_tokens": 2000,
            "plan": "",
            "primary_output": "",
            "review_notes": "",
            "final_output": "",
            "models_used": [],
            "stage_events": [],
            "total_cost": 0.0,
        }
        result = MULTI_MODEL_GRAPH.invoke(state)
        return result

    result = await loop.run_in_executor(None, run_graph)

    return {
        "execution_id": execution_id,
        "task_type":         result.get("task_type"),
        "complexity":        result.get("complexity"),
        "recommended_model": result.get("recommended_model"),
        "plan":              result.get("plan"),
        "output":            result.get("final_output"),
        "review_notes":      result.get("review_notes"),
        "models_used":       result.get("models_used", []),
        "total_cost":        result.get("total_cost", 0),
        "stage_events":      result.get("stage_events", []),
    }


if __name__ == "__main__":
    import uvicorn

    print(f"🚀 Starting {settings.app_name}")
    print(f"📍 http://{settings.host}:{settings.port}")
    print(f"📚 Manifests: {settings.manifests_dir}")

    uvicorn.run(app, host=settings.host, port=settings.port)
