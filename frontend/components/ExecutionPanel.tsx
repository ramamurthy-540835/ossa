'use client'

import { useState, useRef, useEffect } from 'react'
import { OSSAManifest, ExecutionEvent } from '@/lib/types/ossa'
import { useExecution } from '@/lib/hooks/useExecution'
import { PROVIDERS, COMPLIANCE_OPTIONS, DATA_CLASSIFICATIONS, TRUST_TIERS, getProvider, ComplianceDetail } from '@/lib/providers.config'
import { ComplianceChip } from '@/components/ComplianceChip'
import { useCustomCompliance } from '@/lib/hooks/useCustomCompliance'

const API_BASE = '/api'

interface Props {
  manifest: OSSAManifest | null
  execution: ReturnType<typeof useExecution>
  onManifestUpdate?: (updated: OSSAManifest) => void
}

const SAMPLE_PROMPTS: Record<string, string[]> = {
  'document-summarizer': [
    'Summarize the key points of GDPR and its impact on AI companies handling user data.',
    'Summarize the concept of microservices architecture and when to use it vs monoliths.',
    'Summarize the main differences between supervised, unsupervised and reinforcement learning.',
  ],
  'code-analyzer': [
    `def get_user(id):\n    query = "SELECT * FROM users WHERE id = " + id\n    return db.execute(query)`,
    `async function fetchAll(urls) {\n  const results = [];\n  for (const url of urls) {\n    results.push(await fetch(url).then(r => r.json()));\n  }\n  return results;\n}`,
    `def process_file(path):\n    f = open(path)\n    data = f.read()\n    return eval(data)`,
  ],
  'research-agent': [
    'What are the key differences between RAG and fine-tuning for LLM customization?',
    'Explain the OSSA standard and why vendor neutrality matters for AI agents in enterprise.',
    'What are the main challenges in implementing AI governance in healthcare organizations?',
  ],
}

const ARCH_INFO = [
  { icon: '📋', title: 'Manifest as Code', desc: 'Define agents in YAML — provider, compliance, cost limits, HITL rules. Version control friendly.' },
  { icon: '🔄', title: 'Vendor Neutral', desc: 'Switch between Gemini, Claude, GPT by changing one line. Governance rules stay the same.' },
  { icon: '🔐', title: 'HITL Approval', desc: 'Human-in-the-loop gates trigger on conditions like input size or cost threshold.' },
  { icon: '💰', title: 'Cost Governance', desc: 'Per-execution and daily token budgets enforced. Provider-specific pricing tracked in real-time.' },
  { icon: '📊', title: 'Audit Logging', desc: 'Every action logged with timestamp. Full traceability for compliance investigation.' },
  { icon: '🛡️', title: 'Compliance', desc: 'HIPAA, SOC2 declared per manifest. Data classification and retention policy enforced.' },
]

const CUSTOM_COMPLIANCE_TEMPLATE = `{
  "id": "MY-STANDARD",
  "name": "My Standard",
  "fullName": "My Full Standard Name",
  "description": "What this standard covers and why it matters for AI agents.",
  "keyRequirements": [
    "First key requirement",
    "Second key requirement",
    "Third key requirement"
  ],
  "scope": "Industry or geography this applies to",
  "docsUrl": "https://example.com/docs",
  "color": "#60a5fa",
  "bg": "rgba(59,130,246,0.1)"
}`

interface EditForm {
  description: string
  role: string
  provider: string
  model: string
  temperature: string
  max_tokens: string
  compliance_frameworks: string[]
  data_classification: string
  daily_spend_limit: string
  token_budget_per_execution: string
  hitl_enabled: boolean
  trust_tier: string
  requirements: Array<{ id: string; title: string; description: string; mapped: boolean; confidence: number }>
}

function manifestToEditForm(m: OSSAManifest): EditForm {
  return {
    description: m.description,
    role: (m as any).role ?? '',
    provider: m.provider,
    model: m.model,
    temperature: String(m.temperature),
    max_tokens: String(m.maxTokens),
    compliance_frameworks: m.compliance.frameworks,
    data_classification: m.compliance.classification,
    daily_spend_limit: String(m.cost?.daily ?? 1.0),
    token_budget_per_execution: '2000',
    hitl_enabled: m.hitl_enabled,
    trust_tier: m.trust_tier,
    requirements: (m as any).requirements ?? [],
  }
}

