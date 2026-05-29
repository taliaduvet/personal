import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Decision } from '../types'

interface Props {
  decisions: Decision[]
  productId: string
  onUpdate: (d: Decision[]) => void
}

export function DecisionsSection({ decisions, productId, onUpdate }: Props) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  async function toggleStatus(dec: Decision) {
    const next = dec.status === 'open' ? 'decided' : 'open'
    await supabase.from('workspace_decisions').update({ status: next }).eq('id', dec.id)
    onUpdate(decisions.map(d => d.id === dec.id ? { ...d, status: next } : d))
  }

  async function addDecision() {
    if (!newTitle.trim()) return
    const { data } = await supabase
      .from('workspace_decisions')
      .insert({ product_id: productId, title: newTitle.trim(), position: decisions.length })
      .select()
      .single()
    if (data) onUpdate([...decisions, data as Decision])
    setNewTitle('')
    setAdding(false)
  }

  return (
    <section id="decisions">
      <div className="ws-sec-eyebrow">— § decisions</div>
      <h2 className="ws-sec-h2">design decisions</h2>
      <p className="ws-sec-lede">decisions made and open questions. the rationale lives here so you don't re-litigate the same ground.</p>

      <div className="ws-dec-stack">
        {decisions.map(dec => (
          <div key={dec.id} className={`ws-dec-card ws-dec-card--${dec.status}`}>
            <div className="ws-dec-head">
              <span className="ws-dec-title">{dec.title}</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
                {(dec.tags ?? []).map(tag => (
                  <span key={tag} className={`ws-dec-pill ws-dec-pill--${tag}`}>{tag}</span>
                ))}
                <span className={`ws-dec-pill ws-dec-pill--status-${dec.status}`}>{dec.status}</span>
                <button className="btn-text" onClick={() => toggleStatus(dec)} style={{ fontSize: 10 }}>
                  {dec.status === 'open' ? 'mark decided' : 'reopen'}
                </button>
              </div>
            </div>

            {(dec.options ?? []).length > 0 && (
              <div className="ws-dec-options">
                {(dec.options ?? []).map(opt => (
                  <div key={opt.letter} className={`ws-dec-option${opt.chosen ? ' ws-dec-option--chosen' : ''}`}>
                    <span className="ws-dec-opt-letter">{opt.letter} · {opt.label}</span>
                    {opt.description && <span>{opt.description}</span>}
                  </div>
                ))}
              </div>
            )}

            {dec.rationale && (
              <div className="ws-dec-rationale">
                <div className="ws-dec-rationale-label">rationale</div>
                <p>{dec.rationale}</p>
              </div>
            )}

            {dec.deadline && (
              <div className="ws-dec-deadline">deadline · {dec.deadline}</div>
            )}
          </div>
        ))}

        {adding ? (
          <div className="ws-dec-card">
            <input
              autoFocus
              className="input"
              placeholder="decision title…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addDecision(); if (e.key === 'Escape') { setAdding(false); setNewTitle('') }}}
              style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button className="btn btn-primary" onClick={addDecision} style={{ fontSize: 10 }}>add</button>
              <button className="btn" onClick={() => { setAdding(false); setNewTitle('') }} style={{ fontSize: 10 }}>cancel</button>
            </div>
          </div>
        ) : (
          <button className="ws-dec-add" onClick={() => setAdding(true)}>+ log a decision</button>
        )}
      </div>
    </section>
  )
}
