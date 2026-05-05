# Gamma Presentation — OSSA: Open Standard for Service Agents

> **Stakeholder Presentation Guide**
> Copy the prompt below into [gamma.app](https://gamma.app) → **Create** → **Generate from prompt** to auto-generate the full deck.
>
> **Style**: Dark theme · Navy/Electric Blue · 16:9 widescreen · Professional

---

## Gamma Generation Prompt

> Paste this into Gamma:

```
Create a professional 10-slide presentation for OSSA (Open Standard for Service Agents), a vendor-neutral AI governance framework. Use a dark theme with deep navy and electric blue accents. Format: 16:9 widescreen. Audience: engineering leadership and enterprise stakeholders.

Slides:
1. Title: OSSA | Open Standard for Service Agents — tagline "Define once. Execute anywhere. Govern automatically."
2. Problem: The AI governance gap — 3 columns: runaway costs, compliance risk, no human oversight
3. Solution: What OSSA does — single YAML manifest, 4 core principles
4. Key Features: 6 governance capabilities in a 2x3 grid
5. How It Works: OSSA execution pipeline — 7 stages from Validate to Complete
6. OSSA Manifest: Sample YAML with annotations for provider, compliance, cost, HITL
7. Tech Stack: Frontend/Backend/LLM/Deployment table
8. Live Demo: 6-step dashboard walkthrough
9. Governance Deep Dive: Cost controls + HITL + Audit + Compliance detail
10. Roadmap & Call to Action: Future features + get started
```

---

## Slide-by-Slide Content

---

### Slide 1 — Title

**OSSA**
*Open Standard for Service Agents · v0.4.6*

> Define once. Execute anywhere. Govern automatically.

*"A vendor-neutral specification for AI agents with built-in governance — compliance, cost controls, human approval workflows, and audit logging — all declared in a single YAML manifest."*

Tags: Python 3.10+ · Node 18+ · Gemini · Claude · GPT · MIT License

Live: [ossa-frontend-gygcwrc62a-uc.a.run.app](https://ossa-frontend-gygcwrc62a-uc.a.run.app/)

---

### Slide 2 — Problem: The AI Governance Gap

**Three columns:**

**Runaway Costs**
- No per-execution token budgets by default
- No daily spend limits or alerts
- A single agent loop can exhaust a monthly budget overnight
- No real-time cost visibility during execution

**Compliance Risk**
- LLM interactions are undocumented
- No data classification or retention policy enforcement
- Compliance audits find gaps after incidents, not before
- HIPAA, SOC2, PCI-DSS obligations unmet

**No Human Oversight**
- Agents run autonomously with no approval gates
- Sensitive inputs processed without human review
- No HITL triggers on condition-based risk signals
- Decisions irreversible by the time they're noticed

*Speaker note: Every enterprise AI team hits these problems. OSSA makes them structurally impossible — not a process problem, a specification problem.*

---

### Slide 3 — Solution: What OSSA Does

**One YAML manifest — all governance baked in:**

```yaml
apiVersion: ossa/v0.4.6
kind: Agent
metadata:
  name: document-summarizer
spec:
  llm:
    provider: gemini          # ← change to: anthropic / openai
    model: gemini-2.5-flash
  compliance:
    frameworks: [HIPAA, SOC2]
  cost:
    tokenBudget:
      perExecution: 2000
    spendLimits:
      daily: 0.50
  hitl:
    enabled: true
    interventionPoints:
      - trigger:
          condition: input_size > 5000
        mode: ALWAYS
```

**4 Core Principles:**

| Principle | What It Means |
|-----------|--------------|
| **Define once** | One YAML = role + LLM config + compliance + cost + HITL |
| **Execute anywhere** | Swap Gemini → Claude → GPT by changing one line |
| **Govern automatically** | Budgets enforced, HITL triggered, everything audited |
| **Trust by design** | HIPAA/SOC2 declared per agent, not bolted on later |

---

### Slide 4 — Key Features (2×3 grid)

| | |
|--|--|
| **📄 Manifest as Code** — YAML-defined agents, version-controlled, diff-reviewable. Governance is infrastructure. | **🔄 Vendor Neutral** — One-line switch between Gemini, Claude, GPT. All governance transfers automatically. |
| **👤 HITL Approval Gates** — Automatic pause on configured conditions (input size, cost threshold). Human approves or rejects. | **💰 Cost Governance** — Per-execution token budgets + daily spend limits. Hard rejections before tokens consumed. |
| **📋 Audit Logging** — Every execution: timestamp, provider, tokens, cost, HITL decisions, compliance checks. Zero instrumentation. | **🔒 Compliance Declarations** — HIPAA, SOC2, PCI-DSS, GDPR per agent. Data classification + retention enforced. |

---

### Slide 5 — How It Works: OSSA Execution Pipeline

**7-stage execution pipeline — every stage enforces governance:**

```
1. ⚙  Validate Manifest    Schema check, required fields, provider availability
         ↓
2. 💰  Budget Governance   Pre-execution token budget + spend limit enforcement
         ↓
3. 👤  HITL Evaluation     Condition check → pause for human approval if triggered
         ↓
4. ⚡  LLM Invoke          Provider-abstracted call via LangChain Orchestrator
         ↓
5. 📡  Stream Output       SSE token stream → live cost tracking in dashboard
         ↓
6. 📋  Audit Capture       Structured record: agent, input, tokens, cost, decisions
         ↓
7. ✅  Complete            Result available for download (Markdown / JSON)
```

*No stage can be skipped. Governance is in the path, not around it.*

---

### Slide 6 — OSSA Manifest: Full Example with Annotations

```yaml
apiVersion: ossa/v0.4.6         # Spec version
kind: Agent
metadata:
  name: security-auditor
  description: Reviews code for security vulnerabilities

spec:
  llm:
    provider: gemini             # gemini | anthropic | openai
    model: gemini-2.5-flash      # Provider-specific model ID
    temperature: 0.3             # Lower = more deterministic
    maxOutputTokens: 2048

  compliance:
    frameworks: [SOC2, HIPAA]    # Declared standards
    dataClassification: confidential
    retentionDays: 90            # Audit log retention

  cost:
    tokenBudget:
      perExecution: 2000         # Hard limit per run
      perDay: 50000              # Hard daily aggregate limit
    spendLimits:
      daily: 0.50                # USD daily ceiling
      monthly: 10.00             # USD monthly ceiling

  hitl:
    enabled: true
    interventionPoints:
      - trigger:
          type: on_condition
          condition: input_size > 5000   # Trigger on large inputs
        mode: ALWAYS

  audit:
    enabled: true
    logLevel: detailed
    includeInput: false          # Don't log raw input (PII)
    includeOutput: false
```

*Stored as `security-auditor.ossa.yaml` in `backend/manifests/`. Version-controlled with the rest of your infrastructure.*

---

### Slide 7 — Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 14 + React + TypeScript + Tailwind | SSR performance, type safety, rapid UI |
| **Backend** | FastAPI + Python 3.10+ + Pydantic + Uvicorn | Async performance, validation, ASGI |
| **Orchestration** | LangChain Core | Unified LLM provider abstraction |
| **LLM Providers** | Gemini 2.5 Flash (primary) · Claude · GPT (interfaces) | Vendor-neutral by design |
| **Manifest Format** | YAML + PyYAML | Human-readable, version-control friendly |
| **Real-time** | Server-Sent Events (SSE) | Native HTTP streaming, no WebSocket overhead |
| **Deployment** | GCP Cloud Run + Cloud Build + Secret Manager | Serverless scale-to-zero, managed CI/CD |
| **Governance Layer** | OSSA Executor + Cost Tracker + HITL Manager | The core spec implementation |

---

### Slide 8 — Live Demo: Dashboard Walkthrough

**6-step user journey:**

| Step | Action | What Happens |
|------|--------|-------------|
| **1** | Load dashboard | Agent catalog loads from `backend/manifests/` |
| **2** | Select agent | Manifest details displayed; prompt input appears |
| **3** | Submit prompt | Executor validates manifest + checks budget |
| **4** | HITL triggered (if applicable) | Execution pauses → approval prompt shown → user approves/rejects |
| **5** | Execution streams | Live token output + real-time cost counter + audit events |
| **6** | Completion | Download MD/JSON · Review audit trail · Share via email |

**Live metrics shown during execution:**
- Estimated cost per execution: real-time USD
- Total tokens consumed: running counter
- Provider: current LLM (Gemini icon)
- Compliance: declared frameworks from manifest
- Daily budget remaining: % consumed

**Try it live:** [ossa-frontend-gygcwrc62a-uc.a.run.app](https://ossa-frontend-gygcwrc62a-uc.a.run.app/)

---

### Slide 9 — Governance Deep Dive

**Four governance pillars, all automatic:**

**💰 Cost Governance**
- `tokenBudget.perExecution`: hard token cap per run — execution rejected if budget would be breached
- `tokenBudget.perDay`: aggregate daily token limit across all executions of this agent
- `spendLimits.daily` / `monthly`: USD spending ceiling with automatic enforcement
- Provider-specific pricing tracked in real-time by `backend/ossa/cost_tracker.py`
- Cost estimate streamed to UI during execution — no surprises after the fact

**👤 Human-in-the-Loop (HITL)**
- Configured per agent as conditional `interventionPoints` in the manifest
- Trigger types: `on_condition` (e.g., `input_size > 5000`), extensible to cost thresholds
- When triggered: execution pauses, approval prompt shown in dashboard
- `POST /api/agent/approve` resumes; rejection records reason in audit log and aborts cleanly
- Designed for regulated industries where human sign-off on sensitive AI interactions is required

**📋 Audit Logging**
- Every execution produces a structured record: timestamp, agent, provider, model, input summary, tokens, cost, HITL decisions, compliance status, output metadata
- Records queryable via `GET /api/audit/logs`
- Real-time audit strip visible at bottom of dashboard during execution
- Log level configurable: `minimal`, `standard`, `detailed` — without changing application code

**🔒 Compliance Framework Declarations**
- Supported: `SOC2`, `HIPAA`, `PCI-DSS`, `GDPR`
- Declared in manifest → included in every audit record
- `dataClassification`: `confidential`, `internal`, `public` → enforces handling policies
- `retentionDays`: controls how long audit records are kept
- Provides the documented compliance chain required for audits and incident investigations

---

### Slide 10 — Roadmap & Call to Action

**What's next for OSSA:**

| Priority | Feature |
|----------|---------|
| 🔴 P0 | Full Anthropic + OpenAI provider integration |
| 🔴 P0 | Manifest schema v0.5.0 with extended compliance fields |
| 🟡 P1 | PII detection + sensitive data masking |
| 🟡 P1 | Multi-step agent workflow chaining |
| 🟡 P1 | Expanded HITL conditions (cost threshold, output classification) |
| 🟢 P2 | Historical cost analytics dashboard |
| 🟢 P2 | Dynamic manifest versioning with diff viewer |
| 🟢 P2 | Comprehensive unit + integration test suite |
| ⚪ P3 | Kubernetes deployment guides |
| ⚪ P3 | Agent performance benchmarking across providers |

---

**Get Started:**

**Try It Now**
Live dashboard: [ossa-frontend-gygcwrc62a-uc.a.run.app](https://ossa-frontend-gygcwrc62a-uc.a.run.app/)
Clone: `github.com/ramamurthy-540835/ossa`

**Run Locally (2 minutes)**
```bash
git clone https://github.com/ramamurthy-540835/ossa.git
cd ossa && ./start.sh
# Open http://localhost:3001
```

**Contribute**
PRs welcome: provider integrations, governance policies, UI, tests.

---

*OSSA · Open Standard for Service Agents · v0.4.6 · MIT License*
*Live: ossa-frontend-gygcwrc62a-uc.a.run.app · GitHub: ramamurthy-540835/ossa*

---

## Presentation Notes

### Audience Guide

| Audience | Key Slides | Message |
|----------|-----------|---------|
| Engineering team | 3, 5, 6, 7, 8 | Spec design, implementation, manifest authoring |
| Engineering leadership | 2, 3, 4, 9, 10 | Problem severity, governance completeness, roadmap |
| Security / Compliance | 2, 6, 9 | Compliance declarations, audit trail, HITL design |
| Product / Business | 2, 3, 4, 10 | Business risk, solution differentiation, investment |
| Open-source community | 3, 6, 8, 10 | Spec philosophy, manifest format, contribution |

### Speaker Notes

- **Slide 2**: Lead with the "overnight budget burn" scenario — it's visceral and every engineering manager has a story
- **Slide 5**: Emphasize "no stage can be skipped" — governance is structural, not procedural
- **Slide 6**: Walk through the YAML line by line — the manifest IS the governance story
- **Slide 9**: For compliance audiences, spend extra time here — OSSA provides the audit chain they're legally required to maintain
- **Slide 10**: Always end with the live URL on screen — invite the audience to open it during Q&A
