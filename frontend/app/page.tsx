'use client'

import { useState, useCallback } from 'react'
import { OSSAManifest } from '@/lib/types/ossa'
import { ManifestSelector } from '@/components/ManifestSelector'
import { ExecutionPanel } from '@/components/ExecutionPanel'
import { AuditLogViewer } from '@/components/AuditLogViewer'
import { NewAgentModal } from '@/components/NewAgentModal'
import { GuidedTour } from '@/components/GuidedTour'
import { DocsViewer } from '@/components/DocsViewer'
import { useExecution } from '@/lib/hooks/useExecution'
import { useTheme } from '@/lib/hooks/useTheme'

export default function Home() {
  const [selectedManifest, setSelectedManifest] = useState<OSSAManifest | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showDocs, setShowDocs] = useState(false)
  const [preselectedTemplate, setPreselectedTemplate] = useState<string | undefined>(undefined)
  const [refreshKey, setRefreshKey] = useState(0)

  const execution = useExecution()
  const { theme, toggle: toggleTheme } = useTheme()

  const handleSelect = useCallback((manifest: OSSAManifest) => {
    setSelectedManifest(manifest)
    execution.reset()
  }, [execution])

  const cost = execution.costSummary?.cost?.estimated_usd ?? 0
  const tokens = execution.costSummary?.tokens?.total ?? 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative', zIndex: 1 }}>

      {/* ─── Top Nav ─── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: '56px', flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(7,9,16,0.85)', backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
          }}>O</div>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9', letterSpacing: '-0.02em' }}>OSSA</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}> · Agent Dashboard</span>
          </div>
          <div style={{
            padding: '2px 10px', borderRadius: 999,
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
            fontSize: 11, fontWeight: 600, color: '#818cf8', letterSpacing: '0.04em',
          }}>v0.5.x</div>
        </div>

        {/* Center stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <NavStat label="Model" value={selectedManifest?.model ?? 'No agent'} color="#60a5fa" />
          <Divider />
          <NavStat label="Cost" value={`$${cost.toFixed(6)}`} color="#34d399" mono />
          <Divider />
          <NavStat label="Tokens" value={tokens.toLocaleString()} color="#a78bfa" mono />
          {selectedManifest && (
            <>
              <Divider />
              <NavStat label="Agent" value={selectedManifest.name} color="#fb923c" />
            </>
          )}
        </div>

        {/* Status + Tour + Docs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setShowDocs(true)}
            title="Helper Docs — standards, VBC agents, K3s guide"
            style={{ height: 32, padding: '0 12px', borderRadius: 8, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s', letterSpacing: '0.03em' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.16)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(52,211,153,0.08)' }}
          >
            📚 Docs
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'ossa' ? 'Switch to Mastech skin' : 'Switch to OSSA skin'}
            style={{
              height: 32, padding: '0 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s',
              background: theme === 'mastech' ? 'rgba(45,184,124,0.12)' : 'rgba(99,102,241,0.1)',
              border: theme === 'mastech' ? '1px solid rgba(45,184,124,0.3)' : '1px solid rgba(99,102,241,0.25)',
              color: theme === 'mastech' ? '#2db87c' : '#a5b4fc',
            }}
          >
            <span style={{ fontSize: 13 }}>{theme === 'mastech' ? '◑' : '◐'}</span>
            {theme === 'mastech' ? 'Mastech' : 'OSSA'}
          </button>

          <button
            onClick={() => setShowTour(true)}
            title="Guided Tour — Aider / Codex / Claude agent styles"
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.22)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.1)' }}
          >
            ?
          </button>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '6px 14px', borderRadius: 999,
            background: execution.isLoading ? 'rgba(251,191,36,0.08)' : 'rgba(16,185,129,0.08)',
            border: `1px solid ${execution.isLoading ? 'rgba(251,191,36,0.2)' : 'rgba(16,185,129,0.2)'}`,
          }}>
            <span className={execution.isLoading ? 'blink' : ''} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: execution.isLoading ? '#fbbf24' : '#10b981',
              boxShadow: execution.isLoading ? '0 0 8px #fbbf24' : '0 0 8px #10b981',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: execution.isLoading ? '#fbbf24' : '#34d399' }}>
              {execution.isLoading ? 'Running' : 'Ready'}
            </span>
          </div>
        </div>
      </nav>

      {/* ─── Body ─── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{
          width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(13,17,23,0.8)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Agents</span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.25)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.22)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.12)' }}
            >
              + New Agent
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ManifestSelector key={refreshKey} onSelect={handleSelect} selectedName={selectedManifest?.name} />
          </div>

          {/* Governance badges */}
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>
              Governance Active
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: 'HIPAA', color: '#34d399', bg: 'rgba(16,185,129,0.1)' },
                { label: 'SOC2',  color: '#60a5fa', bg: 'rgba(59,130,246,0.1)' },
                { label: 'HITL',  color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
                { label: 'Audit', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
              ].map(({ label, color, bg }) => (
                <span key={label} style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 600,
                  color, background: bg, border: `1px solid ${color}22`,
                }}>{label}</span>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(7,9,16,0.5)' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
            <ExecutionPanel
              manifest={selectedManifest}
              execution={execution}
              onManifestUpdate={(updated) => {
                setSelectedManifest(updated as any)
                setRefreshKey(k => k + 1)
              }}
            />
          </div>
          {/* Audit strip */}
          <div style={{ height: 180, flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(13,17,23,0.9)' }}>
            <AuditLogViewer events={execution.events} manifest={selectedManifest} isLoading={execution.isLoading} />
          </div>
        </main>

        {/* Right panel */}
        <aside style={{
          width: 256, flexShrink: 0, overflowY: 'auto',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(13,17,23,0.8)',
        }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>Live Metrics</span>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            <MetricCard label="Estimated Cost" value={`$${cost.toFixed(6)}`} sub="per execution" accent="#10b981" icon="💰" />
            <MetricCard label="Total Tokens" value={tokens.toLocaleString()} sub={execution.costSummary ? `${execution.costSummary.tokens?.input ?? 0} in · ${execution.costSummary.tokens?.output ?? 0} out` : '—'} accent="#8b5cf6" icon="◎" />

            {/* Provider card */}
            <div style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Provider</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>G</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{selectedManifest?.provider ?? '—'}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1, fontFamily: 'JetBrains Mono, monospace' }}>{selectedManifest?.model ?? 'no agent selected'}</p>
                </div>
              </div>
            </div>

            {/* Compliance */}
            <div style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Compliance</p>
              {selectedManifest ? (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {selectedManifest.compliance.frameworks.map(f => (
                      <span key={f} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>{f}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{selectedManifest.compliance.classification}</span>
                  </div>
                </>
              ) : <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Select an agent</p>}
            </div>

            {/* Trust */}
            <div style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Trust</p>
              {selectedManifest ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: selectedManifest.trust_tier === 'org-verified' ? '#10b981' : '#f59e0b', flexShrink: 0, boxShadow: selectedManifest.trust_tier === 'org-verified' ? '0 0 8px #10b981' : '0 0 8px #f59e0b' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', textTransform: 'capitalize' }}>{selectedManifest.trust_tier.replace(/-/g, ' ')}</span>
                </div>
              ) : <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>—</p>}
            </div>

            {/* Budget */}
            {selectedManifest && (
              <div style={{ padding: '14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 10 }}>Daily Budget</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', marginBottom: 8 }}>${selectedManifest.cost?.daily}</p>
                <div style={{ width: '100%', height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 999,
                    background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)',
                    width: `${Math.min(100, (cost / (selectedManifest.cost?.daily ?? 1)) * 100)}%`,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                  {((cost / (selectedManifest.cost?.daily ?? 1)) * 100).toFixed(4)}% used
                </p>
              </div>
            )}

          </div>
        </aside>
      </div>

      {showDocs && <DocsViewer onClose={() => setShowDocs(false)} />}

      {showTour && (
        <GuidedTour
          onClose={() => setShowTour(false)}
          onUseTemplate={(templateId) => {
            setShowTour(false)
            setPreselectedTemplate(templateId)
            setShowCreateModal(true)
          }}
          onOpenRecommend={() => {
            setShowTour(false)
            setPreselectedTemplate(undefined)
            setShowCreateModal(true)
          }}
        />
      )}

      {showCreateModal && (
        <NewAgentModal
          onClose={() => { setShowCreateModal(false); setPreselectedTemplate(undefined) }}
          onCreated={() => setRefreshKey(k => k + 1)}
          initialTemplate={preselectedTemplate}
        />
      )}
    </div>
  )
}

function NavStat({ label, value, color, mono }: { label: string; value: string; color: string; mono?: boolean }) {
  return (
    <div style={{ padding: '4px 14px', textAlign: 'center' }}>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 700, color, fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit' }}>{value}</p>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.06)' }} />
}

function MetricCard({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent: string; icon: string }) {
  return (
    <div style={{
      padding: '14px', borderRadius: 14,
      background: `${accent}0d`,
      border: `1px solid ${accent}22`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)' }}>{label}</p>
        <span style={{ fontSize: 14 }}>{icon}</span>
      </div>
      <p style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: accent, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{sub}</p>
    </div>
  )
}
