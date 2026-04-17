import { getAverageScore } from '../lib/mockAnalytics'
import type { MockDoc, StudySessionDoc } from '../types'

type AnalyticsInsightInput = {
  sessions: StudySessionDoc[]
  mocks: MockDoc[]
  streak: number
}

type GenkitResponse = {
  insight?: string
  output?: string
}

function buildFallbackInsight({ sessions, mocks, streak }: AnalyticsInsightInput): string {
  const last7 = sessions.filter((session) => {
    const stamp = new Date(`${session.dayKey}T12:00:00`).getTime()
    return Date.now() - stamp <= 7 * 24 * 60 * 60 * 1000
  })

  const subjectTotals = last7.reduce<Record<string, number>>((acc, session) => {
    acc[session.subject] = (acc[session.subject] ?? 0) + session.durationSec
    return acc
  }, {})

  const weakestSubject = Object.entries(subjectTotals).sort((a, b) => a[1] - b[1])[0]?.[0]
  const avgMock = getAverageScore(mocks.slice(-5))

  if (avgMock > 0 && avgMock < 60 && weakestSubject) return `Weak ${weakestSubject}. Shift more time there this week.`
  if (streak < 3) return 'Protect streak. Lock one focused session daily.'
  if (weakestSubject) return `${weakestSubject} needs more time next.`
  return 'Stay consistent. Push one strong session today.'
}

export async function generateAnalyticsInsight(input: AnalyticsInsightInput): Promise<string> {
  const baseUrl = import.meta.env.VITE_GENKIT_URL
  const apiKey = import.meta.env.VITE_GENKIT_API_KEY

  if (!baseUrl) return buildFallbackInsight(input)

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        sessions: input.sessions.map((session) => ({
          subject: session.subject,
          hours: Number((session.durationSec / 3600).toFixed(2)),
          dayKey: session.dayKey,
        })),
        mocks: input.mocks.map((mock) => ({
          type: mock.type,
          subject: mock.type === 'sectional' ? mock.subject : mock.exam,
          score: mock.overall.score,
          total: mock.overall.total,
          accuracy: mock.overall.accuracy,
        })),
        streak: input.streak,
      }),
    })

    if (!response.ok) return buildFallbackInsight(input)
    const data = (await response.json()) as GenkitResponse
    return data.insight || data.output || buildFallbackInsight(input)
  } catch {
    return buildFallbackInsight(input)
  }
}
