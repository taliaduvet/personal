import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

interface ChangelogEntry {
  id: string
  date: string
  text: string
}

interface Props {
  productId: string
  rawContent: string
  onUpdate: (raw: string) => void
  onSaved?: () => void
}

function parseEntries(raw: string): ChangelogEntry[] {
  try { return JSON.parse(raw) } catch { return [] }
}

function todayLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toLowerCase()
}

export function ChangelogSection({ productId, rawContent, onUpdate, onSaved }: Props) {
  const entries = parseEntries(rawContent)
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [saving, setSaving] = useState(false)

  async function addEntry() {
    if (!newText.trim()) return
    setSaving(true)
    const entry: ChangelogEntry = {
      id: crypto.randomUUID(),
      date: todayLabel(),
      text: newText.trim(),
    }
    const updated = [entry, ...entries]
    const raw = JSON.stringify(updated)
    await supabase
      .from('workspace_docs')
      .upsert({ product_id: productId, section: 'changelog', content: raw }, { onConflict: 'product_id,section' })
    onUpdate(raw)
    onSaved?.()
    setNewText('')
    setAdding(false)
    setSaving(false)
  }

  async function deleteEntry(id: string) {
    const updated = entries.filter(e => e.id !== id)
    const raw = JSON.stringify(updated)
    await supabase
      .from('workspace_docs')
      .upsert({ product_id: productId, section: 'changelog', content: raw }, { onConflict: 'product_id,section' })
    onUpdate(raw)
  }

  return (
    <section id="changelog" style={{ marginTop: 48 }}>
      <div className="ws-sec-eyebrow">— § changelog</div>
      <h2 className="ws-sec-h2">changelog</h2>
      <p className="ws-sec-lede">notable changes, shipped things, decisions that landed. newest first.</p>

      <div className="ws-dec-stack">
        {entries.map(entry => (
          <div key={entry.id} className="ws-dec-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
            <span className="t-mono-cap" style={{ color: 'var(--ink-faint)', fontSize: 10, flexShrink: 0, paddingTop: 2 }}>{entry.date}</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink-2)', flex: 1, lineHeight: 1.55 }}>{entry.text}</span>
            <button className="btn-text" onClick={() => deleteEntry(entry.id)} style={{ fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0 }}>×</button>
          </div>
        ))}

        {adding ? (
          <div className="ws-dec-card">
            <textarea
              autoFocus
              className="ws-spec-editor"
              placeholder="what shipped or changed…"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              rows={3}
              style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={addEntry} disabled={saving} style={{ fontSize: 10 }}>
                {saving ? 'saving…' : 'add entry'}
              </button>
              <button className="btn" onClick={() => { setAdding(false); setNewText('') }} style={{ fontSize: 10 }}>cancel</button>
              <span className="t-mono-cap" style={{ color: 'var(--ink-faint)', fontSize: 10 }}>{todayLabel()}</span>
            </div>
          </div>
        ) : (
          <button className="ws-dec-add" onClick={() => setAdding(true)}>+ log an entry</button>
        )}
      </div>
    </section>
  )
}
