'use client'

import { ExecutionEvent, OSSAManifest } from '@/lib/types/ossa'

interface Props {
  events: ExecutionEvent[]
  manifest: OSSAManifest | null
  isLoading: boolean
}

type StageStatus = 'idle' | 'active' | 'done' | 'error' | 'waiting' | 'skipped'

interface Stage {
  id: string
  label: string
  sub: string
  icon: string
  status: StageStatus
  detail?: string
}

const STATUS_STYLE: Record<StageStatus, { color: string; bg: string; border: string }> = {
  idle:    { color: 'rgba(255,255,255,0.2)',  bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)' },
  active:  { color: '#60a5fa',               bg: 'rgba(59,130,246,0.1)',   border: 'rgba(59,130,246,0.35)' },
  done:    { color: '#34d399',               bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.3)' },
  error:   { color: '#f87171',               bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.35)' },
  waiting: { color: '#fb923c',               bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.4)' },
  skipped: { color: 'rgba(255,255,255,0.1)', bg: 'transparent',            border: 'rgba(255,255,255,0.04)' },
}

const ICON_DONE    = '✓'
const ICON_ERROR   = '✕'
const ICON_WAITING = '⏳'

function deriveStages(events: ExecutionEvent[], manifest: OSSAManifest | null): Stage[] {
  const has = (t: string) => events.some(e => e.type === t)
  const hitlEnabled = manifest?.hitl_enabled ?? false

  let validate: StageStatus  = 'idle'
  let budget: StageStatus    = 'idle'
  let hitl: StageStatus      = hitlEnabled ? 'idle' : 'skipped'
  let invoke: StageStatus    = 'idle'
  let auditLog: StageStatus  = 'idle'
  let complete: StageStatus  = 'idle'

  // Backend doesn't emit execution_started — any event means execution is underway
  if (events.length > 0) {
    validate = 'done'
    budget   = 'done'
    if (hitlEnabled && !has('hitl_approved') && !has('execution_complete')) {
      hitl = has('hitl_required') ? 'waiting' : 'active'
    } else if (!hitlEnabled) {
      invoke   = 'active'
      auditLog = 'active'
    }
  }
  if (has('hitl_approved')) {
    hitl     = 'done'
    invoke   = 'active'
    auditLog = 'active'
  }
  if (has('execution_complete')) {
    invoke   = 'done'
    auditLog = 'done'
    complete = 'done'
    hitl     = hitlEnabled ? 'done' : 'skipped'
  }
  if (has('error')) {
    if (invoke === 'active')  invoke = 'error'
    complete = 'error'
  }

  const costEvent = events.find(e => e.type === 'cost_update')
  const costDetail = costEvent?.data?.tokens?.total
    ? `${costEvent.data.tokens.total}t · $${costEvent.data.cost?.estimated_usd?.toFixed(5)}`
    : undefined

  const stages: Stage[] = [
    { id: 'validate', label: 'Validate',  sub: 'Manifest',    icon: '⚙',  status: validate },
    { id: 'budget',   label: 'Budget',    sub: 'Governance',  icon: '💰', status: budget },
    ...(hitlEnabled
      ? [{ id: 'hitl', label: 'HITL', sub: 'Approval Gate', icon: '🔐', status: hitl,
           detail: hitl === 'done' ? 'Approved' : hitl === 'waiting' ? 'Awaiting supervisor' : undefined }]
      : []),
    { id: 'invoke',   label: 'LLM',       sub: 'Invoke',      icon: '⚡', status: invoke,   detail: costDetail },
    { id: 'audit',    label: 'Audit',     sub: 'Capture',     icon: '📋', status: auditLog },
    { id: 'complete', label: 'Complete',  sub: '',            icon: '◎',  status: complete },
  ]
  return stages
}

