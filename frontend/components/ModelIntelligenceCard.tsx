'use client'

import { useState, useEffect, useCallback } from 'react'
import { OSSAManifest } from '@/lib/types/ossa'

const API = '/api'

interface ModelMeta {
  provider: string
  label: string
  cost_in: number
  cost_out: number
  context: number
  speed: string
  reasoning: number
  coding: number
  badge: string
  best_for: string[]
}

interface TaskAnalysis {
  task_type: string
  complexity: string
  estimated_output_tokens: number
  recommended_model: string
  recommendation_reason: string
  recommended_model_meta: ModelMeta
  alternatives: Array<{ model: string; tradeoff: string }>
}

interface MultiResult {
  task_type: string
  complexity: string
  plan: string
  output: string
  review_notes: string
  models_used: Array<{ stage: string; model: string; label?: string; tokens?: any; cost: number }>
  total_cost: number
}

interface Props {
  manifest: OSSAManifest | null
  input: string
  onUseOutput: (output: string) => void
}

const SPEED_STARS: Record<string, string> = {
  fastest: '⚡⚡⚡', fast: '⚡⚡', medium: '⚡', slow: '◎',
}

const PROVIDER_COLOR: Record<string, string> = {
  gemini: '#4285f4', anthropic: '#d97706', openai: '#10b981',
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < n ? '#fbbf24' : 'rgba(255,255,255,0.1)', fontSize: 9 }}>★</span>
      ))}
    </span>
  )
}


