# Changelog

All notable changes to OSSA are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [0.4.6] - 2026-05-15

### Added
- PPTX presentation download endpoint (`/api/presentation/download`)
- Presentation deck served from GCS backend
- Enhanced README with visual architecture diagrams

### Fixed
- Presentation download 500 error
- GCS integration for large file serving
- `.gitignore` configuration to exclude large PPTX files

### Changed
- GAMMA_PROMPT.md moved to project root for better visibility

---

## [0.4.5] - 2026-05-10

### Added
- Comprehensive compliance framework documentation
- Enhanced cost governance examples
- Improved HITL evaluation guide

### Fixed
- Cost tracking precision for fractional token usage
- HITL intervention point condition evaluation

---

## [0.4.4] - 2026-05-01

### Added
- Multi-model orchestration support (`analyze_model`, `plan_model`, `execute_model`, `review_model`)
- Budget tracking and daily spend limits
- Cloud Build pipeline for automated deployment

### Fixed
- Provider abstraction layer robustness
- SSE streaming connection stability

---

## [0.4.3] - 2026-04-20

### Added
- Audit log queryable API (`GET /api/audit/logs`)
- Real-time audit strip in dashboard
- Compliance framework declarations in manifest

### Changed
- Audit record schema to include cost and compliance metadata

---

## [0.4.2] - 2026-04-10

### Added
- HITL approval/rejection workflow
- Human-in-the-loop intervention points
- Dynamic HITL condition evaluation

### Fixed
- Agent execution flow state management
- HITL prompt rendering in dashboard

---

## [0.4.1] - 2026-03-25

### Added
- Cost Tracker with budget enforcement
- Token budget limits (per-execution and daily)
- Spend limits (daily and monthly)
- Live cost streaming to dashboard

### Fixed
- Budget calculation precision
- Cost estimation accuracy

---

## [0.4.0] - 2026-03-15

### Added
- LangChain orchestration layer for vendor abstraction
- Support for Gemini, Claude, and GPT-4 providers
- Manifest validation and loading
- Server-Sent Events for real-time streaming
- Full API reference documentation

### Changed
- Architecture simplified around single OSSA Executor
- Manifest schema standardized (`apiVersion: ossa/v0.4.0`)

---

## [0.3.0] - 2026-02-28

### Added
- Next.js 14 frontend dashboard
- FastAPI backend with Uvicorn
- Initial manifest-as-code concept
- Basic agent execution pipeline

### Changed
- Project structure reorganized (backend/, frontend/, docs/)

---

## [0.2.0] - 2026-02-10

### Added
- Core OSSA specification (v0.2.0)
- Manifest schema for agents
- Basic executor proof-of-concept

---

## [0.1.0] - 2026-01-20

### Added
- Initial project structure
- Documentation skeleton
- CI/CD pipeline setup

---

## Versioning

OSSA follows semantic versioning:
- **MAJOR** — Breaking changes to manifest schema or API
- **MINOR** — New features, backward-compatible
- **PATCH** — Bug fixes and minor improvements

To check your version:
```bash
# In backend, check ossa_settings.json
grep -A2 '"version"' backend/ossa_settings.json
```

## Unreleased

### Planned
- Full Anthropic + OpenAI provider integration
- Manifest schema v0.5.0
- PII detection + sensitive data masking
- Multi-step agent workflow chaining
- Historical cost analytics dashboard
- Expanded HITL conditions
- Kubernetes deployment guide
- Comprehensive test suite
