"""
OSSA Multi-Model LangGraph Orchestrator

Pipeline:
  analyze → plan → execute → review → synthesize

  - analyze  : gemini-2.5-flash  (fast, cheap)  → task type, complexity, token estimate
  - plan     : gemini-2.5-flash  (fast, cheap)  → step-by-step execution plan
  - execute  : recommended model (best for task) → primary output using the plan
  - review   : gemini-2.5-flash  (fast, cheap)  → quality check, flag gaps
  - synthesize : merge everything into final response
"""

import json
import asyncio
from typing import TypedDict, Annotated, Any
import operator

from langgraph.graph import StateGraph, END

# ── Model registry with cost and capability metadata ──────────────────────────

MODEL_REGISTRY: dict[str, dict] = {
    # ── Google Gemini ─────────────────────────────────────────────────────────
    "gemini-2.5-flash": {
        "provider": "gemini",
        "label": "Gemini 2.5 Flash",
        "cost_in":  0.00015,
        "cost_out": 0.00060,
        "context":  1_000_000,
        "speed":    "fastest",
        "reasoning": 4,
        "coding":    3,
        "badge":    "⚡",
        "best_for": ["general", "fast tasks", "cost-efficient", "summarisation", "real-time apps"],
    },
    "gemini-2.5-pro": {
        "provider": "gemini",
        "label": "Gemini 2.5 Pro",
        "cost_in":  0.00125,
        "cost_out": 0.00500,
        "context":  2_000_000,
        "speed":    "medium",
        "reasoning": 5,
        "coding":    4,
        "badge":    "🧠",
        "best_for": ["complex analysis", "long context", "research", "enterprise workloads"],
    },
    "gemini-2.0-flash": {
        "provider": "gemini",
        "label": "Gemini 2.0 Flash",
        "cost_in":  0.00010,
        "cost_out": 0.00040,
        "context":  1_000_000,
        "speed":    "fastest",
        "reasoning": 3,
        "coding":    3,
        "badge":    "⚡",
        "best_for": ["lightweight real-time", "cost-efficient"],
    },
    "gemini-2.0-flash-lite": {
        "provider": "gemini",
        "label": "Gemini 2.0 Flash-Lite",
        "cost_in":  0.000075,
        "cost_out": 0.00030,
        "context":  1_000_000,
        "speed":    "fastest",
        "reasoning": 2,
        "coding":    2,
        "badge":    "⚡",
        "best_for": ["ultra-low cost", "high-volume pipelines", "fast inference"],
    },
    "gemini-3-pro-preview": {
        "provider": "gemini",
        "label": "Gemini 3 Pro Preview",
        "cost_in":  0.00250,
        "cost_out": 0.01000,
        "context":  2_000_000,
        "speed":    "medium",
        "reasoning": 5,
        "coding":    5,
        "badge":    "🏆",
        "best_for": ["advanced reasoning", "AI agents", "complex workflows", "frontier tasks"],
    },
    "gemini-3-flash-preview": {
        "provider": "gemini",
        "label": "Gemini 3 Flash Preview",
        "cost_in":  0.00020,
        "cost_out": 0.00080,
        "context":  1_000_000,
        "speed":    "fast",
        "reasoning": 4,
        "coding":    4,
        "badge":    "✦",
        "best_for": ["fast next-gen responses", "balanced cost/quality", "coding"],
    },
    # ── Anthropic Claude ──────────────────────────────────────────────────────
    "claude-haiku-4-5": {
        "provider": "anthropic",
        "label": "Claude Haiku 4.5",
        "cost_in":  0.00080,
        "cost_out": 0.00400,
        "context":  200_000,
        "speed":    "fastest",
        "reasoning": 3,
        "coding":    4,
        "badge":    "⚡",
        "best_for": ["fast tasks", "simple code", "cost-efficient"],
    },
    "claude-sonnet-4-6": {
        "provider": "anthropic",
        "label": "Claude Sonnet 4.6",
        "cost_in":  0.00300,
        "cost_out": 0.01500,
        "context":  200_000,
        "speed":    "fast",
        "reasoning": 5,
        "coding":    5,
        "badge":    "✦",
        "best_for": ["code generation", "production code", "complex reasoning", "balanced"],
    },
    "claude-opus-4-7": {
        "provider": "anthropic",
        "label": "Claude Opus 4.7",
        "cost_in":  0.01500,
        "cost_out": 0.07500,
        "context":  200_000,
        "speed":    "slow",
        "reasoning": 5,
        "coding":    5,
        "badge":    "🏆",
        "best_for": ["deep reasoning", "complex architecture", "nuanced tasks"],
    },
    # ── OpenAI ────────────────────────────────────────────────────────────────
    "gpt-4o-mini": {
        "provider": "openai",
        "label": "GPT-4o Mini",
        "cost_in":  0.00015,
        "cost_out": 0.00060,
        "context":  128_000,
        "speed":    "fastest",
        "reasoning": 3,
        "coding":    3,
        "badge":    "⚡",
        "best_for": ["fast tasks", "cost-efficient"],
    },
    "gpt-4o": {
        "provider": "openai",
        "label": "GPT-4o",
        "cost_in":  0.00250,
        "cost_out": 0.01000,
        "context":  128_000,
        "speed":    "medium",
        "reasoning": 5,
        "coding":    4,
        "badge":    "✦",
        "best_for": ["general purpose", "multimodal", "balanced"],
    },
    "o3-mini": {
        "provider": "openai",
        "label": "o3-mini",
        "cost_in":  0.00110,
        "cost_out": 0.00440,
        "context":  200_000,
        "speed":    "medium",
        "reasoning": 5,
        "coding":    5,
        "badge":    "🧠",
        "best_for": ["logical reasoning", "math", "structured problem-solving"],
    },
    "o1": {
        "provider": "openai",
        "label": "o1",
        "cost_in":  0.01500,
        "cost_out": 0.06000,
        "context":  200_000,
        "speed":    "slow",
        "reasoning": 5,
        "coding":    5,
        "badge":    "🏆",
        "best_for": ["deep reasoning", "complex math", "scientific research"],
    },
}