export function AuditLogViewer({ events, manifest, isLoading }: Props) {
  const stages = deriveStages(events, manifest)
  const visible = events.filter(e => e.type !== 'response_chunk')
  const hasActivity = visible.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>OSSA Pipeline</span>
          {hasActivity && (
            <span style={{ padding: '1px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>
              {visible.length} events
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="blink" style={{ width: 5, height: 5, borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
              <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>Executing…</span>
            </div>
          )}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.12)', letterSpacing: '0.05em' }}>OSSA Compliance Log · Real-time</span>
        </div>
      </div>

      {/* Pipeline stages */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 0, overflowX: 'auto' }}>
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1
          const s = STATUS_STYLE[stage.status]
          const isActive = stage.status === 'active'
          const displayIcon = stage.status === 'done' ? ICON_DONE
            : stage.status === 'error' ? ICON_ERROR
            : stage.status === 'waiting' ? ICON_WAITING
            : stage.status === 'skipped' ? '—'
            : stage.icon

          return (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {/* Stage box */}
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                padding: '8px 14px', borderRadius: 12,
                background: s.bg, border: `1px solid ${s.border}`,
                minWidth: 80, transition: 'all 0.3s ease',
                boxShadow: isActive ? `0 0 16px ${s.color}20` : 'none',
                opacity: stage.status === 'skipped' ? 0.35 : 1,
              }}>
                {/* Icon circle */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `${s.color}15`, border: `1.5px solid ${s.color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 800, color: s.color,
                  boxShadow: isActive ? `0 0 10px ${s.color}40` : 'none',
                  flexShrink: 0,
                }}>
                  <span className={isActive ? 'blink' : ''} style={{ animationDuration: '1s' }}>
                    {displayIcon}
                  </span>
                </div>

                {/* Label */}
                <p style={{ fontSize: 10, fontWeight: 700, color: s.color, textAlign: 'center', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                  {stage.label}
                </p>
                {stage.sub && (
                  <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {stage.sub}
                  </p>
                )}
                {stage.detail && (
                  <p style={{ fontSize: 9, color: s.color, textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap', opacity: 0.8 }}>
                    {stage.detail}
                  </p>
                )}
              </div>

              {/* Connector arrow */}
              {!isLast && (
                <div style={{ display: 'flex', alignItems: 'center', width: 28, flexShrink: 0 }}>
                  <div style={{
                    flex: 1, height: 1,
                    background: stage.status === 'done' || stage.status === 'skipped'
                      ? 'rgba(52,211,153,0.35)'
                      : 'rgba(255,255,255,0.07)',
                    transition: 'background 0.3s',
                  }} />
                  <span style={{ fontSize: 8, color: stage.status === 'done' ? '#34d399' : 'rgba(255,255,255,0.12)', marginLeft: 2 }}>▶</span>
                </div>
              )}
            </div>
          )
        })}

        {/* Event log — compact chips after pipeline */}
        {visible.length > 0 && (
          <div style={{ marginLeft: 24, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, borderLeft: '1px solid rgba(255,255,255,0.06)', paddingLeft: 24 }}>
            {visible.map((e, i) => {
              const meta: Record<string, { c: string; lbl: string }> = {
                execution_started:  { c: '#3b82f6', lbl: 'started' },
                execution_status:   { c: '#8b5cf6', lbl: 'running' },
                hitl_required:      { c: '#f59e0b', lbl: 'hitl' },
                hitl_approved:      { c: '#10b981', lbl: 'approved' },
                cost_update:        { c: '#fbbf24', lbl: `$${e.data?.cost?.estimated_usd?.toFixed(5) ?? '—'}` },
                execution_complete: { c: '#10b981', lbl: 'done' },
                error:              { c: '#f43f5e', lbl: 'error' },
              }
              const m = meta[e.type] ?? { c: '#475569', lbl: e.type }
              return (
                <span key={i} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: `${m.c}18`, color: m.c, border: `1px solid ${m.c}30`, whiteSpace: 'nowrap' }}>
                  {m.lbl}
                </span>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {!hasActivity && (
          <div style={{ margin: 'auto', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.12)' }}>
              Run an agent to see the OSSA execution pipeline
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
