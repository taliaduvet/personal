export type TaskStatus = 'todo' | 'doing' | 'done'
export type DecisionStatus = 'open' | 'decided'
export type MilestoneStatus = 'done' | 'current' | 'upcoming'

export interface Task {
  id: string
  product_id: string
  title: string
  status: TaskStatus
  tag: string | null
  sprint_label: string | null
  position: number
}

export interface DecisionOption {
  letter: string
  label: string
  chosen: boolean
  description?: string
}

export interface Decision {
  id: string
  product_id: string
  title: string
  status: DecisionStatus
  tags: string[]
  options: DecisionOption[]
  rationale: string | null
  deadline: string | null
  position: number
}

export interface MilestoneCheck {
  label: string
  done: boolean
}

export interface Milestone {
  id: string
  product_id: string
  number: number
  title: string
  status: MilestoneStatus
  checks: MilestoneCheck[]
  position: number
}

export interface InboxItem {
  id: string
  product_id: string
  from_email: string | null
  subject: string
  body: string | null
  tag: string | null
  status: 'open' | 'resolved'
  received_at: string
}

export interface WorkspaceDoc {
  product_id: string
  section: string
  content: string
}

export type Section = 'spec' | 'milestones' | 'inbox' | 'sprint' | 'decisions' | 'roadmap' | 'notes' | 'changelog'