TASK_TYPES = {
    "code_generation":   {"recommend": "claude-sonnet-4-6", "tokens": 6000},
    "code_review":       {"recommend": "claude-sonnet-4-6", "tokens": 4000},
    "security_audit":    {"recommend": "claude-sonnet-4-6", "tokens": 4000},
    "research":          {"recommend": "gemini-2.5-pro",    "tokens": 5000},
    "summarisation":     {"recommend": "gemini-2.5-flash",  "tokens": 2000},
    "data_analysis":     {"recommend": "gemini-2.5-pro",    "tokens": 4000},
    "documentation":     {"recommend": "claude-sonnet-4-6", "tokens": 3000},
    "general":           {"recommend": "gemini-2.5-flash",  "tokens": 2000},
}

# ── LangGraph state ───────────────────────────────────────────────────────────

class MultiModelState(TypedDict):
    input: str
    system_role: str
    task_type: str
    complexity: str
    recommended_model: str
    estimated_tokens: int
    plan: str
    primary_output: str
    review_notes: str
    final_output: str
    models_used: Annotated[list, operator.add]
    stage_events: Annotated[list, operator.add]
    total_cost: float
    # Optional overrides: {"analyze": "gemini-2.5-flash", "plan": ..., "execute": ..., "review": ...}
    model_overrides: dict


# ── Helpers ───────────────────────────────────────────────────────────────────

