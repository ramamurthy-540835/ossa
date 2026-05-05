# OSSA — Quick Reference

> **Define once. Execute anywhere. Govern automatically.**
> Live: [ossa-frontend-gygcwrc62a-uc.a.run.app](https://ossa-frontend-gygcwrc62a-uc.a.run.app/)

---

## What OSSA Does

OSSA governs AI agents through a single YAML manifest. Every execution enforces the manifest automatically — no code changes needed to add compliance, cost limits, or human approval.

**The four guarantees:**

| Principle | What it means |
|-----------|--------------|
| **Define once** | One `.ossa.yaml` = LLM config + compliance + cost + HITL |
| **Execute anywhere** | Swap Gemini → Claude → GPT by changing one line |
| **Govern automatically** | Budgets enforced, HITL triggered, every action audited |
| **Trust by design** | HIPAA / SOC2 / PCI-DSS / GDPR declared per agent |

---

## Execution Pipeline

Every run passes through all 7 stages in order:

```
1. ⚙  Validate Manifest   — schema check, provider availability
2. 💰  Budget Governance   — token budget + spend limit check (pre-execution)
3. 👤  HITL Evaluation     — condition check, pause for approval if triggered
4. ⚡  LLM Invoke          — provider-abstracted call via LangChain
5. 📡  Stream Output       — SSE token stream to dashboard + live cost tracking
6. 📋  Audit Capture       — structured record written on completion
7. ✅  Complete            — result available for download (MD / JSON)
```

---

## Manifest Structure

```yaml
apiVersion: ossa/v0.4.6
kind: Agent
metadata:
  name: my-agent

spec:
  llm:
    provider: gemini          # gemini | anthropic | openai
    model: gemini-2.5-flash
    temperature: 0.7
    maxOutputTokens: 2048

  compliance:
    frameworks: [SOC2, HIPAA] # SOC2 | HIPAA | PCI-DSS | GDPR
    dataClassification: confidential  # confidential | internal | public
    retentionDays: 90

  cost:
    tokenBudget:
      perExecution: 2000      # hard token cap per run
      perDay: 50000           # aggregate daily cap
    spendLimits:
      daily: 0.50             # USD daily ceiling
      monthly: 10.00          # USD monthly ceiling

  hitl:
    enabled: true
    interventionPoints:
      - trigger:
          type: on_condition
          condition: input_size > 5000
        mode: ALWAYS

  audit:
    enabled: true
    logLevel: detailed        # minimal | standard | detailed
    includeInput: false       # set false to avoid logging PII
    includeOutput: false
```

Manifests are stored as `backend/manifests/*.ossa.yaml`.

---

## Bundled Agents

| Agent | Compliance | HITL | Use Case |
|-------|-----------|------|---------|
| Code Developer | SOC2, HIPAA, ISO27001, GDPR | ✓ | Write, fix, refactor code |
| Aider Style Code Dev | SOC2, HIPAA | ✓ | Pair-programming with context |
| Code Analyzer | SOC2 | — | Quality + security review |
| Document Summarizer | SOC2, HIPAA | ✓ | Summarize long documents |
| Research Agent | SOC2 | — | Research and synthesis |
| Security Auditor | SOC2, HIPAA | ✓ | OWASP, CVE, secrets review |

---

## Dashboard Usage

**Run an agent**
1. Select agent from the sidebar
2. Type prompt into the input field
3. Click **Run Agent** — output streams live

**Create a new agent**
1. Click **+ New Agent** in the sidebar
2. Fill in name, LLM config, compliance, cost, HITL settings
3. Click **Create** — saved to `backend/manifests/`

**HITL approval**
When an agent's condition is triggered (e.g. input > 5,000 chars), execution pauses. Click **Approve** to proceed or **Reject** to abort. Either decision is logged.

**Download results**
After execution: **Download Markdown** or **Download JSON** from the response panel.

**Download presentation**
Click **📊 PPT** in the header to download the OSSA stakeholder deck (PPTX).

---

## API Quick Reference

| Method | Endpoint | Description |
|--------|---------|-------------|
| `POST` | `/api/agent/execute` | Run an agent |
| `GET` | `/api/agent/events/{id}` | Stream events (SSE) |
| `POST` | `/api/agent/approve` | Approve HITL gate |
| `GET` | `/api/manifests` | List all agents |
| `POST` | `/api/manifests` | Create new agent |
| `GET` | `/api/audit/logs` | All audit records |
| `GET` | `/api/presentation/download` | Download PPTX deck |

Swagger UI: [ossa-backend-gygcwrc62a-uc.a.run.app/docs](https://ossa-backend-gygcwrc62a-uc.a.run.app/docs)

---

## Cost Governance Details

The `CostTracker` (`backend/ossa/cost_tracker.py`) runs **before** any tokens are sent to the LLM:

- `tokenBudget.perExecution` — if this execution would exceed the per-run token cap, it is rejected immediately
- `tokenBudget.perDay` — aggregate across all executions of this agent today
- `spendLimits.daily` — USD ceiling; uses provider-specific pricing tables
- Live cost streams to the dashboard during execution — no surprises

---

## Compliance Reference

| Framework | What OSSA declares |
|-----------|-------------------|
| **SOC2** | Audit trail, access controls, monitoring |
| **HIPAA** | PHI handling, retention, access logging |
| **PCI-DSS** | Data classification, audit, encryption |
| **GDPR** | Retention policy, data classification |

Declared frameworks appear in every audit record. `dataClassification: confidential` enforces stricter handling policies at the executor level.

---

## Quick Start

```bash
git clone https://github.com/ramamurthy-540835/ossa.git
cd ossa
echo "GEMINI_API_KEY=your_key" > backend/.env.local
./start.sh
# Open http://localhost:3001
```

---

*OSSA v0.4.6 · MIT License · [github.com/ramamurthy-540835/ossa](https://github.com/ramamurthy-540835/ossa)*
