'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { OSSAManifest } from '@/lib/types/ossa'
import * as api from '@/lib/api/client'

// ── Agent visual metadata ─────────────────────────────────────────────────────

const AGENT_META: Record<string, { icon: string; gradient: string; glow: string }> = {
  'document-summarizer':            { icon: '📄', gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)', glow: 'rgba(59,130,246,0.3)' },
  'code-analyzer':                  { icon: '🔍', gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)', glow: 'rgba(139,92,246,0.3)' },
  'research-agent':                 { icon: '🔬', gradient: 'linear-gradient(135deg,#10b981,#3b82f6)', glow: 'rgba(16,185,129,0.3)' },
  'code-developer':                 { icon: '⌨️', gradient: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', glow: 'rgba(99,102,241,0.3)' },
  'aider-style-code-developer':     { icon: '⌨️', gradient: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', glow: 'rgba(99,102,241,0.3)' },
  'aider-code-developer':           { icon: '⌨️', gradient: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', glow: 'rgba(99,102,241,0.3)' },
  'codex-completion':               { icon: '🧠', gradient: 'linear-gradient(135deg,#7c3aed,#a78bfa)', glow: 'rgba(124,58,237,0.3)' },
  'claude-deep-reasoner':           { icon: '🔮', gradient: 'linear-gradient(135deg,#a78bfa,#ec4899)', glow: 'rgba(167,139,250,0.3)' },
  'security-auditor':               { icon: '🛡️', gradient: 'linear-gradient(135deg,#ef4444,#f97316)', glow: 'rgba(239,68,68,0.3)' },
  'test-generator':                 { icon: '🧪', gradient: 'linear-gradient(135deg,#10b981,#84cc16)', glow: 'rgba(16,185,129,0.3)' },
  'tech-doc-writer':                { icon: '📝', gradient: 'linear-gradient(135deg,#f59e0b,#f97316)', glow: 'rgba(245,158,11,0.3)' },
  'requirements-analyst':           { icon: '📋', gradient: 'linear-gradient(135deg,#06b6d4,#3b82f6)', glow: 'rgba(6,182,212,0.3)' },
  'adept-code-migrator':            { icon: '🔄', gradient: 'linear-gradient(135deg,#f97316,#ef4444)', glow: 'rgba(249,115,22,0.3)' },
  'adept-language-detective':       { icon: '🕵️', gradient: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', glow: 'rgba(139,92,246,0.3)' },
  'adept-code-fix-debug':           { icon: '🛠️', gradient: 'linear-gradient(135deg,#10b981,#3b82f6)', glow: 'rgba(16,185,129,0.3)' },
  'adept-data-eng-chat':            { icon: '💬', gradient: 'linear-gradient(135deg,#f59e0b,#10b981)', glow: 'rgba(245,158,11,0.3)' },
  'adept-multi-agent-orchestrator': { icon: '🎭', gradient: 'linear-gradient(135deg,#ec4899,#a78bfa)', glow: 'rgba(236,72,153,0.3)' },
}

const DEFAULT_META = { icon: '🤖', gradient: 'linear-gradient(135deg,#475569,#334155)', glow: 'rgba(71,85,105,0.2)' }

// ── Category detection ────────────────────────────────────────────────────────

const CATEGORIES = ['All', 'Code', 'Security', 'Docs', 'Research', 'Custom'] as const
type Category = typeof CATEGORIES[number]
type ViewMode = 'list' | 'grid' | 'grouped'

const CAT_COLORS: Record<Category, { color: string; bg: string; border: string }> = {
  All:      { color: '#a5b4fc', bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)' },
  Code:     { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.3)' },
  Security: { color: '#f87171', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.3)' },
  Docs:     { color: '#fbbf24', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.3)' },
  Research: { color: '#34d399', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.3)' },
  Custom:   { color: '#a78bfa', bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.3)' },
}

function getCategory(name: string): Category {
  const n = name.toLowerCase()
  if (n.includes('security') || n.includes('audit') || n.includes('vulner')) return 'Security'
  if (n.includes('code') || n.includes('develop') || n.includes('aider') || n.includes('debug') || n.includes('fix') || n.includes('migrat') || n.includes('codex')) return 'Code'
  if (n.includes('doc') || n.includes('summar') || n.includes('writer') || n.includes('report') || n.includes('requirement')) return 'Docs'
  if (n.includes('research') || n.includes('analys') || n.includes('data') || n.includes('detective') || n.includes('language')) return 'Research'
  return 'Custom'
}

function slugToTitle(slug: string) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onSelect: (m: OSSAManifest) => void
  selectedName?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ManifestSelector({ onSelect, selectedName }: Props) {
  const [manifests, setManifests] = useState<OSSAManifest[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState<Category>('All')
  const [view, setView]         = useState<ViewMode>('list')

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.fetchManifests()
      .then(data => setManifests(data ?? []))
      .catch(e => setError(e.message ?? 'Failed to load agents'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSelect(m: OSSAManifest) {
    try { onSelect(await api.fetchManifest(m.name)) } catch { onSelect(m) }
  }

  const filtered = useMemo(() => manifests.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
    const matchCat = category === 'All' || getCategory(m.name) === category
    return matchSearch && matchCat
  }), [manifests, search, category])

  const grouped = useMemo(() => {
    const g: Record<string, OSSAManifest[]> = {}
    filtered.forEach(m => {
      const cat = getCategory(m.name)
      if (!g[cat]) g[cat] = []
      g[cat].push(m)
    })
    return g
  }, [filtered])

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1,2,3].map(i => <div key={i} className="shimmer-anim" style={{ height: 84, borderRadius: 14 }} />)}
    </div>
  )

  if (error) return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <p style={{ fontSize: 11, color: '#f87171', textAlign: 'center' }}>⚠ {error}</p>
      <button onClick={load} style={{ padding: '6px 16px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>Retry</button>
    </div>
  )

  // ── Toolbar ───────────────────────────────────────────────────────────────
  const toolbar = (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }}>🔍</span>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agents…"
          style={{
            width: '100%', padding: '7px 10px 7px 30px',
            borderRadius: 9, fontSize: 12,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.09)',
            color: '#e2e8f0', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>✕</button>
        )}
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => {
          const active = cat === category
          const c = CAT_COLORS[cat]
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                cursor: 'pointer', border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.08)'}`,
                background: active ? c.bg : 'transparent',
                color: active ? c.color : 'rgba(255,255,255,0.3)',
                transition: 'all 0.15s',
              }}
            >{cat}</button>
          )
        })}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {(['list','grid','grouped'] as ViewMode[]).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            title={v.charAt(0).toUpperCase() + v.slice(1) + ' view'}
            style={{
              padding: '4px 10px', borderRadius: 7, fontSize: 10, fontWeight: 700,
              cursor: 'pointer', border: `1px solid ${view === v ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.08)'}`,
              background: view === v ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: view === v ? '#a5b4fc' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.15s',
            }}
          >
            {v === 'list' ? '☰ List' : v === 'grid' ? '⊞ Grid' : '⊟ Group'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>
          {filtered.length}/{manifests.length}
        </span>
      </div>
    </div>
  )

  if (manifests.length === 0) return (
    <div style={{ padding: '16px', textAlign: 'center' }}>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>No agents yet. Click + New Agent to create one.</p>
    </div>
  )

  // ── Grid view ─────────────────────────────────────────────────────────────
  const gridContent = (
    <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {filtered.length === 0
        ? <p style={{ gridColumn: '1/-1', fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 16 }}>No agents match</p>
        : filtered.map(m => <GridCard key={m.name} m={m} active={m.name === selectedName} onSelect={handleSelect} />)
      }
    </div>
  )

  // ── Grouped view ──────────────────────────────────────────────────────────
  const groupedContent = (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {Object.keys(grouped).length === 0
        ? <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 16 }}>No agents match</p>
        : Object.entries(grouped).map(([cat, items]) => {
            const c = CAT_COLORS[cat as Category] ?? CAT_COLORS.Custom
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: c.color }}>{cat}</span>
                  <div style={{ flex: 1, height: 1, background: `${c.color}22` }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{items.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {items.map(m => <ListCard key={m.name} m={m} active={m.name === selectedName} onSelect={handleSelect} compact />)}
                </div>
              </div>
            )
          })
      }
    </div>
  )

  // ── List view ─────────────────────────────────────────────────────────────
  const listContent = (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {filtered.length === 0
        ? <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: 16 }}>No agents match</p>
        : filtered.map(m => <ListCard key={m.name} m={m} active={m.name === selectedName} onSelect={handleSelect} />)
      }
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {toolbar}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {view === 'grid' ? gridContent : view === 'grouped' ? groupedContent : listContent}
      </div>
    </div>
  )
}

