import { useState, useRef } from 'react'
import { supabase } from '../../../lib/supabase'

interface Props {
  productId: string
  content: string
  onUpdate: (c: string) => void
}

export function SpecSection({ productId, content, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function save() {
    setSaving(true)
    await supabase
      .from('workspace_docs')
      .upsert({ product_id: productId, section: 'spec', content: draft }, { onConflict: 'product_id,section' })
    onUpdate(draft)
    setSaving(false)
    setEditing(false)
  }

  return (
    <section id="spec">
      <div className="ws-sec-eyebrow">— § 01 / spec &amp; understanding</div>
      <h2 className="ws-sec-h2">what this is.</h2>

      {editing ? (
        <div>
          <textarea
            ref={textareaRef}
            className="ws-spec-editor"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
            rows={14}
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ fontSize: 10 }}>
              {saving ? 'saving…' : 'save'}
            </button>
            <button className="btn" onClick={() => { setDraft(content); setEditing(false) }} style={{ fontSize: 10 }}>cancel</button>
          </div>
        </div>
      ) : (
        <div className="ws-spec-body">
          {content
            ? content.split('\n\n').map((para, i) => (
                para.startsWith('**') && para.endsWith('**')
                  ? <h3 key={i} className="ws-spec-subhead">{para.replace(/\*\*/g, '')}</h3>
                  : para.startsWith('**')
                    ? <p key={i} style={{ fontSize: 'var(--text-base)', lineHeight: 1.65, color: 'var(--ink-2)', margin: '0 0 12px' }}>
                        {para.split('**').map((seg, j) => j % 2 === 1 ? <strong key={j}>{seg}</strong> : seg)}
                      </p>
                    : <p key={i} style={{ fontSize: 'var(--text-base)', lineHeight: 1.65, color: 'var(--ink-2)', margin: '0 0 12px' }}>{para}</p>
              ))
            : <p style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>no spec written yet — add one to give claude context.</p>
          }
          <button className="btn-text" onClick={() => { setDraft(content); setEditing(true) }} style={{ marginTop: 'var(--space-3)', fontSize: 10 }}>
            edit spec
          </button>
        </div>
      )}
    </section>
  )
}
