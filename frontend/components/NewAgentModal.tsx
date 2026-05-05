'use client'

import { useState, useRef, useEffect } from 'react'
import { AGENT_TEMPLATES, TEMPLATE_CATEGORIES, AgentTemplate } from '@/lib/agent.templates'
import { PROVIDERS, COMPLIANCE_OPTIONS, DATA_CLASSIFICATIONS, getProvider } from '@/lib/providers.config'

const API_BASE = '/api'

type Tab = 'recommend' | 'template' | 'custom'

const DEFAULT_ROLE = `You are a helpful AI assistant.
Your task is to:
1. Understand the user's request carefully
2. Provide a clear, accurate, and concise response
3. Format your output for readability`

interface AgentForm {
  display_name: string
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
  use_cases: string
  tags: string
  requirements: Array<{ id: string; title: string; description: string; mapped: boolean; confidence: number }>
}

const blankForm = (): AgentForm => ({
  display_name: '', description: '', role: DEFAULT_ROLE,
  provider: 'gemini', model: 'gemini-2.5-flash',
  temperature: '0.3', max_tokens: '1024',
  compliance_frameworks: ['SOC2'],
  data_classification: 'internal',
  daily_spend_limit: '1.0', token_budget_per_execution: '2000',
  hitl_enabled: false, trust_tier: 'org-verified',
  use_cases: '', tags: '', requirements: [],
})

function templateToForm(t: AgentTemplate): AgentForm {
  return {
    display_name: t.display_name,
    description: t.description,
    role: t.role,
    provider: t.provider, model: t.model,
    temperature: String(t.temperature), max_tokens: String(t.max_tokens),
    compliance_frameworks: t.compliance_frameworks,
    data_classification: t.data_classification,
    daily_spend_limit: String(t.daily_spend_limit),
    token_budget_per_execution: String(t.token_budget_per_execution),
    hitl_enabled: t.hitl_enabled, trust_tier: t.trust_tier,
    use_cases: t.use_cases.join(', '), tags: t.tags.join(', '),
    requirements: t.requirements,
  }
}

interface Props {
  onClose: () => void
  onCreated: () => void
  initialTemplate?: string
}