def _gemini_call(prompt: str, system: str = "Return concise JSON only.",
                 max_tokens: int = 512, model: str = "gemini-2.5-flash") -> str:
    """Synchronous Gemini call with thinking disabled. Falls back to flash for non-Gemini IDs."""
    import os
    from providers.gemini import GeminiProvider
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
    # Only Gemini models can be used via this helper
    use_model = model if MODEL_REGISTRY.get(model, {}).get("provider") == "gemini" else "gemini-2.5-flash"
    provider = GeminiProvider(api_key, use_model, thinking_budget=0)
    result = provider.call_sync(system, prompt, temperature=0.1, max_tokens=max_tokens)
    return result.get("output", "") if result["status"] == "success" else ""


def _parse_json(raw: str) -> Any:
    raw = raw.strip()
    if raw.startswith("```"):
        nl = raw.find("\n"); raw = raw[nl + 1:] if nl != -1 else raw[3:]
    if raw.endswith("```"): raw = raw[:-3].rstrip()
    raw = raw.strip()
    try:
        return json.loads(raw)
    except Exception:
        start = raw.find("{"); end = raw.rfind("}")
        if start != -1 and end > start:
            return json.loads(raw[start:end + 1])
        start = raw.find("["); end = raw.rfind("]")
        if start != -1 and end > start:
            return json.loads(raw[start:end + 1])
        return {}


def _cost(model_id: str, in_tok: int, out_tok: int) -> float:
    m = MODEL_REGISTRY.get(model_id, {})
    return (in_tok / 1000) * m.get("cost_in", 0) + (out_tok / 1000) * m.get("cost_out", 0)


# ── Graph nodes ───────────────────────────────────────────────────────────────

def node_analyze(state: MultiModelState) -> dict:
    """Classify the task, estimate complexity and recommended model."""
    overrides = state.get("model_overrides", {})
    analyze_model = overrides.get("analyze", "gemini-2.5-flash")
    user_input = state["input"][:2000]
    task_list = list(TASK_TYPES.keys())

    raw = _gemini_call(
        f"""Analyse this user request and classify it.

User input: {user_input}

Task types: {task_list}

Return JSON:
{{
  "task_type": "<one of the task types above>",
  "complexity": "low|medium|high",
  "estimated_output_tokens": <integer 500-8000>,
  "key_requirements": ["...", "...", "..."]
}}""",
        max_tokens=256,
        model=analyze_model,
    )
    data = _parse_json(raw)
    task_type = data.get("task_type", "general")
    complexity = data.get("complexity", "medium")
    estimated = int(data.get("estimated_output_tokens", TASK_TYPES.get(task_type, {}).get("tokens", 2000)))
    # Respect execute override; otherwise use task-type recommendation
    exec_override = overrides.get("execute", "auto")
    recommended = (exec_override if exec_override and exec_override != "auto"
                   else TASK_TYPES.get(task_type, {}).get("recommend", "gemini-2.5-flash"))

    return {
        "task_type": task_type,
        "complexity": complexity,
        "estimated_tokens": estimated,
        "recommended_model": recommended,
        "stage_events": [{"stage": "analyze", "model": analyze_model,
                          "task_type": task_type, "complexity": complexity,
                          "recommended": recommended, "estimated_tokens": estimated}],
        "models_used": [{"stage": "analyze", "model": analyze_model, "cost": 0.0001}],
    }


def node_plan(state: MultiModelState) -> dict:
    """Generate a step-by-step execution plan using configured model."""
    overrides = state.get("model_overrides", {})
    plan_model = overrides.get("plan", "gemini-2.5-flash")
    raw = _gemini_call(
        f"""You are planning the execution of this task for an AI agent.

Task type: {state['task_type']} | Complexity: {state['complexity']}
System role: {state['system_role'][:300]}
User input: {state['input'][:1500]}

Create a concise step-by-step plan the executor should follow.
Return as a plain numbered list (no JSON), max 8 steps.""",
        system="You are a task planning assistant. Be concise and specific.",
        max_tokens=512,
        model=plan_model,
    )
    return {
        "plan": raw,
        "stage_events": [{"stage": "plan", "model": plan_model, "plan_preview": raw[:200]}],
        "models_used": [{"stage": "plan", "model": plan_model, "cost": 0.0002}],
    }


