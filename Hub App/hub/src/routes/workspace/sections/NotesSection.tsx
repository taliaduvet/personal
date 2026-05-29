import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface Props {
  productId: string
  content: string
  onUpdate: (c: string) => void
  onSaved?: () => void
}

export function NotesSection({ productId, content, onUpdate, onSaved }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  const [saving, setSaving] = useState(false)
  const [prevContent, setPrevContent] = useState(content)

  if (prevContent !== content && !editing) {
    setPrevContent(content)
    setDraft(content)
  }

  async function save() {
    setSaving(true)
    await supabase
      .from('workspace_docs')
      .upsert({ product_id: productId, section: 'notes', content: draft }, { onConflict: 'product_id,section' })
    onUpdate(draft)
    onSaved?.()
    setSaving(false)
    setEditing(false)
  }

  return (
    <section id="notes" style={{ marginTop: 48, paddingBottom: 160 }}>
      <div className="ws-sec-eyebrow">— § notes</div>
      <h2 className="ws-sec-h2">notes & scratch</h2>

      {editing ? (
        <div>
          <textarea
            className="ws-spec-editor"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            autoFocus
            rows={12}
            placeholder="freeform notes, scratch thinking, links, anything…"
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
            ? content.split('\n').map((line, i) => (
                <p key={i} style={{ fontSize: 'var(--text-base)', lineHeight: 1.65, color: 'var(--ink-2)', margin: '0 0 6px' }}>
                  {line || <br />}
                </p>
              ))
            : <p style={{ color: 'var(--ink-faint)', fontStyle: 'italic' }}>scratch space — links, half-thoughts, anything.</p>
          }
          <button className="btn-text" onClick={() => { setDraft(content); setEditing(true) }} style={{ marginTop: 'var(--space-3)', fontSize: 10 }}>
            {content ? 'edit notes' : 'add notes'}
          </button>
        </div>
      )}
    </section>
  )
}
