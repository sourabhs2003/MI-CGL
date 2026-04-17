import {
  buildFullSectionBreakdown,
  buildSectionalSubjectPerformance,
  detectWeakSubjects,
  getAverageScore,
  getRecentMocks,
  getMockPercentage,
  splitMocks,
  sortMocksChronologically,
} from '../lib/mockAnalytics'
import type { FullMockDoc, MockDoc, SectionalMockDoc } from '../types'

export type MockInsights = {
  strengths: string[]
  weaknesses: string[]
  actionPlan: string
}

type FlexibleInsightResponse =
  | MockInsights
  | {
      insights?: MockInsights
      output?: MockInsights
    }

export async function generateMockInsights(mocks: MockDoc[], mode: 'full' | 'sectional'): Promise<MockInsights> {
  const fallback = buildFallbackInsights(mocks, mode)
  const { fullMocks, sectionalMocks } = splitMocks(mocks)
  const scoped = mode === 'full' ? getRecentMocks(fullMocks, 5) : getRecentMocks(sectionalMocks, 5)
  const baseUrl = import.meta.env.VITE_GENKIT_URL
  const apiKey = import.meta.env.VITE_GENKIT_API_KEY

  if (!scoped.length || !baseUrl) return fallback

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        task: 'mock-insights',
        input: {
          mode,
          mocks: scoped.map((mock) => ({
            type: mock.type,
            exam: mock.type === 'full' ? mock.exam : null,
            subject: mock.type === 'sectional' ? mock.subject : null,
            overall: mock.overall,
            sections: mock.type === 'full' ? mock.sections : [],
          })),
        },
        instructions:
          'Return strict JSON with exactly 3 weaknesses, 2 strengths, and 1 actionPlan. Keep it short and data-driven.',
      }),
    })

    if (!response.ok) return fallback
    const data = (await response.json()) as FlexibleInsightResponse
    const payload =
      typeof data === 'object' && data !== null
        ? 'strengths' in data
          ? (data as MockInsights)
          : (data.insights ?? data.output)
        : null

    return sanitizeInsights(payload, fallback)
  } catch {
    return fallback
  }
}

function buildFallbackInsights(mocks: MockDoc[], mode: 'full' | 'sectional'): MockInsights {
  const { fullMocks, sectionalMocks } = splitMocks(mocks)
  const recentFullMocks: FullMockDoc[] = getRecentMocks(fullMocks, 5)
  const recentSectionalMocks: SectionalMockDoc[] = getRecentMocks(sectionalMocks, 5)
  const strengths: string[] = []
  const weaknesses: string[] = []
  const ordered = mode === 'full' ? sortMocksChronologically(recentFullMocks) : sortMocksChronologically(recentSectionalMocks)
  const scoreTrend = ordered.length >= 2 ? getMockPercentage(ordered.at(-1)!) - getMockPercentage(ordered[0]!) : 0
  const averageScore = mode === 'full' ? getAverageScore(recentFullMocks) : getAverageScore(recentSectionalMocks)

  if (mode === 'full') {
    const sections = buildFullSectionBreakdown(recentFullMocks)
    if (averageScore > 0) strengths.push(`Full mock average is ${averageScore.toFixed(1)}%.`)
    if (scoreTrend >= 4) strengths.push(`Full mock score trend improved by ${scoreTrend.toFixed(1)} points.`)
    if (sections[0]) strengths.push(`${sections[0].name} is strongest at ${sections[0].avgScorePct.toFixed(1)}%.`)
    if (ordered.filter((mock) => mock.overall.accuracy < 80).length >= 2) weaknesses.push('Full mock accuracy fell below 80% multiple times.')
    if (sections.at(-1)) weaknesses.push(`${sections.at(-1)!.name} is weakest at ${sections.at(-1)!.avgScorePct.toFixed(1)}%.`)
    if (sections.at(-2)) weaknesses.push(`${sections.at(-2)!.name} accuracy is only ${sections.at(-2)!.avgAccuracy.toFixed(1)}%.`)
    return {
      strengths: strengths.slice(0, 2),
      weaknesses: weaknesses.slice(0, 3),
      actionPlan: `Next week: repair ${sections.at(-1)?.name ?? 'the weakest section'} before the next full mock.`,
    }
  }

  const subjects = buildSectionalSubjectPerformance(recentSectionalMocks)
  const weakSubjects = detectWeakSubjects(recentSectionalMocks)
  if (averageScore > 0) strengths.push(`Sectional average is ${averageScore.toFixed(1)}%.`)
  if (scoreTrend >= 4) strengths.push(`Sectional score trend improved by ${scoreTrend.toFixed(1)} points.`)
  if (subjects[0]) strengths.push(`${subjects[0].name} is strongest at ${subjects[0].avgScorePct.toFixed(1)}%.`)
  if (ordered.filter((mock) => mock.overall.accuracy < 80).length >= 2) weaknesses.push('Sectional accuracy fell below 80% multiple times.')
  if (weakSubjects[0]) weaknesses.push(`${weakSubjects[0].name} is weakest at ${weakSubjects[0].avgScorePct.toFixed(1)}%.`)
  if (weakSubjects[1]) weaknesses.push(`${weakSubjects[1].name} accuracy is only ${weakSubjects[1].avgAccuracy.toFixed(1)}%.`)
  return {
    strengths: strengths.slice(0, 2),
    weaknesses: weaknesses.slice(0, 3),
    actionPlan: `Next week: focus on ${weakSubjects[0]?.name ?? 'the weakest subject'} with 3 targeted sectional tests.`,
  }
}

function sanitizeInsights(input: Partial<MockInsights> | null | undefined, fallback: MockInsights): MockInsights {
  return {
    strengths: Array.isArray(input?.strengths) ? input!.strengths.slice(0, 2).map(String) : fallback.strengths,
    weaknesses: Array.isArray(input?.weaknesses) ? input!.weaknesses.slice(0, 3).map(String) : fallback.weaknesses,
    actionPlan: input?.actionPlan ? String(input.actionPlan) : fallback.actionPlan,
  }
}
