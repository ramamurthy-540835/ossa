'use client'

import { useState, useEffect } from 'react'

export interface BudgetSettings {
  total_credits: number
  credits_used: number
  daily_limit: number
  daily_used: number
  alert_threshold: number
}

export interface MultiModelSettings {
  analyze_model: string
  plan_model: string
  execute_model: string  // "auto" or specific model id
  review_model: string
}

export interface OSSASettings {
  budget: BudgetSettings
  multi_model: MultiModelSettings
}

interface ModelMeta {
  label: string
  badge: string
  provider: string
  cost_in: number
  cost_out: number
}

interface Props {
  onClose: () => void
  onSettingsChange: (s: OSSASettings) => void
}

const API = '/api'

const STAGE_LABELS: Record<string, string> = {
  analyze:  'Analyse Stage',
  plan:     'Plan Stage',
  execute:  'Execute Stage',
  review:   'Review Stage',
}

const STAGE_DESCS: Record<string, string> = {
  analyze:  'Classifies the task type and estimates complexity — cheapest model recommended',
  plan:     'Generates a step-by-step plan for the executor — fast model recommended',
  execute:  '"auto" lets the AI pick the best model based on task type',
  review:   'Quality-checks the output — fast model recommended',
}

const ADD_AMOUNTS = [5, 10, 25, 50]

const EI: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#e2e8f0', outline: 'none', fontFamily: 'inherit',
}

