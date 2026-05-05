'use client'

import { useEffect, useState, useCallback } from 'react'
import { OSSAManifest } from '@/lib/types/ossa'
import * as api from '@/lib/api/client'

const AGENT_META: Record<string, { icon: string; gradient: string; glow: string }> = {
  'document-summarizer':          { icon: '📄', gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)', glow: 'rgba(59,130,246,0.25)' },
  'code-analyzer':                { icon: '🔍', gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)', glow: 'rgba(139,92,246,0.25)' },
  'research-agent':               { icon: '🔬', gradient: 'linear-gradient(135deg,#10b981,#3b82f6)', glow: 'rgba(16,185,129,0.25)' },
  'code-developer':               { icon: '⌨️', gradient: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', glow: 'rgba(99,102,241,0.25)' },
  'aider-code-developer':         { icon: '⌨️', gradient: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', glow: 'rgba(99,102,241,0.25)' },
  'codex-completion':             { icon: '🧠', gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)', glow: 'rgba(124,58,237,0.25)' },
  'claude-deep-reasoner':         { icon: '🔮', gradient: 'linear-gradient(135deg,#a78bfa,#ec4899)', glow: 'rgba(167,139,250,0.25)' },
  'security-auditor':             { icon: '🛡️', gradient: 'linear-gradient(135deg,#ef4444,#f97316)', glow: 'rgba(239,68,68,0.25)' },
  'test-generator':               { icon: '🧪', gradient: 'linear-gradient(135deg,#10b981,#84cc16)', glow: 'rgba(16,185,129,0.25)' },
  'tech-doc-writer':              { icon: '📝', gradient: 'linear-gradient(135deg,#f59e0b,#f97316)', glow: 'rgba(245,158,11,0.25)' },
  'requirements-analyst':         { icon: '📋', gradient: 'linear-gradient(135deg,#06b6d4,#3b82f6)', glow: 'rgba(6,182,212,0.25)' },
  'adept-code-migrator':          { icon: '🔄', gradient: 'linear-gradient(135deg,#f97316,#ef4444)', glow: 'rgba(249,115,22,0.25)' },
  'adept-language-detective':     { icon: '🕵️', gradient: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', glow: 'rgba(139,92,246,0.25)' },
  'adept-code-fix-debug':         { icon: '🛠️', gradient: 'linear-gradient(135deg,#10b981,#3b82f6)', glow: 'rgba(16,185,129,0.25)' },
  'adept-data-eng-chat':          { icon: '💬', gradient: 'linear-gradient(135deg,#f59e0b,#10b981)', glow: 'rgba(245,158,11,0.25)' },
  'adept-multi-agent-orchestrator': { icon: '🎭', gradient: 'linear-gradient(135deg,#ec4899,#a78bfa)', glow: 'rgba(236,72,153,0.25)' },
}

function slugToTitle(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface Props {
  onSelect: (m: OSSAManifest) => void
  selectedName?: string
}

export function ManifestSelector({ onSelect, selectedName }: Props) {
  const [manifests, setManifests] = useState<OSSAManifest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api.fetchManifests()
      .then(data => setManifests(data ?? []))
      .catch(e => setError(e.message ?? 'Failed to load agents'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSelect(m: OSSAManifest) {
    try {
      const full = await api.fetchManifest(m.name)
      onSelect(full)
    } catch {
      onSelect(m)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1,2,3].map(i => (
          <div key={i} className="shimmer-anim" style={{ height: 80, borderRadius: 14 }} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: '#f87171', textAlign: 'center' }}>⚠ {error}</p>
        <button onClick={load} style={{ padding: '6px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
          Retry
        </button>
      </div>
    )
  }

  if (manifests.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>No agents yet. Click + New Agent to create one.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {manifests.map((m) => {
        const active = m.name === selectedName
        const meta = AGENT_META[m.name] ?? { icon: '🤖', gradient: 'linear-gradient(135deg,#475569,#334155)', glow: 'rgba(71,85,105,0.2)' }

        return (
          <button
            key={m.name}
            onClick={() => handleSelect(m)}
            style={{
              width: '100%', textAlign: 'left', padding: '14px',
              borderRadius: 14, cursor: 'pointer',
              background: active ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.07)'}`,
              transition: 'all 0.15s',
              boxShadow: active ? `0 0 20px ${meta.glow}` : 'none',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              {/* Icon */}
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: meta.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
                boxShadow: active ? `0 4px 16px ${meta.glow}` : 'none',
              }}>
                {meta.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: active ? '#c7d2fe' : '#e2e8f0', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {slugToTitle(m.name)}
                  </p>
                  {m.hitl_enabled && (
                    <span style={{ padding: '1px 7px', borderRadius: 999, fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.2)', flexShrink: 0 }}>
                      HITL
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {m.description}
                </p>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Badge label={m.provider} color="#60a5fa" bg="rgba(59,130,246,0.12)" />
                  {(m.compliance?.frameworks ?? []).slice(0,2).map(f => (
                    <Badge key={f} label={f} color="#34d399" bg="rgba(16,185,129,0.1)" />
                  ))}
                </div>
              </div>

              {active && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 8px #818cf8', flexShrink: 0, marginTop: 4 }} />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600, color, background: bg }}>
      {label}
    </span>
  )
}