export function NewAgentModal({ onClose, onCreated, initialTemplate }: Props) {
  const [tab, setTab] = useState<Tab>(initialTemplate ? 'template' : 'recommend')
  const [form, setForm] = useState<AgentForm>(blankForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // AI recommendation state
  const [useCase, setUseCase] = useState('')
  const [scenario, setScenario] = useState('')
  const [recommending, setRecommending] = useState(false)
  const [recResult, setRecResult] = useState<any>(null)
  const [recError, setRecError] = useState('')
  const [recApplied, setRecApplied] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  // Requirements AI helper
  const [genReqs, setGenReqs] = useState(false)
  const [genReqsError, setGenReqsError] = useState('')

  // AI role generator
  const [generatingRole, setGeneratingRole] = useState(false)
  const [roleGenError, setRoleGenError] = useState('')

  async function aiGenerateRole() {
    if (!form.display_name.trim() && !form.description.trim()) return
    setGeneratingRole(true)
    setRoleGenError('')
    try {
      const res = await fetch(`${API_BASE}/generate-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name,
          description: form.description,
          use_cases: form.use_cases.split(',').map(s => s.trim()).filter(Boolean),
          compliance_frameworks: form.compliance_frameworks,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
      const data = await res.json()
      if (data.role) set('role', data.role)
    } catch (e) {
      setRoleGenError(e instanceof Error ? e.message : 'Error generating role')
    } finally {
      setGeneratingRole(false)
    }
  }

  async function aiGenerateRequirements() {
    if (!form.description.trim() && !form.role.trim()) return
    setGenReqs(true)
    setGenReqsError('')
    try {
      const res = await fetch(`${API_BASE}/generate-requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description,
          role: form.role,
          use_cases: form.use_cases.split(',').map(s => s.trim()).filter(Boolean),
          compliance_frameworks: form.compliance_frameworks,
          tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
      const data = await res.json()
      if (data.requirements?.length) {
        setForm(f => ({ ...f, requirements: [...f.requirements, ...data.requirements] }))
      }
    } catch (e) {
      setGenReqsError(e instanceof Error ? e.message : 'Error generating requirements')
    } finally {
      setGenReqs(false)
    }
  }

  function addBlankRequirement() {
    setForm(f => ({
      ...f,
      requirements: [...f.requirements, { id: `REQ-CUSTOM-${String(f.requirements.length + 1).padStart(2, '0')}`, title: '', description: '', mapped: true, confidence: 0.8 }],
    }))
  }

  // Template state
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null)

  // Auto-apply initialTemplate from tour
  useEffect(() => {
    if (initialTemplate) {
      const t = AGENT_TEMPLATES.find(t => t.id === initialTemplate)
      if (t) {
        setSelectedTemplate(t)
        setForm(templateToForm(t))
      }
    }
  }, [initialTemplate])

  // ── helpers ──
  function set<K extends keyof AgentForm>(k: K, v: AgentForm[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function toggleFramework(f: string) {
    setForm(prev => {
      const has = prev.compliance_frameworks.includes(f)
      return { ...prev, compliance_frameworks: has ? prev.compliance_frameworks.filter(x => x !== f) : [...prev.compliance_frameworks, f] }
    })
  }

  // ── AI recommend ──
  async function runRecommend() {
    if (!useCase.trim()) return
    setRecommending(true)
    setRecError('')
    setRecResult(null)
    try {
      const res = await fetch(`${API_BASE}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_case: useCase, scenario }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
      const data = await res.json()
      setRecResult(data)
      // If a new agent is suggested, pre-fill the form
      if (data.suggest_new && data.new_agent) {
        const a = data.new_agent
        setForm({
          display_name: a.display_name ?? '',
          description: a.description ?? '',
          role: a.role ?? DEFAULT_ROLE,
          provider: a.provider ?? 'gemini',
          model: a.model ?? 'gemini-2.5-flash',
          temperature: String(a.temperature ?? 0.3),
          max_tokens: String(a.max_tokens ?? 1024),
          compliance_frameworks: a.compliance_frameworks ?? ['SOC2'],
          data_classification: a.data_classification ?? 'internal',
          daily_spend_limit: String(a.daily_spend_limit ?? 1.0),
          token_budget_per_execution: String(a.token_budget_per_execution ?? 2000),
          hitl_enabled: a.hitl_enabled ?? false,
          trust_tier: a.trust_tier ?? 'org-verified',
          use_cases: (a.use_cases ?? []).join(', '),
          tags: (a.tags ?? []).join(', '),
          requirements: a.requirements ?? [],
        })
        setRecApplied(true)
      }
    } catch (e) {
      setRecError(e instanceof Error ? e.message : 'Error')
    } finally {
      setRecommending(false)
    }
  }

  function applyTemplate(t: AgentTemplate) {
    setSelectedTemplate(t)
    setForm(templateToForm(t))
  }

  // ── Create ──
  async function handleCreate() {
    if (!form.display_name.trim() || !form.description.trim()) return
    setSaving(true)
    setSaveError('')
    try {
      const slug = form.display_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const res = await fetch(`${API_BASE}/manifests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: slug,
          description: form.description,
          role: form.role,
          provider: form.provider, model: form.model,
          temperature: parseFloat(form.temperature),
          max_tokens: parseInt(form.max_tokens),
          compliance_frameworks: form.compliance_frameworks,
          data_classification: form.data_classification,
          daily_spend_limit: parseFloat(form.daily_spend_limit),
          token_budget_per_execution: parseInt(form.token_budget_per_execution),
          hitl_enabled: form.hitl_enabled,
          trust_tier: form.trust_tier,
          use_cases: form.use_cases.split(',').map(s => s.trim()).filter(Boolean),
          tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
          requirements: form.requirements,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed')
      }
      onCreated()
      onClose()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const filteredTemplates = selectedCategory === 'All'
    ? AGENT_TEMPLATES
    : AGENT_TEMPLATES.filter(t => t.category === selectedCategory)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 760, borderRadius: 20, background: 'rgba(13,17,23,0.99)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>New Agent</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>AI-recommended · from template · or fully custom — all saved with UUID</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 0 }}>
            {([
              { id: 'recommend', label: '✦ AI Recommend', color: '#a78bfa' },
              { id: 'template',  label: '⊞ From Template', color: '#60a5fa' },
              { id: 'custom',    label: '⊕ Custom',        color: '#34d399' },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '8px 18px', borderRadius: '8px 8px 0 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: tab === t.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                  color: tab === t.id ? t.color : 'rgba(255,255,255,0.3)',
                  borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px 0' }}>

          {/* ── AI RECOMMEND tab ── */}
          {tab === 'recommend' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {[
                  { n: '1', label: 'Describe', done: useCase.trim().length > 0 },
                  { n: '2', label: 'Analyze', done: !!recResult },
                  { n: '3', label: 'Review', done: recApplied },
                  { n: '4', label: 'Create', done: false },
                ].map((s, i, arr) => {
                  const active = (!s.done && (i === 0 || arr[i - 1].done))
                  const color = s.done ? '#34d399' : active ? '#a78bfa' : 'rgba(255,255,255,0.15)'
                  return (
                    <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? 1 : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.done ? 'rgba(52,211,153,0.2)' : active ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)', border: `1.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color, transition: 'all 0.3s' }}>
                          {s.done ? '✓' : s.n}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.04em' }}>{s.label}</span>
                      </div>
                      {i < arr.length - 1 && <div style={{ flex: 1, height: 1, background: s.done ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.07)', margin: '0 8px', transition: 'background 0.3s' }} />}
                    </div>
                  )
                })}
              </div>

              <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Tell Gemini what you need to accomplish. It will match existing agents with confidence scores and auto-generate a new manifest if none fit — pre-filled and ready to create.
                </p>
              </div>

              <F label="Use Case *" hint="e.g. 'Review Python PRs for security issues'">
                <textarea value={useCase} onChange={e => setUseCase(e.target.value)} rows={2} placeholder="Describe what the agent should do…" style={I} />
              </F>
              <F label="Additional Context" hint="optional — team, domain, compliance needs">
                <textarea value={scenario} onChange={e => setScenario(e.target.value)} rows={2} placeholder="e.g. Healthcare SaaS, HIPAA-regulated, Python backend…" style={I} />
              </F>

              <button
                onClick={runRecommend}
                disabled={recommending || !useCase.trim()}
                style={{ padding: '11px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff', border: 'none', opacity: recommending || !useCase.trim() ? 0.5 : 1, position: 'relative', overflow: 'hidden' }}
              >
                {recommending ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Gemini is analysing…
                  </span>
                ) : '✦ Get AI Recommendation'}
              </button>

              {recError && <ErrBox msg={recError} />}

              {/* Auto-filled banner */}
              {recApplied && (
                <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>✓</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>Form auto-filled from AI manifest</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Scroll down to review and edit before creating</p>
                    </div>
                  </div>
                  <button
                    onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
                  >
                    Review Form ↓
                  </button>
                </div>
              )}

              {recResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Summary */}
                  {recResult.summary && (
                    <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65 }}>
                      <span style={{ color: '#c4b5fd', fontWeight: 700 }}>✦ </span>{recResult.summary}
                    </div>
                  )}

                  {/* Existing agent matches */}
                  {recResult.recommendations?.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Existing Agent Matches</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {recResult.recommendations.map((r: any, i: number) => {
                          const conf = Math.round((r.confidence ?? 0) * 100)
                          const color = conf >= 80 ? '#34d399' : conf >= 60 ? '#fbbf24' : '#f87171'
                          return (
                            <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{r.agent_name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ width: 80, height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${conf}%`, background: color, borderRadius: 999, transition: 'width 0.4s ease' }} />
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: 'JetBrains Mono, monospace' }}>{conf}%</span>
                                </div>
                              </div>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, marginBottom: r.gaps?.length ? 6 : 0 }}>{r.reasoning}</p>
                              {r.gaps?.length > 0 && (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                  {r.gaps.map((g: string, j: number) => (
                                    <span key={j} style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>gap: {g}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggested new agent */}
                  {recResult.suggest_new && recResult.new_agent && (
                    <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.25)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>✦ New Agent Recommended</p>
                        <span style={{ fontSize: 10, color: 'rgba(52,211,153,0.6)', fontWeight: 600 }}>Pre-filled below ↓</span>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{recResult.new_agent.display_name}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55, marginBottom: 10 }}>{recResult.new_agent.description}</p>
                      {/* Requirement mapping preview */}
                      {recResult.new_agent.requirements?.length > 0 && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Mapped Requirements</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {recResult.new_agent.requirements.map((req: any, i: number) => {
                              const conf = Math.round((req.confidence ?? 0) * 100)
                              const color = conf >= 80 ? '#34d399' : conf >= 60 ? '#fbbf24' : '#f87171'
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                                  <span style={{ fontSize: 10, color, fontWeight: 800, flexShrink: 0 }}>{req.mapped ? '✓' : '○'}</span>
                                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}>{req.id}</span>
                                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', flex: 1 }}>{req.title}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace' }}>{conf}%</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {recResult.suggest_new && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                      Review and edit the form below, then click Create Agent
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── TEMPLATE tab ── */}
          {tab === 'template' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Category filter */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['All', ...TEMPLATE_CATEGORIES].map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: selectedCategory === c ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.05)', color: selectedCategory === c ? '#60a5fa' : 'rgba(255,255,255,0.4)', border: `1px solid ${selectedCategory === c ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.15s' }}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {filteredTemplates.map(t => {
                  const active = selectedTemplate?.id === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      style={{ textAlign: 'left', padding: '14px', borderRadius: 12, cursor: 'pointer', background: active ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.07)'}`, transition: 'all 0.15s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 20 }}>{t.icon}</span>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: active ? '#93c5fd' : '#e2e8f0' }}>{t.display_name}</p>
                          <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>{t.category}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 6 }}>{t.description}</p>
                      {t.inspiration && (
                        <p style={{ fontSize: 10, color: 'rgba(96,165,250,0.6)', fontStyle: 'italic' }}>{t.inspiration}</p>
                      )}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                        <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 9, fontWeight: 700, background: 'rgba(96,165,250,0.12)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}>{t.provider}</span>
                        {t.compliance_frameworks.map(f => (
                          <span key={f} style={{ padding: '2px 7px', borderRadius: 999, fontSize: 9, fontWeight: 700, background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}>{f}</span>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
              {selectedTemplate && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.2)', fontSize: 11, color: '#93c5fd' }}>
                  ✓ Template applied — review the form below before creating
                </div>
              )}
            </div>
          )}

          {/* ── SHARED form (shown in all tabs) ── */}
          <div ref={formRef} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: tab === 'custom' ? 0 : 20, paddingTop: tab === 'custom' ? 0 : 16, borderTop: tab === 'custom' ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
            {tab !== 'custom' && (
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {tab === 'recommend' ? 'AI-Generated Manifest — Review & Edit' : 'Template Manifest — Review & Edit'}
              </p>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Agent Title *" hint="display name — does not need to be unique">
                <input value={form.display_name} onChange={e => set('display_name', e.target.value)} placeholder="My Code Reviewer" style={I} />
              </F>
              <F label="Description *">
                <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="One sentence description" style={I} />
              </F>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Provider">
                <select value={form.provider} onChange={e => { const p = e.target.value; const m = getProvider(p)?.models[0]?.id ?? ''; set('provider', p); set('model', m) }} style={I}>
                  {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </F>
              <F label="Model">
                <select value={form.model} onChange={e => set('model', e.target.value)} style={I}>
                  {(getProvider(form.provider)?.models ?? []).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </F>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Temperature">
                <input type="number" min="0" max="2" step="0.05" value={form.temperature} onChange={e => set('temperature', e.target.value)} style={I} />
              </F>
              <F label="Max Tokens">
                <input type="number" value={form.max_tokens} onChange={e => set('max_tokens', e.target.value)} style={I} />
              </F>
            </div>

            {/* System Role with AI generator */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>System Role *</p>
                <button
                  onClick={aiGenerateRole}
                  disabled={generatingRole || (!form.display_name.trim() && !form.description.trim())}
                  title="AI generates system role from name, description & compliance"
                  style={{ padding: '3px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: generatingRole ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.15)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', opacity: (!form.display_name.trim() && !form.description.trim()) ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  {generatingRole
                    ? <><span style={{ display: 'inline-block', width: 9, height: 9, border: '1.5px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Generating…</>
                    : '✦ AI Generate'}
                </button>
              </div>
              {roleGenError && (
                <div style={{ padding: '6px 10px', borderRadius: 7, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#fca5a5', marginBottom: 6 }}>⚠ {roleGenError}</div>
              )}
              <textarea value={form.role} onChange={e => set('role', e.target.value)} rows={5} style={{ ...I, resize: 'vertical' }} />
            </div>

            <F label="Compliance Frameworks">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {COMPLIANCE_OPTIONS.map(f => {
                  const on = form.compliance_frameworks.includes(f)
                  return (
                    <button key={f} onClick={() => toggleFramework(f)} style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: on ? 'rgba(52,211,153,0.18)' : 'rgba(255,255,255,0.05)', color: on ? '#34d399' : 'rgba(255,255,255,0.35)', border: `1px solid ${on ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`, transition: 'all 0.15s' }}>
                      {f}
                    </button>
                  )
                })}
              </div>
            </F>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <F label="Data Classification">
                <select value={form.data_classification} onChange={e => set('data_classification', e.target.value)} style={I}>
                  {DATA_CLASSIFICATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </F>
              <F label="Daily Spend ($)">
                <input type="number" min="0" step="0.1" value={form.daily_spend_limit} onChange={e => set('daily_spend_limit', e.target.value)} style={I} />
              </F>
              <F label="Token Budget / Run">
                <input type="number" min="100" step="100" value={form.token_budget_per_execution} onChange={e => set('token_budget_per_execution', e.target.value)} style={I} />
              </F>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <F label="Use Cases" hint="comma-separated">
                <input value={form.use_cases} onChange={e => set('use_cases', e.target.value)} placeholder="code review, security audit" style={I} />
              </F>
              <F label="Tags" hint="comma-separated">
                <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="coding, security" style={I} />
              </F>
            </div>

            {/* Requirements mapping — AI helper */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Mapped Requirements ({form.requirements.length})
                </p>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={aiGenerateRequirements}
                    disabled={genReqs || (!form.description.trim() && !form.role.trim())}
                    title="AI generates requirements from description + role"
                    style={{ padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: genReqs ? 'rgba(167,139,250,0.08)' : 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', opacity: (!form.description.trim() && !form.role.trim()) ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 5 }}
                  >
                    {genReqs
                      ? <><span style={{ display: 'inline-block', width: 10, height: 10, border: '1.5px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Generating…</>
                      : '✦ AI Fill'}
                  </button>
                  <button
                    onClick={addBlankRequirement}
                    title="Add a custom requirement manually"
                    style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {genReqsError && <div style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#fca5a5', marginBottom: 8 }}>⚠ {genReqsError}</div>}

              {form.requirements.length === 0 && !genReqs && (
                <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(167,139,250,0.04)', border: '1px dashed rgba(167,139,250,0.2)', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>No requirements yet.</p>
                  <p style={{ fontSize: 10, color: 'rgba(167,139,250,0.5)', marginTop: 4 }}>Click <strong style={{ color: '#a78bfa' }}>✦ AI Fill</strong> to generate from description + role, or <strong style={{ color: 'rgba(255,255,255,0.4)' }}>+ Add</strong> to create manually.</p>
                </div>
              )}

              {form.requirements.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {form.requirements.map((req, i) => {
                    const conf = Math.round(req.confidence * 100)
                    const color = conf >= 80 ? '#34d399' : conf >= 60 ? '#fbbf24' : '#f87171'
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <span style={{ fontSize: 11, color, fontWeight: 800, flexShrink: 0 }}>{req.mapped ? '✓' : '○'}</span>
                        <input
                          value={req.id}
                          onChange={e => setForm(f => ({ ...f, requirements: f.requirements.map((r, j) => j === i ? { ...r, id: e.target.value } : r) }))}
                          style={{ width: 110, padding: '2px 6px', borderRadius: 5, fontSize: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.35)', fontFamily: 'JetBrains Mono, monospace', flexShrink: 0 }}
                        />
                        <input
                          value={req.title}
                          onChange={e => setForm(f => ({ ...f, requirements: f.requirements.map((r, j) => j === i ? { ...r, title: e.target.value } : r) }))}
                          placeholder="Requirement title"
                          style={{ flex: 1, padding: '2px 6px', borderRadius: 5, fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                          <input
                            type="range" min="0" max="100" value={conf}
                            onChange={e => setForm(f => ({ ...f, requirements: f.requirements.map((r, j) => j === i ? { ...r, confidence: parseInt(e.target.value) / 100 } : r) }))}
                            style={{ width: 48, accentColor: color, cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: 10, fontWeight: 700, color, fontFamily: 'JetBrains Mono, monospace', width: 28, textAlign: 'right' }}>{conf}%</span>
                        </div>
                        <button onClick={() => setForm(f => ({ ...f, requirements: f.requirements.filter((_, j) => j !== i) }))} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 13, padding: '0 2px', flexShrink: 0 }}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* HITL toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.2)' }}>
              <input type="checkbox" id="new-hitl" checked={form.hitl_enabled} onChange={e => set('hitl_enabled', e.target.checked)} style={{ accentColor: '#fb923c', width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="new-hitl" style={{ fontSize: 13, fontWeight: 600, color: '#fcd34d', cursor: 'pointer' }}>Enable Human-in-the-Loop (HITL) approval gate</label>
            </div>

            {saveError && <ErrBox msg={saveError} />}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button
            onClick={handleCreate}
            disabled={saving || !form.display_name.trim() || !form.description.trim()}
            style={{ flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', opacity: saving || !form.display_name.trim() || !form.description.trim() ? 0.5 : 1 }}
          >
            {saving ? 'Creating…' : 'Create Agent'}
          </button>
          <button onClick={onClose} style={{ padding: '12px 22px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.09)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── tiny helpers ── */
const I: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0', outline: 'none', fontFamily: 'inherit',
}

function F({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{label}</p>
        {hint && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function ErrBox({ msg }: { msg: string }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#fca5a5' }}>
      ⚠ {msg}
    </div>
  )
}
