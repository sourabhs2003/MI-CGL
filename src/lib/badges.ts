import type { MockDoc, StudySessionDoc, UserProfile } from '../types'

export const BADGE_DEFS: { id: string; label: string; description: string }[] = [
  {
    id: 'streak_7',
    label: 'Consistency King',
    description: 'Reach a 7-day study streak.',
  },
  {
    id: 'day_8h',
    label: '8 Hour Beast',
    description: 'Log 8+ hours in a single day.',
  },
  {
    id: 'mock_10',
    label: 'Mock Slayer',
    description: 'Complete 10 mocks.',
  },
  {
    id: 'acc_90',
    label: '90% Accuracy',
    description: 'Score 90%+ accuracy on a mock.',
  },
  {
    id: 'acc_85',
    label: 'Accuracy Hunter',
    description: '85%+ accuracy on any mock.',
  },
]

export function computeEarnedBadgeIds(input: {
  profile: UserProfile
  sessions: StudySessionDoc[]
  mocks: MockDoc[]
}): Set<string> {
  const earned = new Set<string>()
  const { profile, sessions, mocks } = input

  if (profile.streak >= 7) earned.add('streak_7')

  const byDay = new Map<string, number>()
  for (const s of sessions) {
    byDay.set(s.dayKey, (byDay.get(s.dayKey) ?? 0) + s.durationSec)
  }
  for (const sec of byDay.values()) {
    if (sec >= 8 * 3600) earned.add('day_8h')
  }

  if (mocks.length >= 10) earned.add('mock_10')
  if (mocks.some((m) => m.accuracyPct >= 90)) earned.add('acc_90')
  if (mocks.some((m) => m.accuracyPct >= 85 && m.accuracyPct < 90))
    earned.add('acc_85')

  return earned
}
