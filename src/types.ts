export type Subject = 'Maths' | 'GS' | 'English' | 'Reasoning' | 'Mock' | 'Mixed' | 'Miscellaneous'

export type MockType = 'full' | 'sectional'

export type MockSource = 'manual' | 'ocr'

export type FullExamType = 'SSC CGL Tier 1' | 'SSC CGL Tier 2'

export type SectionName = 'Reasoning' | 'GA' | 'Maths' | 'English'

export interface UserProfile {
  xp: number
  lifetimeXp?: number
  xpMonth?: string | null
  streak: number
  lastStudyDay: string | null
  isFrozen?: boolean
  frozenAt?: unknown
  comebackAt?: unknown
  displayName?: string
  avatarIcon?: string
  avatarColor?: string
  currentSessionId?: string | null
  notificationSettings?: NotificationSettings
  notificationStats?: NotificationStats
  createdAt?: unknown
}

export interface NotificationSettings {
  enabled: boolean
  squadAlerts: boolean
  motivationAlerts: boolean
}

export interface NotificationStats {
  dayKey?: string
  sentToday?: number
  lastByType?: Record<string, unknown>
}

export type NotificationType =
  | 'squad_session_started'
  | 'motivation_no_study_today'
  | 'motivation_low_consistency'
  | 'motivation_falling_performance'
  | 'motivation_missed_target'

export interface AppNotificationDoc {
  id: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  createdAt: unknown
  senderId?: string | null
  senderName?: string | null
  actionUrl?: string | null
  dayKey?: string
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night'

export interface UserAvatar {
  icon: string
  color: string
}

export interface StudySessionDoc {
  id: string
  subject: Subject
  topic: string
  durationSec: number
  dayKey: string
  startTime?: string
  endTime?: string
  timeOfDay?: TimeOfDay
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
  type?: 'study' | 'mock' | 'target'
  targetType?: 'time' | 'chapter' | 'custom'
  priority?: 'Low' | 'Medium' | 'High'
  dateKey?: string
  completed?: boolean
  value?: number
  duration?: number
  notes?: string
  isGroupTask?: boolean
  createdBy?: string
  createdAt?: unknown
  completedAt?: unknown
  completedBy?: string[]
}

export interface MockOverall {
  score: number
  total: number
  attempted: number
  accuracy: number
  time: number
  percentile?: number
  rank?: number
  rankTotal?: number
  correct?: number
  incorrect?: number
  unattempted?: number
}

export interface FullMockSection {
  name: SectionName
  score: number
  total: number
  attempted: number
  accuracy: number
  time: number
}

export interface BaseMockDoc {
  id: string
  type: MockType
  label: string
  dayKey: string
  source: MockSource
  schemaVersion: number
  createdAt: unknown
}

export interface FullMockDoc extends BaseMockDoc {
  type: 'full'
  exam: FullExamType
  overall: MockOverall
  sections: FullMockSection[]
}

export interface SectionalMockDoc extends BaseMockDoc {
  type: 'sectional'
  subject: Exclude<Subject, 'Mixed' | 'Mock'>
  overall: MockOverall
}

export type MockDoc = FullMockDoc | SectionalMockDoc