def node_execute(state: MultiModelState) -> dict:
    """Run the main execution with the recommended model."""
    import os
    from providers.gemini import GeminiProvider

    model_id = state["recommended_model"]
    model_info = MODEL_REGISTRY.get(model_id, MODEL_REGISTRY["gemini-2.5-flash"])

    system = f"""{state['system_role']}

EXECUTION PLAN (follow this order):
{state['plan']}

Produce a complete, high-quality response following the plan above."""

    # Currently we only have Gemini provider wired up; fall back gracefully
    provider_name = model_info.get("provider", "gemini")
    if provider_name == "gemini":
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        provider = GeminiProvider(api_key, model_id)
    else:
        # Fall back to flash for non-Gemini models until other providers wired
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY", "")
        provider = GeminiProvider(api_key, "gemini-2.5-flash")
        model_id = "gemini-2.5-flash"

    result = provider.call_sync(
        system_prompt=system,
        user_message=state["input"],
        temperature=0.2,
        max_tokens=state["estimated_tokens"],
    )
    output = result.get("output", "No output") if result["status"] == "success" else f"Error: {result.get('error')}"
    tokens = result.get("tokens", {"input": 500, "output": 1000})
    execution_cost = _cost(model_id, tokens.get("input", 500), tokens.get("output", 1000))

    return {
        "primary_output": output,
        "stage_events": [{"stage": "execute", "model": model_id,
                          "tokens": tokens, "cost": execution_cost}],
        "models_used": [{"stage": "execute", "model": model_id,
                         "label": model_info.get("label", model_id),
                         "tokens": tokens, "cost": execution_cost}],
        "total_cost": execution_cost,
    }


def node_review(state: MultiModelState) -> dict:
    """Quality review using configured model."""
    overrides = state.get("model_overrides", {})
    review_model = overrides.get("review", "gemini-2.5-flash")
    raw = _gemini_call(
        f"""You are a quality reviewer for an AI agent response.

Original request: {state['input'][:800]}
Task type: {state['task_type']}

Response to review (first 1500 chars):
{state['primary_output'][:1500]}

Provide a brief quality assessment (3-5 bullet points):
- What was done well
- What is missing or incomplete
- Any compliance or security concerns
- Overall quality: excellent / good / needs improvement""",
        system="You are a concise quality reviewer. Be direct and specific.",
        max_tokens=400,
        model=review_model,
    )
    return {
        "review_notes": raw,
        "stage_events": [{"stage": "review", "model": review_model, "review": raw[:300]}],
        "models_used": [{"stage": "review", "model": review_model, "cost": 0.0001}],
    }


def node_synthesize(state: MultiModelState) -> dict:
    """Assemble final output with review notes appended."""
    review = state.get("review_notes", "")
    final = state["primary_output"]

    if review and "needs improvement" in review.lower():
        final = f"{state['primary_output']}\n\n---\n**Quality Review Notes:**\n{review}"

    total = sum(m.get("cost", 0) for m in state.get("models_used", []))

    return {
        "final_output": final,
        "total_cost": total,
        "stage_events": [{"stage": "complete", "total_cost": total,
                          "models_used": state.get("models_used", [])}],
    }


# ── Build graph ───────────────────────────────────────────────────────────────

def build_multi_model_graph() -> StateGraph:
    g = StateGraph(MultiModelState)
    g.add_node("analyzer",   node_analyze)
    g.add_node("planner",    node_plan)
    g.add_node("executor",   node_execute)
    g.add_node("reviewer",   node_review)
    g.add_node("synthesizer", node_synthesize)

    g.set_entry_point("analyzer")
    g.add_edge("analyzer",   "planner")
    g.add_edge("planner",    "executor")
    g.add_edge("executor",   "reviewer")
    g.add_edge("reviewer",   "synthesizer")
    g.add_edge("synthesizer", END)

    return g.compile()


MULTI_MODEL_GRAPH = build_multi_model_graph()
