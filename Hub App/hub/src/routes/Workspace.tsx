import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PRODUCT_MAP } from './workspace/products'
import { WorkspaceTopbar } from './workspace/WorkspaceTopbar'
import { WorkspaceTOC } from './workspace/WorkspaceTOC'
import { WorkspaceDrawer } from './workspace/WorkspaceDrawer'
import { SprintSection } from './workspace/sections/SprintSection'
import { DecisionsSection } from './workspace/sections/DecisionsSection'
import { MilestonesSection } from './workspace/sections/MilestonesSection'
import { SpecSection } from './workspace/sections/SpecSection'
import { NotesSection } from './workspace/sections/NotesSection'
import { ChangelogSection } from './workspace/sections/ChangelogSection'
import type { Task, Decision, Milestone, Section } from './workspace/types'
import './Workspace.css'

export default function Workspace() {
  const { productId = 'vein' } = useParams()
  const navigate = useNavigate()
  const product = PRODUCT_MAP[productId] ?? PRODUCT_MAP['vein']

  const [activeSection, setActiveSection] = useState<Section>('spec')
  const [drawerTab, setDrawerTab] = useState<'design' | 'live' | null>(null)

  const [tasks,            setTasks]            = useState<Task[]>([])
  const [decisions,        setDecisions]        = useState<Decision[]>([])
  const [milestones,       setMilestones]       = useState<Milestone[]>([])
  const [specContent,      setSpecContent]      = useState('')
  const [notesContent,     setNotesContent]     = useState('')
  const [changelogContent, setChangelogContent] = useState('')
  const [loadedFor,        setLoadedFor]        = useState<string | null>(null)
  const [errorInfo,        setErrorInfo]        = useState<{ productId: string; msg: string } | null>(null)
  const [prevProductId,    setPrevProductId]    = useState(productId)
  const [savedAt,          setSavedAt]          = useState<Date | null>(null)

  // Derived state — computed during render, not in effects
  if (prevProductId !== productId) {
    setPrevProductId(productId)
    setErrorInfo(null)
  }
  const loading = loadedFor !== productId && errorInfo?.productId !== productId
  const error   = errorInfo?.productId === productId ? errorInfo.msg : null

  useEffect(() => {
    if (!PRODUCT_MAP[productId]) { navigate('/workspace/vein', { replace: true }); return }

    let cancelled = false

    Promise.all([
      supabase.from('workspace_tasks').select('*').eq('product_id', productId).order('position'),
      supabase.from('workspace_decisions').select('*').eq('product_id', productId).order('position'),
      supabase.from('workspace_milestones').select('*').eq('product_id', productId).order('position'),
      supabase.from('workspace_docs').select('content').eq('product_id', productId).eq('section', 'spec').maybeSingle(),
      supabase.from('workspace_docs').select('content').eq('product_id', productId).eq('section', 'notes').maybeSingle(),
      supabase.from('workspace_docs').select('content').eq('product_id', productId).eq('section', 'changelog').maybeSingle(),
    ]).then(([t, d, m, spec, notes, changelog]) => {
      if (cancelled) return
      if (t.error || d.error || m.error) {
        setErrorInfo({ productId, msg: "couldn\u2019t load workspace data. check your connection and try refreshing." })
        return
      }
      setTasks((t.data ?? []) as Task[])
      setDecisions((d.data ?? []) as Decision[])
      setMilestones((m.data ?? []) as Milestone[])
      setSpecContent(spec.data?.content ?? '')
      setNotesContent(notes.data?.content ?? '')
      setChangelogContent(changelog.data?.content ?? '')
      setLoadedFor(productId)
    }).catch(() => {
      if (!cancelled) setErrorInfo({ productId, msg: 'something went wrong loading the workspace. try refreshing.' })
    })

    return () => { cancelled = true }
  }, [productId, navigate])

  // ⌘D / ⌘P shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'd') { e.preventDefault(); setDrawerTab(t => t === 'design' ? null : 'design') }
        if (e.key === 'p') { e.preventDefault(); setDrawerTab(t => t === 'live'   ? null : 'live')   }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function navigateSection(s: Section) {
    setActiveSection(s)
    document.getElementById(s)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleSaved() {
    setSavedAt(new Date())
  }

  const sprintLabel       = tasks.find(t => t.sprint_label)?.sprint_label ?? 'current'
  const milestoneProgress = milestones.length > 0
    ? `${milestones.filter(m => m.status === 'done').length} / ${milestones.length}`
    : ''

  if (loading) {
    return (
      <div className="ws-loading">
        <span className="t-mono-cap" style={{ color: 'var(--ink-muted)' }}>loading workspace…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ws-loading">
        <span className="t-mono-cap" style={{ color: 'var(--negative)', maxWidth: 320, textAlign: 'center' }}>{error}</span>
        <button className="btn" style={{ marginTop: 'var(--space-4)', fontSize: 10 }} onClick={() => window.location.reload()}>
          try again
        </button>
      </div>
    )
  }

  return (
    <div className="ws-shell">
      <WorkspaceTopbar
        productId={productId}
        onToggleDesign={() => setDrawerTab(t => t === 'design' ? null : 'design')}
        onToggleLive={() => setDrawerTab(t => t === 'live' ? null : 'live')}
        drawerTab={drawerTab}
        savedAt={savedAt}
      />

      <div className={`ws-grid${drawerTab === null ? ' ws-grid--drawer-closed' : ''}`}>
        <WorkspaceTOC
          productId={productId}
          productName={product.name}
          productStatus={product.status}
          productVersion={product.version}
          activeSection={activeSection}
          onNavigate={navigateSection}
          inboxCount={0}
          taskCount={tasks.filter(t => t.status !== 'done').length}
          decisionCount={decisions.length}
          milestoneProgress={milestoneProgress}
        />

        <main className="ws-doc">
          <HowItWorksCallout />

          <SpecSection
            productId={productId}
            content={specContent}
            onUpdate={setSpecContent}
            onSaved={handleSaved}
          />

          <MilestonesSection milestones={milestones} productId={productId} onUpdate={setMilestones} />

          <div id="inbox" style={{ marginTop: 48 }}>
            <div className="ws-sec-eyebrow">— § inbox</div>
            <h2 className="ws-sec-h2">inbox</h2>
            <p style={{ color: 'var(--ink-faint)', fontSize: 'var(--text-sm)' }}>
              no messages yet. support and feedback from users will appear here.
            </p>
          </div>

          <SprintSection
            tasks={tasks}
            productId={productId}
            sprintLabel={sprintLabel}
            onUpdate={setTasks}
          />

          <DecisionsSection
            decisions={decisions}
            productId={productId}
            onUpdate={setDecisions}
          />

          <div id="roadmap" style={{ marginTop: 48 }}>
            <div className="ws-sec-eyebrow">— § roadmap</div>
            <h2 className="ws-sec-h2">roadmap</h2>
            <p style={{ color: 'var(--ink-faint)', fontSize: 'var(--text-sm)' }}>coming soon.</p>
          </div>

          <NotesSection
            productId={productId}
            content={notesContent}
            onUpdate={setNotesContent}
            onSaved={handleSaved}
          />

          <ChangelogSection
            productId={productId}
            rawContent={changelogContent}
            onUpdate={setChangelogContent}
            onSaved={handleSaved}
          />
        </main>

        <WorkspaceDrawer
          tab={drawerTab}
          onChangeTab={setDrawerTab}
          productId={productId}
        />
      </div>
    </div>
  )
}

function HowItWorksCallout() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('ws-how-dismissed') === '1'
  )
  if (dismissed) return null
  return (
    <div className="ws-loop">
      <div className="ws-loop-head">
        <span className="ws-loop-eyebrow">— how this works</span>
        <button className="ws-loop-dismiss" onClick={() => { localStorage.setItem('ws-how-dismissed', '1'); setDismissed(true) }}>×</button>
      </div>
      <div className="ws-loop-grid">
        <div className="ws-loop-card ws-loop-card--here">
          <div className="ws-loop-label">· you are here</div>
          <div className="ws-loop-name">workspace</div>
          <div className="ws-loop-blurb">plan, decide, give direction. claude reads everything in here.</div>
        </div>
        <div className="ws-loop-arrow">→</div>
        <div className="ws-loop-card">
          <div className="ws-loop-label">· visuals</div>
          <div className="ws-loop-name">design</div>
          <div className="ws-loop-blurb">wireframes, brand, screens. ⌘D to open the design pane.</div>
        </div>
        <div className="ws-loop-arrow">→</div>
        <div className="ws-loop-card">
          <div className="ws-loop-label">· the built thing</div>
          <div className="ws-loop-name">code</div>
          <div className="ws-loop-blurb">claude code builds from the spec + designs in the terminal.</div>
        </div>
      </div>
      <div className="ws-loop-foot">
        you don't write code. describe what you want, claude builds it. ⌘D for designs, ⌘P for live preview.
      </div>
    </div>
  )
}
