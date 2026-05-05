'use client'

import { useState } from 'react'

interface Props {
  onClose: () => void
  onUseTemplate: (templateId: string) => void
  onOpenRecommend: () => void
}

interface Step {
  id: string
  icon: string
  title: string
  sub: string
  accent: string
  body: string[]
  code?: string
  templateId?: string
  action?: string
  badges?: { label: string; color: string }[]
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    icon: '◈',
    title: 'OSSA Agent Dashboard',
    sub: 'Open Standard for Service Agents',
    accent: '#a78bfa',
    body: [
      'OSSA is a governance framework for AI agents. Every agent is defined by a manifest — a YAML spec that captures its model, compliance requirements, cost controls, HITL gate, and trust tier.',
      'You can select a pre-built agent, create one via AI recommendation, or use a template inspired by leading agent styles (Aider, Codex, Claude).',
    ],
    badges: [
      { label: 'SOC2', color: '#60a5fa' },
      { label: 'HIPAA', color: '#34d399' },
      { label: 'HITL', color: '#fb923c' },
      { label: 'Audit', color: '#a78bfa' },
    ],
  },
  {
    id: 'aider',
    icon: '⌨️',
    title: 'Aider-style Pair Programmer',
    sub: 'Inspired by aider.chat — reads context, writes across files',
    accent: '#60a5fa',
    templateId: 'aider-code-developer',
    action: 'Use Aider Style',
    body: [
      'The Aider-style agent acts as a pair programmer. Before writing a single line it reads the full codebase context, then makes surgical changes — refactors, bug fixes, and new features — with a complete audit trail.',
      'It generates tests alongside new logic, respects existing style conventions, and never introduces security vulnerabilities.',
    ],
    code: `# Aider-style approach
1. Read full codebase context first
2. Understand architecture & conventions
3. Make minimal, targeted changes
4. Add tests alongside logic
5. Full OSSA audit trail per change`,
    badges: [
      { label: 'Coding', color: '#60a5fa' },
      { label: 'Refactor', color: '#60a5fa' },
      { label: 'Bug Fix', color: '#60a5fa' },
    ],
  },
  {
    id: 'codex',
    icon: '🧠',
    title: 'Codex-style Completion Engine',
    sub: 'Inspired by OpenAI Codex — precise, style-matched completions',
    accent: '#8b5cf6',
    templateId: 'codex-completion',
    action: 'Use Codex Style',
    body: [
      'The Codex-style agent is a precision code completion engine. Given a function stub, docstring, or partial code block, it fills in exactly what is needed — matching your language idioms, naming conventions, and framework.',
      'It returns only code — no explanations. Completions are concise, runnable, and syntactically correct.',
    ],
    code: `def aggregate_metrics(events: list[Event]) -> dict:
    """Group events by type and compute stats."""
    # ← Codex fills this precisely,
    #   matching your style & types
    ...`,
    badges: [
      { label: 'Completion', color: '#8b5cf6' },
      { label: 'Boilerplate', color: '#8b5cf6' },
      { label: 'Docstrings', color: '#8b5cf6' },
    ],
  },
  {
    id: 'claude',
    icon: '🔮',
    title: 'Claude-style Deep Reasoner',
    sub: 'Inspired by Anthropic Claude — traceable, multi-step reasoning',
    accent: '#a78bfa',
    templateId: 'claude-reasoning',
    action: 'Use Claude Style',
    body: [
      'The Claude-style agent reasons carefully through complex problems. It restates the question, decomposes it into sub-problems, reasons through each step explicitly, and synthesises a final answer with stated confidence and caveats.',
      'Every conclusion cites its evidence. Uncertainty is never hidden. Best for analysis, document review, and decision support under compliance requirements.',
    ],
    code: `// Claude-style reasoning chain
1. Restate problem (confirm understanding)
2. Decompose into sub-problems
3. Reason step-by-step per sub-problem
4. Synthesise answer + confidence %
5. Suggest follow-up questions`,
    badges: [
      { label: 'Analysis', color: '#a78bfa' },
      { label: 'HIPAA', color: '#34d399' },
      { label: 'SOC2', color: '#60a5fa' },
    ],
  },
  {
    id: 'adept',
    icon: '🎭',
    title: 'ADEPT Framework — Mastech Digital',
    sub: 'Multi-agent code generation & enterprise migration',
    accent: '#f97316',
    action: 'Use ADEPT Orchestrator',
    templateId: 'adept-multi-agent-orchestrator',
    body: [
      'ADEPT (AI Development & Engineering Platform Tool) is Mastech Digital\'s codegen framework for building multi-agent systems. OSSA wraps ADEPT agents with governance, compliance, and audit trails.',
      '5 ADEPT templates are included: Language Detective (detects code language), Enterprise Migrator (HiveQL → BigQuery, Spark SQL, etc.), Code Fix & Debug, Data Engineering Chat, and Multi-Agent Orchestrator (generates LangGraph workflows + OSSA manifests).',
    ],
    code: `# ADEPT agent workflow (LangGraph style)
detect_language → analyze_code
    → convert_code → validate_code
         ↓ retry (max 3)      ↓ done
              → finalize_conversion

# ADEPT solution.yml maps to OSSA manifest
kind: Agent  # OSSA wraps ADEPT agents
spec.llm.provider: gemini   # or openai
compliance.frameworks: [SOC2]`,
    badges: [
      { label: 'ADEPT', color: '#f97316' },
      { label: 'Mastech Digital', color: '#f97316' },
      { label: 'LangGraph', color: '#a78bfa' },
      { label: 'Data Engineering', color: '#34d399' },
    ],
  },
  {
    id: 'recommend',
    icon: '✦',
    title: 'AI Recommendation',
    sub: 'Describe your goal → Gemini picks or generates the right agent',
    accent: '#f472b6',
    action: 'Try AI Recommend',
    body: [
      'Click "+ New Agent" then open the "✦ AI Recommend" tab. Describe your use case in plain English — Gemini analyses all registered agents, scores each by fitness (0–100%), identifies gaps, and auto-generates a new agent manifest if none fit.',
      'The generated manifest pre-fills the form with display name, system role, compliance frameworks, cost limits, and mapped requirements with confidence scores. Just review and click Create.',
    ],
    code: `POST /api/recommend
{
  "use_case": "Review Python PRs for SQL injection",
  "scenario": "Healthcare SaaS, HIPAA-regulated"
}

→ confidence scores + new agent manifest
→ requirements mapped with confidence %`,
    badges: [
      { label: 'Gemini', color: '#60a5fa' },
      { label: 'Auto-manifest', color: '#a78bfa' },
      { label: 'Req mapping', color: '#34d399' },
    ],
  },
  {
    id: 'run',
    icon: '▶',
    title: 'Run, Audit & Download',
    sub: 'Execute → Compliance log → Download artifacts',
    accent: '#34d399',
    body: [
      'Select any agent, type your prompt, and click Run. Responses stream in real time with live cost and token tracking.',
      'Every execution produces an OSSA compliance audit trail in the bottom strip — timestamped events covering validation, HITL approval, LLM call, and token budget checks. Download results as Markdown or JSON, or share via email.',
    ],
    code: `# Artifacts per execution
- Markdown report  (.md)
- JSON with metadata (.json)
  - tokens, cost, compliance events
  - provider, model, trust tier
  - HITL approval log`,
    badges: [
      { label: 'Audit', color: '#a78bfa' },
      { label: 'Download', color: '#34d399' },
      { label: 'Share', color: '#60a5fa' },
    ],
  },
]