export function ModelIntelligenceCard({ manifest, input, onUseOutput }: Props) {
  const [models, setModels]           = useState<Record<string, ModelMeta>>({})
  const [analysis, setAnalysis]       = useState<TaskAnalysis | null>(null)
  const [analysing, setAnalysing]     = useState(false)
  const [multiResult, setMultiResult] = useState<MultiResult | null>(null)
  const [running, setRunning]         = useState(false)
  const [runError, setRunError]       = useState('')
  const [expanded, setExpanded]       = useState(false)
  const [activeTab, setActiveTab]     = useState<'compare' | 'multi'>('compare')

  useEffect(() => {
    fetch(`${API}/models`).then(r => r.json()).then(d => setModels(d.models ?? {})).catch(() => {})
  }, [])

  // Reset on manifest/input change
  useEffect(() => { setAnalysis(null); setMultiResult(null); setRunError('') }, [manifest, input])

  const analyseTask = useCallback(async () => {
    if (!input.trim()) return
    setAnalysing(true)
    try {
      const res = await fetch(`${API}/analyze-task`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      const data = await res.json()
      setAnalysis(data)
      setExpanded(true)
    } catch { /* silent */ } finally { setAnalysing(false) }
  }, [input])

  const runMultiModel = useCallback(async () => {
    if (!manifest || !input.trim()) return
    setRunning(true); setRunError(''); setMultiResult(null)
    try {
      const res = await fetch(`${API}/agent/execute-multi`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest_name: manifest.name, input }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
      const data = await res.json()
      setMultiResult(data)
      setActiveTab('multi')
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Error')
    } finally { setRunning(false) }
  }, [manifest, input])

  const modelList = Object.entries(models)
  const currentModel = manifest?.model ?? ''
  const currentMeta = models[currentModel]

  return (
    <div style={{ borderRadius: 14, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', overflow: 'hidden' }}>

      {/* Header */}
      <button
        onClick={() => setExpanded(x => !x)}
        style={{ width: '100%', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
            🧠 Model Intelligence
          </span>
          {currentMeta && (
            <span style={{ padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: `${PROVIDER_COLOR[currentMeta.provider] ?? '#6366f1'}18`, color: PROVIDER_COLOR[currentMeta.provider] ?? '#a5b4fc', border: `1px solid ${PROVIDER_COLOR[currentMeta.provider] ?? '#6366f1'}30` }}>
              {currentMeta.badge} {currentMeta.label}
            </span>
          )}
          {analysis && (
            <span style={{ padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
              {analysis.task_type.replace('_', ' ')} · {analysis.complexity}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); analyseTask() }}
            disabled={analysing || !input.trim()}
            style={{ padding: '3px 11px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: analysing ? 'rgba(167,139,250,0.06)' : 'rgba(167,139,250,0.14)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)', display: 'flex', alignItems: 'center', gap: 5, opacity: !input.trim() ? 0.4 : 1 }}
          >
            {analysing
              ? <><span style={{ display: 'inline-block', width: 8, height: 8, border: '1.5px solid rgba(167,139,250,0.3)', borderTopColor: '#a78bfa', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Analysing…</>
              : '✦ Analyse Task'}
          </button>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {([['compare', '⊞ Compare Models'], ['multi', '⚡ Multi-Model Run']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)}
                style={{ padding: '7px 16px', fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === id ? '#a78bfa' : 'transparent'}`, color: activeTab === id ? '#a78bfa' : 'rgba(255,255,255,0.3)', transition: 'all 0.15s' }}>
                {label}
              </button>
            ))}
          </div>

          {/* ── Compare Models tab ── */}
          {activeTab === 'compare' && (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* AI recommendation banner */}
              {analysis && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>✦</span>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#c4b5fd', marginBottom: 3 }}>
                      Recommended: {models[analysis.recommended_model]?.label ?? analysis.recommended_model}
                    </p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>{analysis.recommendation_reason}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                      Est. output: ~{analysis.estimated_output_tokens.toLocaleString()} tokens ·
                      Cost: ~${((analysis.estimated_output_tokens / 1000) * (models[analysis.recommended_model]?.cost_out ?? 0.0006)).toFixed(5)}
                    </p>
                  </div>
                </div>
              )}

              {/* Model comparison table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px 60px', gap: 8, padding: '4px 10px', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  <span>Model</span><span>In / 1K</span><span>Out / 1K</span><span>Reason</span><span>Code</span>
                </div>
                {modelList.map(([id, m]) => {
                  const isCurrent  = id === currentModel
                  const isRec      = id === analysis?.recommended_model
                  const provColor  = PROVIDER_COLOR[m.provider] ?? '#6366f1'
                  return (
                    <div key={id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 60px 60px', gap: 8, padding: '7px 10px', borderRadius: 9, alignItems: 'center', background: isCurrent ? 'rgba(99,102,241,0.1)' : isRec ? 'rgba(167,139,250,0.07)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isCurrent ? 'rgba(99,102,241,0.3)' : isRec ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.05)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 11, color: provColor, flexShrink: 0 }}>{m.badge}</span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#a5b4fc' : '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>
                            {isCurrent && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontWeight: 700, flexShrink: 0 }}>CURRENT</span>}
                            {isRec && !isCurrent && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 4, background: 'rgba(167,139,250,0.2)', color: '#c4b5fd', fontWeight: 700, flexShrink: 0 }}>RECOMMENDED</span>}
                          </div>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{SPEED_STARS[m.speed] ?? '⚡'} {m.context >= 1_000_000 ? `${m.context / 1_000_000}M ctx` : `${m.context / 1000}K ctx`}</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 10, color: '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>${(m.cost_in * 1000).toFixed(3)}</span>
                      <span style={{ fontSize: 10, color: '#fb923c', fontFamily: 'JetBrains Mono, monospace' }}>${(m.cost_out * 1000).toFixed(3)}</span>
                      <Stars n={m.reasoning} />
                      <Stars n={m.coding} />
                    </div>
                  )
                })}
              </div>

              {/* Alternatives from analysis */}
              {(analysis?.alternatives?.length ?? 0) > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 8 }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Alternatives for this task</p>
                  {analysis!.alternatives.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.02)', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 700, flexShrink: 0 }}>{models[a.model]?.badge ?? '◎'} {models[a.model]?.label ?? a.model}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>— {a.tradeoff}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Multi-Model Run tab ── */}
          {activeTab === 'multi' && (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                <span style={{ color: '#60a5fa', fontWeight: 700 }}>LangGraph pipeline: </span>
                Analyse (flash) → Plan (flash) → Execute (best model) → Review (flash) → Synthesize
              </div>

              {/* Stage visualisation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
                {(['Analyse', 'Plan', 'Execute', 'Review', 'Synthesize'] as const).map((s, i) => {
                  const stageEvent = multiResult?.models_used?.find(m => m.stage === s.toLowerCase())
                  const done = !!stageEvent || !!multiResult
                  const isExec = s === 'Execute'
                  const color = done ? '#34d399' : running ? '#60a5fa' : 'rgba(255,255,255,0.15)'
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ padding: '5px 10px', borderRadius: 8, background: done ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${color}30`, textAlign: 'center' }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color, whiteSpace: 'nowrap' }}>{done ? '✓' : s}</p>
                        <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                          {isExec ? (models[multiResult?.models_used?.find(m => m.stage === 'execute')?.model ?? '']?.label ?? 'best model') : 'flash'}
                        </p>
                      </div>
                      {i < 4 && <div style={{ width: 16, height: 1, background: done ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.07)', flexShrink: 0 }} />}
                    </div>
                  )
                })}
              </div>

              <button
                onClick={runMultiModel}
                disabled={running || !input.trim() || !manifest}
                style={{ padding: '10px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: running ? 'rgba(99,102,241,0.1)' : 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', border: 'none', opacity: (!input.trim() || !manifest) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {running
                  ? <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Running LangGraph pipeline…</>
                  : '⚡ Run Multi-Model Pipeline'}
              </button>

              {runError && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#fca5a5' }}>⚠ {runError}</div>
              )}

              {/* Results */}
              {multiResult && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                  {/* Models used summary */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {multiResult.models_used.map((m, i) => (
                      <div key={i} style={{ padding: '3px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 10 }}>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>{m.stage}: </span>
                        <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{models[m.model]?.label ?? m.model}</span>
                        {m.cost > 0 && <span style={{ color: '#34d399', marginLeft: 5, fontFamily: 'JetBrains Mono, monospace' }}>${m.cost.toFixed(5)}</span>}
                      </div>
                    ))}
                    <div style={{ padding: '3px 10px', borderRadius: 7, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', fontSize: 10, fontWeight: 700, color: '#34d399' }}>
                      Total: ${multiResult.total_cost.toFixed(5)}
                    </div>
                  </div>

                  {/* Plan */}
                  {multiResult.plan && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Execution Plan (by flash)</p>
                      <pre style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{multiResult.plan}</pre>
                    </div>
                  )}

                  {/* Output preview */}
                  {multiResult.output && (
                    <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <p style={{ fontSize: 9, fontWeight: 700, color: '#34d399', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Output</p>
                        <button
                          onClick={() => onUseOutput(multiResult.output)}
                          style={{ padding: '3px 10px', borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: 'pointer', background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                          Use this output ↑
                        </button>
                      </div>
                      <pre style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, maxHeight: 240, overflow: 'auto' }}>{multiResult.output}</pre>
                    </div>
                  )}

                  {/* Review notes */}
                  {multiResult.review_notes && (
                    <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)' }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 5 }}>Quality Review (by flash)</p>
                      <pre style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{multiResult.review_notes}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
