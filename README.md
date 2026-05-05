# OSSA Agent Dashboard

A functional **OSSA (Open Standard for Service Agents)** dashboard that lets you define, run, and govern AI agents with built-in compliance, cost controls, HITL workflows, and audit logging.

## Quick Start

```bash
./start.sh
# Open http://10.100.15.44:3001
```

Or manually:

```bash
# Backend
cd backend
pip install -r requirements.txt
# Set your API key in backend/.env.local: GEMINI_API_KEY=...
python main.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev -- --port 3001
```

## What You Can Do

| Feature | How |
|---|---|
| **Run an agent** | Select from sidebar → type a prompt → Run Agent |
| **Create a new agent** | Click **+ New Agent** in the sidebar → fill the form → Create |
| **Download results** | After execution: Copy / Download Markdown / Download JSON |
| **Share results** | Click Share to open pre-filled email |
| **View audit log** | Bottom strip shows all events in real time |
| **HITL approval** | Long inputs trigger a human-approval gate |

## Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind — runs on port 3001
- **Backend**: FastAPI, Python — runs on port 8000
- **LLM**: Gemini 2.5 Flash via API key (set `GEMINI_API_KEY` in `backend/.env.local`)

## Key API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/manifests` | List all agents |
| POST | `/api/manifests` | Create new agent manifest |
| DELETE | `/api/manifests/{name}` | Delete an agent |
| POST | `/api/agent/execute` | Start agent execution |
| GET | `/api/agent/events/{id}` | Stream execution via SSE |
| GET | `/api/artifacts/{id}/download?fmt=md` | Download result as Markdown |
| GET | `/api/artifacts/{id}/download?fmt=json` | Download result as JSON |
| GET | `/api/audit/logs` | All execution audit logs |

## OSSA Manifest Format

```yaml
apiVersion: ossa/v0.4.6
kind: Agent
metadata:
  name: my-agent
spec:
  role: |
    You are a helpful AI assistant...
  llm:
    provider: gemini          # gemini | anthropic | openai
    model: gemini-2.5-flash
  compliance:
    frameworks: [SOC2, HIPAA]
  cost:
    spendLimits:
      daily: 1.0
  hitl:
    enabled: true
  trust:
    tier: org-verified
```

Manifests are stored as `.ossa.yaml` files in `backend/manifests/`.
