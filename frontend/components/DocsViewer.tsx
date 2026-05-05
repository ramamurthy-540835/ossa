'use client'

import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/* ── Mermaid diagram renderer ── */
function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [err, setErr] = useState('')
  const id = useRef(`mmd-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    let cancelled = false
    async function render() {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            background: '#0d1117',
            primaryColor: '#1e2433',
            primaryTextColor: '#e2e8f0',
            primaryBorderColor: '#334155',
            lineColor: '#475569',
            secondaryColor: '#1e293b',
            tertiaryColor: '#0f172a',
            edgeLabelBackground: '#1e293b',
            fontSize: '13px',
          },
          flowchart: { curve: 'basis', padding: 20 },
          sequence: { useMaxWidth: false },
        })
        const { svg: rendered } = await mermaid.render(id.current, code)
        if (!cancelled) setSvg(rendered)
      } catch (e) {
        if (!cancelled) setErr(String(e))
      }
    }
    render()
    return () => { cancelled = true }
  }, [code])

  if (err) return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 11, color: '#fca5a5', fontFamily: 'JetBrains Mono, monospace' }}>
      Mermaid render error: {err}
    </div>
  )
  if (!svg) return (
    <div style={{ padding: '16px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Rendering diagram…</div>
  )
  return (
    <div
      ref={ref}
      style={{ padding: '16px', borderRadius: 14, background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)', overflowX: 'auto', display: 'flex', justifyContent: 'center' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/* ── Custom code block renderer ── */
function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const lang = /language-(\w+)/.exec(className ?? '')?.[1] ?? ''
  const code = String(children).replace(/\n$/, '')

  if (lang === 'mermaid') return <MermaidDiagram code={code} />

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.07)', marginBottom: 4 }}>
      {lang && (
        <div style={{ padding: '5px 14px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
          </div>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'JetBrains Mono, monospace', marginLeft: 4 }}>{lang}</span>
        </div>
      )}
      <pre style={{ margin: 0, padding: '14px', overflowX: 'auto' }}>
        <code style={{ fontSize: 12, color: '#a5b4fc', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.7 }}>{code}</code>
      </pre>
    </div>
  )
}

/* ── Markdown component map ── */
const MD_COMPONENTS: Record<string, React.ComponentType<any>> = {
  h1: ({ children }) => (
    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.03em', marginBottom: 8, marginTop: 32, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 12 }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', letterSpacing: '-0.02em', marginBottom: 8, marginTop: 28 }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1', marginBottom: 6, marginTop: 20 }}>{children}</h3>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: 12 }}>{children}</p>
  ),
  ul: ({ children }) => (
    <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.75, marginBottom: 4 }}>{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{ borderLeft: '3px solid #6366f1', paddingLeft: 14, marginLeft: 0, marginBottom: 12 }}>{children}</blockquote>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{children}</tr>,
  th: ({ children }) => (
    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase', background: 'rgba(255,255,255,0.03)' }}>{children}</th>
  ),
  td: ({ children }) => (
    <td style={{ padding: '8px 12px', fontSize: 12, color: 'rgba(255,255,255,0.55)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{children}</td>
  ),
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', margin: '24px 0' }} />,
  strong: ({ children }) => <strong style={{ color: '#e2e8f0', fontWeight: 700 }}>{children}</strong>,
  code: ({ className, children }) => {
    const isInline = !String(children).includes('\n')
    if (isInline) {
      return <code style={{ padding: '2px 6px', borderRadius: 5, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontSize: 12, fontFamily: 'JetBrains Mono, monospace' }}>{children}</code>
    }
    return <CodeBlock className={className}>{children}</CodeBlock>
  },
  pre: ({ children }) => <>{children}</>,
}

/* ── Main component ── */
interface Props { onClose: () => void }

export function DocsViewer({ onClose }: Props) {
  const [docs, setDocs] = useState<string[]>([])
  const [selected, setSelected] = useState<string>('')
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/docs')
      .then(r => r.json())
      .then(d => {
        setDocs(d.docs ?? [])
        if (d.docs?.length) setSelected(d.docs[0])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    setContent('')
    fetch(`/api/docs/${encodeURIComponent(selected)}`)
      .then(r => r.text())
      .then(t => { setContent(t); setLoading(false) })
      .catch(() => setLoading(false))
  }, [selected])

  function docLabel(filename: string) {
    return filename.replace(/\.md$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', display: 'flex', padding: 0 }}
      onClick={onClose}
    >
      <div
        style={{ display: 'flex', width: '100%', height: '100%' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar — doc list */}
        <div style={{ width: 240, flexShrink: 0, background: 'rgba(13,17,23,0.98)', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📚</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Docs</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>Helper documents</p>
              </div>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
            {docs.map(doc => (
              <button
                key={doc}
                onClick={() => setSelected(doc)}
                style={{
                  width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 9, fontSize: 12,
                  fontWeight: selected === doc ? 700 : 500, cursor: 'pointer', marginBottom: 3,
                  background: selected === doc ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: selected === doc ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                  border: selected === doc ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (selected !== doc) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (selected !== doc) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                📄 {docLabel(doc)}
              </button>
            ))}
            {docs.length === 0 && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '10px 12px' }}>No docs found</p>
            )}
          </div>
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(7,9,16,0.95)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '16px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>{selected ? docLabel(selected) : 'Documentation'}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                {selected || 'Select a document from the sidebar'}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer', width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ✕
            </button>
          </div>

          {/* Markdown content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px 48px' }}>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 }}>
                <div className="blink" style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>Loading document…</span>
              </div>
            )}
            {!loading && content && (
              <div style={{ maxWidth: 860, margin: '0 auto' }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={MD_COMPONENTS}
                >
                  {content}
                </ReactMarkdown>
              </div>
            )}
            {!loading && !content && !selected && (
              <div style={{ textAlign: 'center', paddingTop: 80, color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>
                Select a document from the sidebar
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