// ── List Card ─────────────────────────────────────────────────────────────────

function ListCard({ m, active, onSelect, compact }: { m: OSSAManifest; active: boolean; onSelect: (m: OSSAManifest) => void; compact?: boolean }) {
  const meta = AGENT_META[m.name] ?? DEFAULT_META
  const cat = getCategory(m.name)
  const catColor = CAT_COLORS[cat].color

  return (
    <div
      style={{
        borderRadius: 12,
        background: active ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: active ? `0 0 18px ${meta.glow}` : 'none',
        transition: 'all 0.15s',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.055)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
    >
      {/* Clickable main area */}
      <button
        onClick={() => onSelect(m)}
        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: compact ? '10px 12px' : '12px 14px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>

          {/* Icon */}
          <div style={{
            width: compact ? 32 : 36, height: compact ? 32 : 36, borderRadius: 10, flexShrink: 0,
            background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: compact ? 15 : 17,
            boxShadow: active ? `0 3px 12px ${meta.glow}` : 'none',
          }}>
            {meta.icon}
          </div>

          {/* Body */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: compact ? 2 : 3, flexWrap: 'nowrap' }}>
              <p style={{
                fontSize: compact ? 11 : 12, fontWeight: 700,
                color: active ? '#c7d2fe' : '#e2e8f0',
                letterSpacing: '-0.01em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                flex: 1, minWidth: 0,
              }}>
                {slugToTitle(m.name)}
              </p>
              {m.hitl_enabled && (
                <span style={{ padding: '1px 5px', borderRadius: 999, fontSize: 8, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.2)', flexShrink: 0 }}>HITL</span>
              )}
              {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 6px #818cf8', flexShrink: 0, display: 'inline-block' }} />}
            </div>

            {/* Description */}
            {!compact && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.45, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {m.description}
              </p>
            )}

            {/* Badges row */}
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge label={m.provider} color="#60a5fa" bg="rgba(59,130,246,0.12)" />
              {(m.compliance?.frameworks ?? []).slice(0, 2).map(f => (
                <Badge key={f} label={f} color="#34d399" bg="rgba(16,185,129,0.1)" />
              ))}
              <Badge label={cat} color={catColor} bg="transparent" />
            </div>
          </div>
        </div>
      </button>

      {/* YAML download — flush footer strip, never overlapping title */}
      <div style={{ padding: '5px 14px 7px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={e => { e.stopPropagation(); window.open(`/api/manifests/${m.name}/yaml`, '_blank') }}
          title="Download YAML manifest"
          style={{
            padding: '2px 8px', borderRadius: 5, fontSize: 9, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '0.05em',
            background: 'rgba(52,211,153,0.07)', color: '#34d399',
            border: '1px solid rgba(52,211,153,0.18)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.07)' }}
        >
          ↓ YAML
        </button>
      </div>
    </div>
  )
}

// ── Grid Card ─────────────────────────────────────────────────────────────────

function GridCard({ m, active, onSelect }: { m: OSSAManifest; active: boolean; onSelect: (m: OSSAManifest) => void }) {
  const meta = AGENT_META[m.name] ?? DEFAULT_META
  const cat = getCategory(m.name)
  const catColor = CAT_COLORS[cat].color

  return (
    <div
      style={{
        borderRadius: 12, overflow: 'hidden',
        background: active ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${active ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.07)'}`,
        boxShadow: active ? `0 0 18px ${meta.glow}` : 'none',
        transition: 'all 0.15s', display: 'flex', flexDirection: 'column',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.055)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
    >
      {/* Gradient banner */}
      <button onClick={() => onSelect(m)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
        <div style={{ height: 44, background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
          <span style={{ fontSize: 20 }}>{meta.icon}</span>
          {m.hitl_enabled && (
            <span style={{ padding: '1px 5px', borderRadius: 999, fontSize: 8, fontWeight: 800, background: 'rgba(0,0,0,0.3)', color: '#fcd34d' }}>HITL</span>
          )}
          {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px #fff' }} />}
        </div>

        <div style={{ padding: '8px 10px 6px' }}>
          <p style={{
            fontSize: 11, fontWeight: 700, color: active ? '#c7d2fe' : '#e2e8f0',
            marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {slugToTitle(m.name)}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4, marginBottom: 6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {m.description}
          </p>
          <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Badge label={m.provider} color="#60a5fa" bg="rgba(59,130,246,0.12)" />
            <Badge label={cat} color={catColor} bg="transparent" />
          </div>
        </div>
      </button>

      {/* YAML footer */}
      <div style={{ marginTop: 'auto', padding: '5px 10px 7px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={e => { e.stopPropagation(); window.open(`/api/manifests/${m.name}/yaml`, '_blank') }}
          title="Download YAML manifest"
          style={{
            padding: '2px 7px', borderRadius: 5, fontSize: 9, fontWeight: 700,
            cursor: 'pointer', background: 'rgba(52,211,153,0.07)', color: '#34d399',
            border: '1px solid rgba(52,211,153,0.18)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.2)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.07)' }}
        >
          ↓ YAML
        </button>
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ padding: '1px 6px', borderRadius: 999, fontSize: 9, fontWeight: 600, color, background: bg, border: `1px solid ${color}22`, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}
