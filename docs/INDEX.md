# OSSA Documentation Index

Welcome to OSSA — the Open Standard for Service Agents. This index guides you to the right documentation for your needs.

---

## 🚀 Getting Started

| Document | Purpose |
|----------|---------|
| **[Getting Started](getting-started.md)** | Installation, first agent run, dashboard walkthrough |
| **[Quick Reference](README.md)** | Pipeline overview, manifest structure, API endpoints |

**Start here if you're new to OSSA.**

---

## 📋 Core Concepts

| Document | Purpose |
|----------|---------|
| **[Manifest Reference](manifest-reference.md)** | Complete schema for `.ossa.yaml` files |
| **[Execution Pipeline](execution-pipeline.md)** | Seven-stage execution flow, streaming, validation |
| **[Agent Standards](agent-standards.md)** | Best practices for creating production agents |

**Read these to understand how OSSA works.**

---

## 💰 Governance & Cost

| Document | Purpose |
|----------|---------|
| **[Cost Governance](cost-governance.md)** | Token budgets, spend limits, cost tracking, provider pricing |

**Use this to set up budget enforcement for your agents.**

---

## 🛡️ Compliance & Security

| Document | Purpose |
|----------|---------|
| **[Compliance Frameworks](compliance-frameworks.md)** | SOC2, HIPAA, PCI-DSS, GDPR setup and audit logging |
| **[HITL Guide](hitl-guide.md)** | Human-in-the-loop approval gates, conditions, workflow |

**Essential for regulated environments (healthcare, fintech, etc).**

---

## 📦 Project Resources

| Document | Purpose |
|----------|---------|
| **[README](../README.md)** | Project overview, features, tech stack, deployment |
| **[CONTRIBUTING](../CONTRIBUTING.md)** | How to submit PRs, code style, development setup |
| **[CHANGELOG](../CHANGELOG.md)** | Version history and release notes |
| **[CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md)** | Community standards and reporting |
| **[LICENSE](../LICENSE)** | MIT License |

**Start here for project information and contributing.**

---

## 🎯 Common Tasks

### Create a new agent
1. Read [Getting Started](getting-started.md) for dashboard basics
2. Review [Manifest Reference](manifest-reference.md) for schema
3. Check [Agent Standards](agent-standards.md) for best practices
4. Set [Cost Governance](cost-governance.md) limits

### Set up compliance
1. Review [Compliance Frameworks](compliance-frameworks.md)
2. Declare frameworks in manifest `spec.compliance`
3. Check audit logs after execution

### Implement HITL approval gates
1. Read [HITL Guide](hitl-guide.md)
2. Add `spec.hitl` section to manifest
3. Define `interventionPoints` with trigger conditions

### Deploy to production
1. Check [README](../README.md) Deployment section
2. Set environment variables (`backend/.env.local`)
3. Use `cloudbuild.yaml` for GCP Cloud Run

---

## 📚 Full Document List

```
docs/
├── INDEX.md                       ← You are here
├── README.md                      — Quick reference (entry point)
├── getting-started.md             — Setup + first run
├── manifest-reference.md          — Complete schema
├── execution-pipeline.md          — How OSSA executes agents
├── agent-standards.md             — Best practices
├── cost-governance.md             — Budget enforcement
├── compliance-frameworks.md       — HIPAA, SOC2, etc
└── hitl-guide.md                  — Human approval gates
```

---

## 🔍 Search by Topic

**Budget & Cost**
- [Cost Governance](cost-governance.md) — budgets, tracking, pricing

**Compliance & Security**
- [Compliance Frameworks](compliance-frameworks.md) — SOC2, HIPAA, GDPR
- [HITL Guide](hitl-guide.md) — approval gates, audit logging

**Execution & Architecture**
- [Execution Pipeline](execution-pipeline.md) — seven-stage flow
- [Agent Standards](agent-standards.md) — production best practices

**Configuration**
- [Manifest Reference](manifest-reference.md) — schema & examples
- [Getting Started](getting-started.md) — environment setup

**Contribution & Community**
- [CONTRIBUTING](../CONTRIBUTING.md) — pull requests, code style
- [CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md) — community standards

---

## ❓ FAQ

**Q: Where do I store agent manifests?**  
A: `backend/manifests/*.ossa.yaml`

**Q: How do I change LLM providers?**  
A: Edit `spec.llm.provider` in your manifest (one line change)

**Q: How are costs tracked?**  
A: See [Cost Governance](cost-governance.md) — token count × provider pricing

**Q: Can I approve agents manually?**  
A: Yes — see [HITL Guide](hitl-guide.md) for setting up approval gates

**Q: How do I download agent outputs?**  
A: Dashboard provides Markdown or JSON download after execution

---

## 📖 How to Use This Docs Folder

- **New users:** Start with [Getting Started](getting-started.md)
- **Manifest questions:** Check [Manifest Reference](manifest-reference.md)
- **Cost/compliance:** See [Cost Governance](cost-governance.md) and [Compliance Frameworks](compliance-frameworks.md)
- **Architecture:** Read [Execution Pipeline](execution-pipeline.md)
- **Contributing:** See [CONTRIBUTING](../CONTRIBUTING.md) in project root

---

**Questions?** Open an issue on [GitHub](https://github.com/ramamurthy-540835/ossa) or check the [live dashboard](https://ossa-frontend-gygcwrc62a-uc.a.run.app/).

*OSSA v0.4.6 · MIT License*
