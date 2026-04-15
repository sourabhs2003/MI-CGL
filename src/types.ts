export type Subject = 'Maths' | 'GS' | 'English' | 'Reasoning' | 'Mock' | 'Mixed'

export type MockKind = 'sectional' | 'full_t1' | 'full_t2'

export interface UserProfile {
  xp: number
  streak: number
  lastStudyDay: string | null
  displayName?: string
  createdAt?: unknown
}

export interface StudySessionDoc {
  id: string
  subject: Subject
  topic: string
  durationSec: number
  dayKey: string
  endedAt: unknown
}

export interface DailyStatDoc {
  totalSec: number
  sessionCount: number
  subjects: Partial<Record<Subject, number>>
}

export interface TaskDoc {
  id?: string
  title: string
  subject: string
  priority?: 'Low' | 'Medium' | 'High'
  dateKey?: string
  completed?: boolean
  isGroupTask?: boolean
  createdBy?: string
  createdAt?: unknown
  completedAt?: unknown
  completedBy?: string[]
}

export interface MockDoc {
  id: string
  label: string
  kind: MockKind
  subject: Subject
  score: number
  maxScore: number
  accuracyPct: number
  durationMin: number
  createdAt: unknown
}