export function SettingsModal({ onClose, onSettingsChange }: Props) {
  const [tab, setTab] = useState<'budget' | 'pipeline'>('budget')
  const [settings, setSettings] = useState<OSSASettings | null>(null)
  const [models, setModels] = useState<Record<string, ModelMeta>>({})
  const [saving, setSaving] = useState(false)
  const [addingCredits, setAddingCredits] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/settings`).then(r => r.json()),
      fetch(`${API}/models`).then(r => r.json()),
    ]).then(([s, m]) => {
      setSettings(s)
      setModels(m.models ?? {})
    }).catch(() => {})
  }, [])

  async function save() {
    if (!settings) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      const updated = await res.json()
      setSettings(updated)
      onSettingsChange(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch { /* silent */ } finally { setSaving(false) }
  }

  async function addCredits(amount: number) {
    setAddingCredits(true)
    try {
      const res = await fetch(`${API}/settings/add-credits`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const budget = await res.json()
      setSettings(s => s ? { ...s, budget } : s)
      onSettingsChange({ ...settings!, budget })
    } catch { /* silent */ } finally { setAddingCredits(false) }
  }

  function setBudget(key: keyof BudgetSettings, val: number) {
    setSettings(s => s ? { ...s, budget: { ...s.budget, [key]: val } } : s)
  }

  function setStageModel(stage: keyof MultiModelSettings, model: string) {
    setSettings(s => s ? { ...s, multi_model: { ...s.multi_model, [stage]: model } } : s)
  }

  const b = settings?.budget
  const used = b?.credits_used ?? 0
  const total = b?.total_credits ?? 10
  const remaining = Math.max(0, total - used)
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0
  const dailyPct = (b?.daily_limit ?? 1) > 0
    ? Math.min(100, ((b?.daily_used ?? 0) / (b?.daily_limit ?? 1)) * 100)
    : 0
  const alertPct = (b?.alert_threshold ?? 0.8) * 100

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 560, borderRadius: 20, background: 'rgba(13,17,23,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflowY: 'auto', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>⚙ OSSA Settings</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Budget credits · Multi-model pipeline configuration</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 24px' }}>
          {([['budget', '💰 Budget & Credits'], ['pipeline', '⚡ Multi-Model Pipeline']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${tab === id ? '#a78bfa' : 'transparent'}`, color: tab === id ? '#a78bfa' : 'rgba(255,255,255,0.3)', transition: 'all 0.15s', marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Budget tab ── */}
          {tab === 'budget' && settings && (
            <>
              {/* Balance card */}
              <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Remaining Credits</p>
                    <p style={{ fontSize: 28, fontWeight: 800, color: remaining < total * 0.2 ? '#f87171' : '#34d399', letterSpacing: '-0.03em', fontFamily: 'JetBrains Mono, monospace' }}>
                      ${remaining.toFixed(4)}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                      ${used.toFixed(6)} used of ${total.toFixed(2)} total
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Today</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }}>${(b?.daily_used ?? 0).toFixed(6)}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>of ${(b?.daily_limit ?? 1).toFixed(2)} daily limit</p>
                  </div>
                </div>
                {/* Total usage bar */}
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: pct > alertPct ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : 'linear-gradient(90deg,#3b82f6,#34d399)', transition: 'width 0.4s' }} />
                  {/* Alert threshold marker */}
                  <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${alertPct}%`, width: 1, background: 'rgba(251,146,60,0.6)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{pct.toFixed(1)}% used</span>
                  <span style={{ fontSize: 9, color: 'rgba(251,146,60,0.6)' }}>▲ alert at {alertPct}%</span>
                </div>
              </div>

              {/* Daily bar */}
              <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>Daily usage</span>
                  <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: dailyPct > 80 ? '#f87171' : '#fbbf24' }}>
                    ${(b?.daily_used ?? 0).toFixed(6)} / ${(b?.daily_limit ?? 1).toFixed(2)}
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 999, width: `${dailyPct}%`, background: dailyPct > 80 ? '#ef4444' : '#fbbf24', transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* Add credits */}
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Top Up Credits</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {ADD_AMOUNTS.map(a => (
                    <button
                      key={a}
                      onClick={() => addCredits(a)}
                      disabled={addingCredits}
                      style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'rgba(52,211,153,0.08)', color: '#34d399', border: '1px solid rgba(52,211,153,0.25)', transition: 'all 0.15s', opacity: addingCredits ? 0.5 : 1 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.18)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.08)' }}
                    >
                      +${a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Total Credits ($)</p>
                  <input
                    type="number" min="0" step="1" value={b?.total_credits ?? 10}
                    onChange={e => setBudget('total_credits', parseFloat(e.target.value) || 0)}
                    style={EI}
                  />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Daily Limit ($)</p>
                  <input
                    type="number" min="0" step="0.5" value={b?.daily_limit ?? 1}
                    onChange={e => setBudget('daily_limit', parseFloat(e.target.value) || 0)}
                    style={EI}
                  />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>Alert Threshold (%)</p>
                  <input
                    type="number" min="0" max="100" step="5" value={Math.round((b?.alert_threshold ?? 0.8) * 100)}
                    onChange={e => setBudget('alert_threshold', (parseInt(e.target.value) || 80) / 100)}
                    style={EI}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button
                    onClick={() => setBudget('credits_used', 0)}
                    style={{ width: '100%', padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.2)', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.15)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)' }}
                  >
                    Reset Usage Counter
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Multi-Model Pipeline tab ── */}
          {tab === 'pipeline' && settings && (
            <>
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Configure which model handles each stage of the multi-model LangGraph pipeline. Changes apply to all future multi-model runs.
                </p>
              </div>

              {/* Pipeline stage pickers */}
              {Object.keys(STAGE_LABELS).map(stage => {
                const keyMap: Record<string, keyof MultiModelSettings> = {
                  analyze: 'analyze_model', plan: 'plan_model', execute: 'execute_model', review: 'review_model'
                }
                const settingKey = keyMap[stage]
                const current = settings.multi_model[settingKey]
                const isExecute = stage === 'execute'
                return (
                  <div key={stage} style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 }}>{STAGE_LABELS[stage]}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>{STAGE_DESCS[stage]}</p>
                      </div>
                      {/* Current model badge */}
                      {current !== 'auto' && models[current] && (
                        <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', flexShrink: 0 }}>
                          {models[current].badge} {models[current].label}
                        </span>
                      )}
                      {current === 'auto' && (
                        <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)', flexShrink: 0 }}>✦ auto</span>
                      )}
                    </div>
                    <select
                      value={current}
                      onChange={e => setStageModel(settingKey, e.target.value)}
                      style={{ ...EI, fontSize: 12 }}
                    >
                      {isExecute && <option value="auto">✦ auto — AI picks best model for task type</option>}
                      {Object.entries(models).map(([id, m]) => (
                        <option key={id} value={id}>
                          {m.badge} {m.label} · ${(m.cost_in * 1000).toFixed(3)}/1M in · ${(m.cost_out * 1000).toFixed(3)}/1M out
                        </option>
                      ))}
                    </select>
                  </div>
                )
              })}

              {/* Pipeline diagram */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', overflowX: 'auto' }}>
                {(['analyze', 'plan', 'execute', 'review', 'synthesize'] as const).map((s, i) => {
                  const keyMap: Record<string, string> = { analyze: 'analyze_model', plan: 'plan_model', execute: 'execute_model', review: 'review_model', synthesize: '' }
                  const modelId = keyMap[s] ? settings.multi_model[keyMap[s] as keyof MultiModelSettings] : '—'
                  const label = modelId === 'auto' ? 'auto' : (models[modelId]?.label?.split(' ').slice(0, 2).join(' ') ?? modelId)
                  const color = s === 'execute' ? '#a78bfa' : '#60a5fa'
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ textAlign: 'center', minWidth: 70 }}>
                        <div style={{ padding: '4px 8px', borderRadius: 7, fontSize: 9, fontWeight: 700, background: `${color}15`, border: `1px solid ${color}30`, color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{s}</div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', lineHeight: 1.3 }}>{label}</div>
                      </div>
                      {i < 4 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, flexShrink: 0 }}>→</span>}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button
              onClick={save}
              disabled={saving}
              style={{ flex: 1, padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: saved ? 'rgba(52,211,153,0.2)' : 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: saved ? '#34d399' : '#fff', border: saved ? '1px solid rgba(52,211,153,0.4)' : 'none', opacity: saving ? 0.6 : 1, transition: 'all 0.2s' }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Settings'}
            </button>
            <button onClick={onClose} style={{ padding: '12px 20px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.09)' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