export function GuidedTour({ onClose, onUseTemplate, onOpenRecommend }: Props) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  function handleAction() {
    if (current.templateId) {
      onUseTemplate(current.templateId)
    } else if (current.id === 'recommend') {
      onOpenRecommend()
    } else {
      onClose()
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 680, borderRadius: 24, background: 'rgba(10,12,20,0.98)', border: `1px solid ${current.accent}33`, boxShadow: `0 32px 100px rgba(0,0,0,0.8), 0 0 60px ${current.accent}15`, transition: 'border-color 0.3s, box-shadow 0.3s', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div style={{ height: 3, borderRadius: '24px 24px 0 0', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ height: '100%', background: `linear-gradient(90deg, ${current.accent}, ${current.accent}88)`, width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width 0.35s ease, background 0.3s' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '24px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 14, background: `${current.accent}18`, border: `1px solid ${current.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, transition: 'all 0.3s' }}>
                {current.icon}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{current.title}</p>
                <p style={{ fontSize: 11, color: current.accent, fontWeight: 600, marginTop: 2, opacity: 0.8 }}>{current.sub}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>
                {step + 1} / {STEPS.length}
              </span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
            </div>
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                style={{ height: 4, borderRadius: 999, border: 'none', cursor: 'pointer', transition: 'all 0.25s', background: i === step ? current.accent : i < step ? `${current.accent}55` : 'rgba(255,255,255,0.1)', width: i === step ? 24 : 8 }}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {current.body.map((para, i) => (
              <p key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>{para}</p>
            ))}
          </div>

          {/* Code block */}
          {current.code && (
            <div style={{ borderRadius: 12, background: 'rgba(0,0,0,0.5)', border: `1px solid ${current.accent}22`, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', borderBottom: `1px solid ${current.accent}18`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff5f57' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#febc2e' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28c840' }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 4, fontFamily: 'JetBrains Mono, monospace' }}>example</span>
              </div>
              <pre style={{ margin: 0, padding: '14px', fontSize: 11, color: `${current.accent}cc`, fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                {current.code}
              </pre>
            </div>
          )}

          {/* Badges */}
          {current.badges && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {current.badges.map(b => (
                <span key={b.label} style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${b.color}15`, color: b.color, border: `1px solid ${b.color}33` }}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 28px 24px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {!isFirst && (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{ padding: '10px 18px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.09)' }}
            >
              ← Back
            </button>
          )}

          <div style={{ flex: 1 }} />

          {current.action && (
            <button
              onClick={handleAction}
              style={{ padding: '10px 20px', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: `${current.accent}22`, color: current.accent, border: `1px solid ${current.accent}44`, transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${current.accent}33` }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${current.accent}22` }}
            >
              {current.action} →
            </button>
          )}

          {!isLast ? (
            <button
              onClick={() => setStep(s => s + 1)}
              style={{ padding: '10px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: `linear-gradient(135deg, ${current.accent}, ${current.accent}bb)`, color: '#fff', border: 'none', boxShadow: `0 4px 20px ${current.accent}44`, transition: 'all 0.15s' }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{ padding: '10px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: `linear-gradient(135deg, ${current.accent}, ${current.accent}bb)`, color: '#fff', border: 'none', boxShadow: `0 4px 20px ${current.accent}44` }}
            >
              Start Building
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
