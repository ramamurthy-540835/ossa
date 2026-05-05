'use client'

import { useState, useRef } from 'react'
import { getCompliance, ComplianceDetail } from '@/lib/providers.config'

interface TooltipPos {
  left: number
  top: number
  placement: 'below' | 'above'
}

interface Props {
  framework: string
  mode: 'toggle' | 'link'
  active?: boolean
  onToggle?: () => void
  compact?: boolean
  customDetail?: ComplianceDetail
}

const TOOLTIP_W = 340
const TOOLTIP_H = 260 // rough estimate for flip logic

export function ComplianceChip({ framework, mode, active = true, onToggle, compact = false, customDetail }: Props) {
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null)
  const ref = useRef<HTMLButtonElement>(null)
  const detail = customDetail ?? getCompliance(framework)

  const color = detail?.color ?? '#94a3b8'
  const bg    = detail?.bg    ?? 'rgba(148,163,184,0.1)'

  function showTooltip() {
    if (!ref.current || !detail) return
    const r = ref.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const placement: 'below' | 'above' = spaceBelow < TOOLTIP_H + 16 ? 'above' : 'below'

    // Centre the tooltip on the chip, clamp to viewport
    let left = r.left + r.width / 2 - TOOLTIP_W / 2
    left = Math.max(8, Math.min(left, window.innerWidth - TOOLTIP_W - 8))

    const top = placement === 'below' ? r.bottom + 8 : r.top - 8

    setTooltipPos({ left, top, placement })
  }

  function hideTooltip() {
    setTooltipPos(null)
  }

  function openDocs(e: React.MouseEvent) {
    e.stopPropagation()
    if (detail?.docsUrl) window.open(detail.docsUrl, '_blank', 'noopener,noreferrer')
  }

  const chipStyle: React.CSSProperties = compact
    ? {
        position: 'relative', display: 'inline-flex', alignItems: 'center',
        padding: '5px 12px', borderRadius: 8, cursor: 'default',
        background: active ? bg : 'rgba(255,255,255,0.04)',
        border: `1px solid ${active ? color + '50' : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 0.15s',
      }
    : {
        position: 'relative', display: 'inline-flex', alignItems: 'center',
        padding: '5px 14px', borderRadius: 999, cursor: 'pointer',
        background: active ? bg : 'rgba(255,255,255,0.05)',
        color: active ? color : 'rgba(255,255,255,0.35)',
        border: `1px solid ${active ? color + '55' : 'rgba(255,255,255,0.1)'}`,
        transition: 'all 0.15s',
        fontSize: 11, fontWeight: 700,
      }

  return (
    <>
      <button
        ref={ref}
        style={chipStyle}
        onClick={mode === 'toggle' ? onToggle : undefined}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {compact ? (
          <>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Compliance: </span>
            <span style={{ fontSize: 11, color: '#e2e8f0', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', marginLeft: 4 }}>{framework}</span>
          </>
        ) : (
          framework
        )}
      </button>

      {/* Portal-style fixed tooltip — renders outside any overflow container */}
      {tooltipPos && detail && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPos.left,
            ...(tooltipPos.placement === 'below'
              ? { top: tooltipPos.top }
              : { bottom: window.innerHeight - tooltipPos.top }),
            width: TOOLTIP_W,
            zIndex: 99999,
            borderRadius: 14,
            background: 'rgba(13,17,23,0.99)',
            border: `1px solid ${color}50`,
            boxShadow: `0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px ${color}20`,
            padding: '14px 16px',
            pointerEvents: 'auto',
          }}
          onMouseEnter={showTooltip}
          onMouseLeave={hideTooltip}
          onClick={e => e.stopPropagation()}
        >
          {/* Name badge */}
          <span style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 999,
            fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
            background: bg, color, border: `1px solid ${color}40`, marginBottom: 6,
          }}>
            {detail.name}
          </span>

          {/* Full name */}
          <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.4, marginBottom: 5 }}>
            {detail.fullName}
          </p>

          {/* Scope */}
          <p style={{ fontSize: 11, color, fontWeight: 600, marginBottom: 8, opacity: 0.85 }}>
            Scope: {detail.scope}
          </p>

          {/* Description */}
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginBottom: 10 }}>
            {detail.description}
          </p>

          {/* Key requirements */}
          <div style={{ marginBottom: 12 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.28)',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6,
            }}>
              Key Requirements
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {detail.keyRequirements.map((r, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.45 }}>
                  <span style={{ color, marginTop: 2, flexShrink: 0, fontWeight: 700 }}>›</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Docs button */}
          {detail.docsUrl && (
            <button
              onClick={openDocs}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 9,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: bg, color,
                border: `1px solid ${color}45`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = `${color}28` }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.background = bg }}
            >
              View Official Docs <span style={{ fontSize: 14 }}>↗</span>
            </button>
          )}
        </div>
      )}
    </>
  )
}
