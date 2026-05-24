import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Task } from '../types'

interface Props {
  tasks: Task[]
  productId: string
  sprintLabel: string
  onUpdate: (tasks: Task[]) => void
}

export function SprintSection({ tasks, productId, sprintLabel, onUpdate }: Props) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  async function cycleStatus(task: Task) {
    const next = task.status === 'todo' ? 'doing' : task.status === 'doing' ? 'done' : 'todo'
    await supabase.from('workspace_tasks').update({ status: next }).eq('id', task.id)
    onUpdate(tasks.map(t => t.id === task.id ? { ...t, status: next } : t))
  }

  async function addTask() {
    if (!newTitle.trim()) return
    const { data } = await supabase
      .from('workspace_tasks')
      .insert({ product_id: productId, title: newTitle.trim(), sprint_label: sprintLabel, position: tasks.length })
      .select()
      .single()
    if (data) onUpdate([...tasks, data as Task])
    setNewTitle('')
    setAdding(false)
  }

  const done  = tasks.filter(t => t.status === 'done')
  const doing = tasks.filter(t => t.status === 'doing')
  const todo  = tasks.filter(t => t.status === 'todo')
  const sorted = [...doing, ...todo, ...done]

  return (
    <section id="sprint">
      <div className="ws-sec-eyebrow">— § sprint · {sprintLabel}</div>
      <h2 className="ws-sec-h2">current sprint</h2>

      <div className="ws-sprint-card">
        <div className="ws-sprint-head">
          <span className="ws-sprint-title">{sprintLabel}</span>
          <span className="ws-sprint-progress t-mono-cap">
            {done.length} / {tasks.length} done
          </span>
        </div>

        {sorted.map(task => (
          <div key={task.id} className={`ws-sprint-row ws-sprint-row--${task.status}`}>
            <button
              className="ws-sprint-check"
              onClick={() => cycleStatus(task)}
              title="cycle status"
            />
            <span className="ws-sprint-text">{task.title}</span>
            {task.tag && <span className="ws-sprint-tag">{task.tag}</span>}
          </div>
        ))}

        {adding ? (
          <div className="ws-sprint-add-form">
            <input
              autoFocus
              className="input"
              placeholder="task title…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') { setAdding(false); setNewTitle('') }}}
              style={{ fontSize: 'var(--text-sm)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <button className="btn btn-primary" onClick={addTask} style={{ fontSize: 10 }}>add</button>
              <button className="btn" onClick={() => { setAdding(false); setNewTitle('') }} style={{ fontSize: 10 }}>cancel</button>
            </div>
          </div>
        ) : (
          <button className="ws-sprint-add" onClick={() => setAdding(true)}>+ add task</button>
        )}
      </div>
    </section>
  )
}