export function ExecutionPanel({ manifest, execution, onManifestUpdate }: Props) {
  const [input, setInput] = useState('')
  const [hitlDone, setHitlDone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [showAddCompliance, setShowAddCompliance] = useState(false)
  const [customJson, setCustomJson] = useState(CUSTOM_COMPLIANCE_TEMPLATE)
  const [customJsonError, setCustomJsonError] = useState('')
  const [roleExpanded, setRoleExpanded] = useState(false)
  const [aiPrompts, setAiPrompts] = useState<string[]>([])
  const [loadingAiPrompts, setLoadingAiPrompts] = useState(false)
  const [genEditReqs, setGenEditReqs] = useState(false)
  const [genEditReqsError, setGenEditReqsError] = useState('')
  const { custom: customCompliance, add: addCustomCompliance, remove: removeCustomCompliance } = useCustomCompliance()
  const responseRef = useRef<HTMLDivElement>(null)

  const { isLoading, error, responseText, events, startExecution, approveHITL, reset, executionId } = execution

  const hitlRequired = events.some((e: ExecutionEvent) => e.type === 'hitl_required') &&
    !events.some((e: ExecutionEvent) => e.type === 'hitl_approved') && !hitlDone

  useEffect(() => {
    if (responseRef.current) responseRef.current.scrollTop = responseRef.current.scrollHeight
  }, [responseText])

  useEffect(() => { setHitlDone(false); setInput(''); setAiPrompts([]) }, [manifest])

  async function fetchAiPrompts() {
    if (!manifest) return
    setLoadingAiPrompts(true)
    try {
      const res = await fetch(`${API_BASE}/suggest-prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_name: manifest.name,
          description: manifest.description,
          role: (manifest as any).role ?? '',
        }),
      })
      const data = await res.json()
      setAiPrompts(data.prompts ?? [])
    } catch { /* silent */ } finally {
      setLoadingAiPrompts(false)
    }
  }

  async function aiGenerateEditReqs() {
    if (!editForm) return
    setGenEditReqs(true)
    setGenEditReqsError('')
    try {
      const res = await fetch(`${API_BASE}/generate-requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          role: editForm.role,
          use_cases: [],
          compliance_frameworks: editForm.compliance_frameworks,
          tags: [],
        }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
      const data = await res.json()
      if (data.requirements?.length) {
        setEditForm(f => f && ({ ...f, requirements: [...f.requirements, ...data.requirements] }))
      }
    } catch (e) {
      setGenEditReqsError(e instanceof Error ? e.message : 'Error generating requirements')
    } finally {
      setGenEditReqs(false)
    }
  }

  async function handleRun() {
    if (!manifest || !input.trim() || isLoading) return
    await startExecution(manifest.name, input)
  }

  function handleReset() { reset(); setInput(''); setHitlDone(false); setCopied(false) }
  async function handleApprove() { await approveHITL(); setHitlDone(true) }

  function openEdit() {
    if (!manifest) return
    setEditForm(manifestToEditForm(manifest))
    setEditError('')
    setShowEdit(true)
  }

  async function saveEdit() {
    if (!manifest || !editForm) return
    setEditSaving(true)
    setEditError('')
    try {
      const res = await fetch(`${API_BASE}/manifests/${manifest.name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          role: editForm.role,
          provider: editForm.provider,
          model: editForm.model,
          temperature: parseFloat(editForm.temperature),
          max_tokens: parseInt(editForm.max_tokens),
          compliance_frameworks: editForm.compliance_frameworks,
          data_classification: editForm.data_classification,
          daily_spend_limit: parseFloat(editForm.daily_spend_limit),
          token_budget_per_execution: parseInt(editForm.token_budget_per_execution),
          hitl_enabled: editForm.hitl_enabled,
          trust_tier: editForm.trust_tier,
          requirements: editForm.requirements,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to update')
      }
      const data = await res.json()
      onManifestUpdate?.(data.manifest as OSSAManifest)
      setShowEdit(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setEditSaving(false)
    }
  }

  function toggleFramework(f: string) {
    if (!editForm) return
    setEditForm(prev => {
      if (!prev) return prev
      const has = prev.compliance_frameworks.includes(f)
      return { ...prev, compliance_frameworks: has ? prev.compliance_frameworks.filter(x => x !== f) : [...prev.compliance_frameworks, f] }
    })
  }

  function saveCustomCompliance() {
    setCustomJsonError('')
    try {
      const parsed = JSON.parse(customJson) as ComplianceDetail
      const required = ['id', 'name', 'fullName', 'description', 'keyRequirements', 'scope', 'docsUrl', 'color', 'bg']
      const missing = required.filter(k => !(k in parsed))
      if (missing.length) throw new Error(`Missing fields: ${missing.join(', ')}`)
      if (!Array.isArray(parsed.keyRequirements)) throw new Error('"keyRequirements" must be an array')
      addCustomCompliance(parsed)
      setCustomJson(CUSTOM_COMPLIANCE_TEMPLATE)
      setShowAddCompliance(false)
    } catch (err) {
      setCustomJsonError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  async function handleCopy() {
    if (!responseText) return
    await navigator.clipboard.writeText(responseText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload(fmt: 'md' | 'json') {
    if (executionId) {
      window.open(`${API_BASE}/artifacts/${executionId}/download?fmt=${fmt}`, '_blank')
    } else if (responseText) {
      const blob = new Blob([responseText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ossa-result.${fmt === 'json' ? 'json' : 'md'}`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  function handleShare() {
    if (!responseText) return
    const subject = encodeURIComponent(`OSSA Agent Result: ${manifest?.name ?? 'agent'}`)
    const body = encodeURIComponent(responseText.slice(0, 2000))
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  /* ── Empty / Info state ── */
  if (!manifest) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '8px 20px', borderRadius: 999, marginBottom: 20,
            background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 8px #818cf8', display: 'inline-block' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Open Standard for Service Agents · v0.4.6
            </span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.15, marginBottom: 14 }}>
            <span style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Vendor-Neutral AI Governance
            </span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            OSSA is a specification for defining AI agents with built-in governance — compliance, cost controls,
            human approval workflows, and audit logging — all declared in a single YAML manifest.
          </p>
        </div>

        {/* What is OSSA */}
        <div style={{ padding: '20px 24px', borderRadius: 18, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>What is OSSA</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { q: 'Define once', a: 'One YAML manifest describes everything — the agent role, LLM config, compliance rules, cost limits, HITL gates.' },
              { q: 'Execute anywhere', a: 'Switch Gemini → Claude → GPT by changing one line. All governance stays identical.' },
              { q: 'Govern automatically', a: 'Cost budgets enforced at runtime. HITL triggers on configured conditions. Every action audited.' },
              { q: 'Trust by design', a: 'Compliance frameworks (HIPAA, SOC2) declared per agent. Data classification and retention built in.' },
            ].map(({ q, a }) => (
              <div key={q} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 5 }}>{q}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Architecture */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>Architecture & Key Concepts</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {ARCH_INFO.map(({ icon, title, desc }) => (
              <div key={title} style={{ padding: '16px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.2s' }}>
                <div style={{ fontSize: 22, marginBottom: 10 }}>{icon}</div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 6, letterSpacing: '-0.01em' }}>{title}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Manifest sample */}
        <div style={{ padding: '20px 24px', borderRadius: 18, background: 'rgba(13,17,23,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 14 }}>Sample OSSA Manifest</p>
          <pre style={{ fontSize: 11, lineHeight: 1.9, fontFamily: 'JetBrains Mono, monospace', color: 'rgba(255,255,255,0.5)', overflowX: 'auto' }}>{`apiVersion: ossa/v0.4.6
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
          type: on_condition
          condition: input_size > 5000
        mode: ALWAYS`}</pre>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }}>
            ← Select an agent from the sidebar to start executing
          </p>
        </div>
      </div>
    )
  }

  /* ── Active panel ── */
  const samples = SAMPLE_PROMPTS[manifest.name] ?? []
  const st = isLoading
    ? { label: 'Running',  color: '#fbbf24', glow: '#fbbf2430' }
    : error
    ? { label: 'Error',    color: '#f87171', glow: '#f8717130' }
    : responseText
    ? { label: 'Complete', color: '#34d399', glow: '#34d39930' }
    : { label: 'Ready',    color: '#60a5fa', glow: '#60a5fa30' }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.03em', marginBottom: 4 }}>{manifest.name}</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{manifest.description}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 16px', borderRadius: 999, flexShrink: 0, background: st.glow, border: `1px solid ${st.color}30` }}>
          <span className={isLoading ? 'blink' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, boxShadow: `0 0 8px ${st.color}`, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: st.color }}>{st.label}</span>
        </div>
      </div>

      {/* Manifest chips + Edit button */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { k: 'Provider', v: manifest.provider },
          { k: 'Model', v: manifest.model },
          { k: 'Temp', v: String(manifest.temperature) },
          { k: 'Max Tokens', v: String(manifest.maxTokens) },
          { k: 'Trust', v: manifest.trust_tier },
        ].map((item, i) => (
          <div key={i} style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{item.k}: </span>
            <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{item.v}</span>
          </div>
        ))}
        {manifest.compliance.frameworks.map(f => (
          <ComplianceChip key={f} framework={f} mode="link" active compact customDetail={customCompliance[f]} />
        ))}
        <button
          onClick={openEdit}
          style={{ marginLeft: 4, padding: '5px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', transition: 'all 0.15s' }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'rgba(99,102,241,0.2)' }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)' }}
        >
          Edit
        </button>
      </div>

      {/* Agent capability card */}
      {manifest.role && (
        <div style={{ borderRadius: 14, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', overflow: 'hidden' }}>
          {/* Card header */}
          <button
            onClick={() => setRoleExpanded(x => !x)}
            style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>What this agent does</span>
              {/* capability pills derived from name/compliance */}
              <div style={{ display: 'flex', gap: 4 }}>
                {manifest.hitl_enabled && (
                  <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 9, fontWeight: 700, background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.25)' }}>HITL</span>
                )}
                {manifest.compliance.frameworks.slice(0, 2).map(f => (
                  <span key={f} style={{ padding: '2px 7px', borderRadius: 999, fontSize: 9, fontWeight: 700, background: 'rgba(16,185,129,0.08)', color: '#34d399', border: '1px solid rgba(16,185,129,0.18)' }}>{f}</span>
                ))}
                <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 9, fontWeight: 700, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>{manifest.trust_tier}</span>
              </div>
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', transition: 'transform 0.2s', display: 'inline-block', transform: roleExpanded ? 'rotate(180deg)' : 'none' }}>▾</span>
          </button>

          {/* Expanded body */}
          {roleExpanded && (
            <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(99,102,241,0.1)' }}>

              {/* Role instructions */}
              <div style={{ paddingTop: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 6 }}>System Role</p>
                <pre style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                  {manifest.role}
                </pre>
              </div>

              {/* Runtime settings summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {[
                  { label: 'Provider',    value: manifest.provider },
                  { label: 'Model',       value: manifest.model },
                  { label: 'Temperature', value: String(manifest.temperature) },
                  { label: 'Max Tokens',  value: manifest.maxTokens.toLocaleString() },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: 11, color: '#c7d2fe', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Daily budget bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Daily Budget</span>
                  <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#34d399' }}>${manifest.cost?.daily ?? '—'}</span>
                </div>
                <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', width: '2%' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI prompt suggester */}
      {!responseText && !isLoading && (
        <div style={{ borderRadius: 14, background: 'rgba(167,139,250,0.04)', border: '1px solid rgba(167,139,250,0.12)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
              ✦ AI Prompt Suggestions
            </span>
            <button
              onClick={fetchAiPrompts}
              disabled={loadingAiPrompts}
              style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: loadingAiPrompts ? 'rgba(167,139,250,0.06)' : 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {loadingAiPrompts
                ? <><span style={{ display: 'inline-block', width: 9, height: 9, border: '1.5px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Generating…</>
                : aiPrompts.length > 0 ? '↻ Refresh' : '✦ Generate'}
            </button>
          </div>

          {/* Static samples as fallback while not yet AI-generated */}
          {aiPrompts.length === 0 && !loadingAiPrompts && samples.length > 0 && (
            <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {samples.map((s, i) => (
                <button key={i} onClick={() => setInput(s)}
                  style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 9, cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 1.5, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.08)'; (e.currentTarget as HTMLElement).style.color = '#c7d2fe' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)' }}>
                  <span style={{ color: '#818cf8', marginRight: 7, fontWeight: 700 }}>→</span>
                  {s.length > 110 ? s.slice(0, 110) + '…' : s}
                </button>
              ))}
            </div>
          )}
          {aiPrompts.length === 0 && !loadingAiPrompts && samples.length === 0 && (
            <p style={{ padding: '0 14px 12px', fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
              Click Generate to get AI-tailored prompts for this agent
            </p>
          )}

          {/* AI-generated prompts */}
          {aiPrompts.length > 0 && (
            <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {aiPrompts.map((s, i) => (
                <button key={i} onClick={() => setInput(s)}
                  style={{ textAlign: 'left', padding: '9px 12px', borderRadius: 9, cursor: 'pointer', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.18)', color: 'rgba(255,255,255,0.55)', fontSize: 12, lineHeight: 1.55, transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.15)'; (e.currentTarget as HTMLElement).style.color = '#c7d2fe' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.07)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)' }}>
                  <span style={{ color: '#a78bfa', marginRight: 7, fontWeight: 800 }}>✦</span>
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: `1px solid ${input ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.08)'}`, transition: 'border-color 0.2s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Input</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>{input.length} chars · Ctrl+Enter to run</span>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isLoading}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun() }}
          placeholder="Type or click a sample prompt above…"
          style={{ width: '100%', padding: '16px', background: 'transparent', color: '#e2e8f0', fontSize: 14, lineHeight: 1.7, resize: 'none', outline: 'none', border: 'none', fontFamily: 'inherit' }}
          rows={5}
        />
      </div>

      {/* HITL */}
      {hitlRequired && (
        <div className="fade-up" style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(251,146,60,0.07)', border: '1px solid rgba(251,146,60,0.25)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(251,146,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🔐</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fcd34d', marginBottom: 3 }}>Human Approval Required</p>
            <p style={{ fontSize: 12, color: 'rgba(252,211,77,0.5)', lineHeight: 1.5 }}>Input exceeds HITL threshold. A supervisor must approve before execution continues.</p>
          </div>
          <button onClick={handleApprove} style={{ padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(251,146,60,0.2)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.35)', flexShrink: 0 }}>
            Approve ✓
          </button>
        </div>
      )}

      {/* Response */}
      <div style={{ borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Response</span>
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
              <span style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>Streaming from Gemini…</span>
            </div>
          )}
          {responseText && !isLoading && (
            <span style={{ fontSize: 11, color: '#34d399', fontWeight: 600 }}>✓ {responseText.length} chars received</span>
          )}
        </div>
        <div ref={responseRef} style={{ padding: '16px', minHeight: 140, maxHeight: 300, overflowY: 'auto', fontSize: 14, lineHeight: 1.8, color: responseText ? '#e2e8f0' : 'rgba(255,255,255,0.2)' }}>
          {responseText ? (
            <span className={isLoading ? 'stream-cursor' : ''}>{responseText}</span>
          ) : isLoading ? (
            <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '8px 0' }}>
              {[0,1,2].map(i => (
                <div key={i} className="blink" style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', animationDelay: `${i * 0.2}s` }} />
              ))}
              <span style={{ marginLeft: 6, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Waiting for model response…</span>
            </div>
          ) : (
            'Response will appear here after execution…'
          )}
        </div>

        {/* Artifact actions – shown only when execution is done */}
        {responseText && !isLoading && (
          <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <ArtifactBtn label={copied ? '✓ Copied' : 'Copy'} color="#a78bfa" onClick={handleCopy} />
            <ArtifactBtn label="↓ Markdown" color="#60a5fa" onClick={() => handleDownload('md')} />
            <ArtifactBtn label="↓ JSON" color="#34d399" onClick={() => handleDownload('json')} />
            <ArtifactBtn label="✉ Share" color="#fb923c" onClick={handleShare} />
          </div>
        )}
      </div>

      {error && (
        <div className="fade-up" style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#fca5a5' }}>
          ⚠ {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleRun}
          disabled={isLoading || !input.trim() || hitlRequired}
          style={{ flex: 1, padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', boxShadow: isLoading || !input.trim() ? 'none' : '0 4px 24px rgba(99,102,241,0.35)', opacity: isLoading || !input.trim() || hitlRequired ? 0.45 : 1, transition: 'all 0.2s', letterSpacing: '-0.01em' }}>
          {isLoading ? '⏳  Executing…' : '▶  Run Agent'}
        </button>
        <button
          onClick={handleReset}
          style={{ padding: '13px 24px', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.09)', transition: 'all 0.15s' }}>
          Reset
        </button>
      </div>

      {/* ── Edit Manifest Modal ── */}
      {showEdit && editForm && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setShowEdit(false)}
        >
          <div
            style={{ width: '100%', maxWidth: 580, borderRadius: 20, background: 'rgba(13,17,23,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflowY: 'auto', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Edit — {manifest.name}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Changes are saved to the YAML file and take effect immediately</p>
              </div>
              <button onClick={() => setShowEdit(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Description */}
              <EF label="Description">
                <input value={editForm.description} onChange={e => setEditForm(f => f && ({ ...f, description: e.target.value }))} style={EI} />
              </EF>

              {/* Provider + Model */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <EF label="Provider">
                  <select
                    value={editForm.provider}
                    onChange={e => {
                      const p = e.target.value
                      const firstModel = getProvider(p)?.models[0]?.id ?? ''
                      setEditForm(f => f && ({ ...f, provider: p, model: firstModel }))
                    }}
                    style={EI}
                  >
                    {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </EF>
                <EF label="Model">
                  <select value={editForm.model} onChange={e => setEditForm(f => f && ({ ...f, model: e.target.value }))} style={EI}>
                    {(getProvider(editForm.provider)?.models ?? []).map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </EF>
              </div>

              {/* Temp + Tokens */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <EF label="Temperature (0–2)">
                  <input type="number" min="0" max="2" step="0.05" value={editForm.temperature} onChange={e => setEditForm(f => f && ({ ...f, temperature: e.target.value }))} style={EI} />
                </EF>
                <EF label="Max Tokens">
                  <input type="number" min="64" max="32000" step="64" value={editForm.max_tokens} onChange={e => setEditForm(f => f && ({ ...f, max_tokens: e.target.value }))} style={EI} />
                </EF>
              </div>

              {/* System Role */}
              <EF label="System Role / Instructions">
                <textarea value={editForm.role} onChange={e => setEditForm(f => f && ({ ...f, role: e.target.value }))} rows={5} style={{ ...EI, resize: 'vertical' }} />
              </EF>

              {/* Compliance frameworks — toggle chips + add custom */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    Compliance Frameworks
                  </p>
                  <button
                    onClick={() => { setShowAddCompliance(s => !s); setCustomJsonError('') }}
                    title="Add custom compliance framework"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: showAddCompliance ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', transition: 'all 0.15s' }}
                  >
                    <span style={{ fontSize: 13 }}>⚙</span> Add Custom
                  </button>
                </div>

                {/* Built-in + custom chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[...COMPLIANCE_OPTIONS, ...Object.keys(customCompliance)].map(f => {
                    const on = editForm.compliance_frameworks.includes(f)
                    const isCustom = f in customCompliance
                    const detail = customCompliance[f] ?? null
                    return (
                      <div key={f} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 0 }}>
                        <ComplianceChip
                          framework={f}
                          mode="toggle"
                          active={on}
                          onToggle={() => toggleFramework(f)}
                          customDetail={detail ?? undefined}
                        />
                        {isCustom && (
                          <button
                            onClick={() => {
                              removeCustomCompliance(f)
                              if (on) toggleFramework(f)
                            }}
                            title="Remove custom framework"
                            style={{ marginLeft: 2, width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.25)', color: '#f87171', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 800 }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* JSON editor panel */}
                {showAddCompliance && (
                  <div style={{ marginTop: 12, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#a5b4fc' }}>New Compliance Framework — JSON</p>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Saved to browser storage</span>
                    </div>
                    <textarea
                      value={customJson}
                      onChange={e => { setCustomJson(e.target.value); setCustomJsonError('') }}
                      rows={14}
                      spellCheck={false}
                      style={{ ...EI, borderRadius: 0, border: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, lineHeight: 1.7, resize: 'vertical', background: 'rgba(0,0,0,0.3)' }}
                    />
                    {customJsonError && (
                      <div style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.07)', borderTop: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#fca5a5' }}>
                        ⚠ {customJsonError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                      <button
                        onClick={saveCustomCompliance}
                        style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none' }}
                      >
                        Add Framework
                      </button>
                      <button
                        onClick={() => { setShowAddCompliance(false); setCustomJson(CUSTOM_COMPLIANCE_TEMPLATE); setCustomJsonError('') }}
                        style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Data class + Trust */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <EF label="Data Classification">
                  <select value={editForm.data_classification} onChange={e => setEditForm(f => f && ({ ...f, data_classification: e.target.value }))} style={EI}>
                    {DATA_CLASSIFICATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </EF>
                <EF label="Trust Tier">
                  <select value={editForm.trust_tier} onChange={e => setEditForm(f => f && ({ ...f, trust_tier: e.target.value }))} style={EI}>
                    {TRUST_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </EF>
              </div>

              {/* Budget */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <EF label="Daily Spend Limit ($)">
                  <input type="number" min="0" step="0.1" value={editForm.daily_spend_limit} onChange={e => setEditForm(f => f && ({ ...f, daily_spend_limit: e.target.value }))} style={EI} />
                </EF>
                <EF label="Token Budget / Execution">
                  <input type="number" min="100" step="100" value={editForm.token_budget_per_execution} onChange={e => setEditForm(f => f && ({ ...f, token_budget_per_execution: e.target.value }))} style={EI} />
                </EF>
              </div>

              {/* HITL */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.2)' }}>
                <input type="checkbox" id="edit-hitl" checked={editForm.hitl_enabled} onChange={e => setEditForm(f => f && ({ ...f, hitl_enabled: e.target.checked }))} style={{ accentColor: '#fb923c', width: 16, height: 16, cursor: 'pointer' }} />
                <label htmlFor="edit-hitl" style={{ fontSize: 13, fontWeight: 600, color: '#fcd34d', cursor: 'pointer' }}>Enable Human-in-the-Loop (HITL) approval gate</label>
              </div>

              {/* Requirements */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    Mapped Requirements ({editForm.requirements.length})
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={aiGenerateEditReqs}
                      disabled={genEditReqs}
                      title="AI generates requirements from description + role"
                      style={{ padding: '3px 11px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: genEditReqs ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      {genEditReqs
                        ? <><span style={{ display: 'inline-block', width: 9, height: 9, border: '1.5px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Generating…</>
                        : '✦ AI Fill'}
                    </button>
                    <button
                      onClick={() => setEditForm(f => f && ({ ...f, requirements: [...f.requirements, { id: `REQ-${String(f.requirements.length + 1).padStart(2, '0')}`, title: '', description: '', mapped: true, confidence: 0.8 }] }))}
                      style={{ padding: '3px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {genEditReqsError && (
                  <div style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#fca5a5', marginBottom: 8 }}>⚠ {genEditReqsError}</div>
                )}

                {editForm.requirements.length === 0 && !genEditReqs && (
                  <div style={{ padding: '12px', borderRadius: 10, background: 'rgba(167,139,250,0.04)', border: '1px dashed rgba(167,139,250,0.2)', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>No requirements. Click <strong style={{ color: '#a78bfa' }}>✦ AI Fill</strong> to generate from role + description.</p>
                  </div>
                )}

                {editForm.requirements.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {editForm.requirements.map((req, i) => {
                      const conf = Math.round(req.confidence * 100)
                      const color = conf >= 80 ? '#34d399' : conf >= 60 ? '#fbbf24' : '#f87171'
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <span style={{ fontSize: 11, color, fontWeight: 800, flexShrink: 0 }}>{req.mapped ? '✓' : '○'}</span>
                          <input
                            value={req.id}
                            onChange={e => setEditForm(f => f && ({ ...f, requirements: f.requirements.map((r, j) => j === i ? { ...r, id: e.target.value } : r) }))}
                            style={{ width: 100, padding: '2px 6px', borderRadius: 5, fontSize: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}
                          />
                          <input
                            value={req.title}
                            onChange={e => setEditForm(f => f && ({ ...f, requirements: f.requirements.map((r, j) => j === i ? { ...r, title: e.target.value } : r) }))}
                            placeholder="Requirement title"
                            style={{ flex: 1, padding: '2px 6px', borderRadius: 5, fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                          />
                          <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', width: 30, textAlign: 'right', flexShrink: 0 }}>{conf}%</span>
                          <button onClick={() => setEditForm(f => f && ({ ...f, requirements: f.requirements.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0 }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {editError && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#fca5a5' }}>⚠ {editError}</div>
              )}

              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', opacity: editSaving ? 0.6 : 1 }}
                >
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button onClick={() => setShowEdit(false)} style={{ padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.09)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ArtifactBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
        background: `${color}14`, color, border: `1px solid ${color}30`, transition: 'all 0.15s',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = `${color}28` }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = `${color}14` }}
    >
      {label}
    </button>
  )
}

/* ── Edit field helpers ── */
const EI: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0', outline: 'none', fontFamily: 'inherit',
}

function EF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      {children}
    </div>
  )
}
