import { subWeeks } from 'date-fns'
import { toMillis } from './firestoreTime'
import type { FullMockDoc, MockDoc, SectionName, SectionalMockDoc } from '../types'

export type SubjectMetric = {
  name: string
  avgScorePct: number
  avgAccuracy: number
  avgTime: number
  count: number
}

export function sortMocksChronologically<T extends MockDoc>(mocks: T[]): T[] {
  return [...mocks].sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))
}

export function normalizeScore(score: number, total: number): number {
  return total > 0 ? Number(((score / total) * 100).toFixed(1)) : 0
}

export function getMockPercentage(mock: MockDoc): number {
  return normalizeScore(mock.overall.score, mock.overall.total)
}

export function getTimeEfficiency(mock: MockDoc): number {
  if (mock.overall.time <= 0) return 0
  return Number((getMockPercentage(mock) / mock.overall.time).toFixed(2))
}

export function splitMocks(mocks: MockDoc[]) {
  const fullMocks = mocks.filter((mock): mock is FullMockDoc => mock.type === 'full')
  const sectionalMocks = mocks.filter((mock): mock is SectionalMockDoc => mock.type === 'sectional')
  const tier2Mocks = fullMocks.filter((mock) => mock.exam === 'SSC CGL Tier 2')
  const tier1Mocks = fullMocks.filter((mock) => mock.exam === 'SSC CGL Tier 1')
  return { fullMocks, sectionalMocks, tier1Mocks, tier2Mocks }
}

export function getLatestMock<T extends MockDoc>(mocks: T[]): T | null {
  return sortMocksChronologically(mocks).at(-1) ?? null
}

export function getRecentMocks<T extends MockDoc>(mocks: T[], count = 5): T[] {
  return sortMocksChronologically(mocks).slice(-count)
}

export function getAverageScore<T extends MockDoc>(mocks: T[]): number {
  if (!mocks.length) return 0
  return Number((mocks.reduce((sum, mock) => sum + getMockPercentage(mock), 0) / mocks.length).toFixed(1))
}

export function getAverageAccuracy<T extends MockDoc>(mocks: T[]): number {
  if (!mocks.length) return 0
  return Number((mocks.reduce((sum, mock) => sum + mock.overall.accuracy, 0) / mocks.length).toFixed(1))
}

export function buildFullMockScoreTrend(mocks: FullMockDoc[]) {
  return getRecentMocks(mocks, 5).map((mock, index) => ({
    id: mock.id,
    label: `${mock.exam === 'SSC CGL Tier 2' ? 'T2' : 'T1'} ${index + 1}`,
    dayKey: mock.dayKey,
    scorePct: getMockPercentage(mock),
    accuracy: mock.overall.accuracy,
    percentile: mock.overall.percentile ?? 0,
  }))
}

export function buildSectionalAccuracyTrend(mocks: SectionalMockDoc[]) {
  return getRecentMocks(mocks, 5).map((mock, index) => ({
    id: mock.id,
    label: `${mock.subject} ${index + 1}`,
    dayKey: mock.dayKey,
    accuracy: mock.overall.accuracy,
    scorePct: getMockPercentage(mock),
  }))
}

export function buildMockScoreTrend<T extends MockDoc>(
  mocks: T[],
  labelFor: (mock: T, index: number) => string,
  count = 8,
) {
  const recent = getRecentMocks(mocks, count)
  return recent.map((mock, index) => ({
    id: mock.id,
    label: labelFor(mock, index),
    dayKey: mock.dayKey,
    score: mock.overall.score,
    total: mock.overall.total,
    scorePct: getMockPercentage(mock),
    accuracy: mock.overall.accuracy,
    percentile: mock.overall.percentile ?? 0,
    timeEfficiency: getTimeEfficiency(mock),
    time: mock.overall.time,
    attempted: mock.overall.attempted,
    improvement:
      index === 0
        ? 0
        : Number((mock.overall.score - recent[index - 1]!.overall.score).toFixed(1)),
  }))
}

export function buildSectionalImprovementTracking(mocks: SectionalMockDoc[]) {
  const grouped = new Map<string, { first: number; latest: number; count: number }>()
  for (const mock of sortMocksChronologically(mocks)) {
    const score = getMockPercentage(mock)
    const current = grouped.get(mock.subject)
    if (!current) {
      grouped.set(mock.subject, { first: score, latest: score, count: 1 })
    } else {
      current.latest = score
      current.count += 1
    }
  }

  return [...grouped.entries()].map(([subject, row]) => ({
    subject,
    improvement: Number((row.latest - row.first).toFixed(1)),
    latest: row.latest,
    count: row.count,
  }))
}

export function buildDailyPerformance<T extends MockDoc>(mocks: T[]) {
  const bucket = new Map<string, { score: number; accuracy: number; efficiency: number; count: number }>()
  for (const mock of mocks) {
    const current = bucket.get(mock.dayKey) ?? { score: 0, accuracy: 0, efficiency: 0, count: 0 }
    current.score += getMockPercentage(mock)
    current.accuracy += mock.overall.accuracy
    current.efficiency += getTimeEfficiency(mock)
    current.count += 1
    bucket.set(mock.dayKey, current)
  }
  return [...bucket.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dayKey, value]) => ({
      dayKey,
      avgScore: Number((value.score / value.count).toFixed(1)),
      avgAccuracy: Number((value.accuracy / value.count).toFixed(1)),
      avgEfficiency: Number((value.efficiency / value.count).toFixed(2)),
      mocks: value.count,
    }))
}

export function buildWeeklyPerformance<T extends MockDoc>(mocks: T[]) {
  const ordered = sortMocksChronologically(mocks)
  return Array.from({ length: 6 }, (_, index) => {
    const weekStart = subWeeks(new Date(), 5 - index)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}`
    const slice = ordered.filter((mock) => {
      const timestamp = toMillis(mock.createdAt)
      return timestamp >= weekStart.getTime() && timestamp < weekEnd.getTime()
    })
    if (!slice.length) return { label, avgScore: 0, avgAccuracy: 0, avgEfficiency: 0, mocks: 0 }
    return {
      label,
      avgScore: getAverageScore(slice),
      avgAccuracy: Number((slice.reduce((sum, mock) => sum + mock.overall.accuracy, 0) / slice.length).toFixed(1)),
      avgEfficiency: Number((slice.reduce((sum, mock) => sum + getTimeEfficiency(mock), 0) / slice.length).toFixed(2)),
      mocks: slice.length,
    }
  })
}

export function buildMockHeatmap<T extends MockDoc>(mocks: T[], keys: string[]) {
  const countByDay = new Map(keys.map((key) => [key, 0]))
  for (const mock of mocks) {
    if (countByDay.has(mock.dayKey)) {
      countByDay.set(mock.dayKey, (countByDay.get(mock.dayKey) ?? 0) + 1)
    }
  }
  return keys.map((dayKey) => ({
    dayKey,
    count: countByDay.get(dayKey) ?? 0,
  }))
}

export function buildFullSectionBreakdown(mocks: FullMockDoc[]): SubjectMetric[] {
  const bucket = new Map<SectionName, { score: number; accuracy: number; time: number; count: number }>()
  for (const mock of mocks) {
    for (const section of mock.sections) {
      const current = bucket.get(section.name) ?? { score: 0, accuracy: 0, time: 0, count: 0 }
      current.score += normalizeScore(section.score, section.total)
      current.accuracy += section.accuracy
      current.time += section.time
      current.count += 1
      bucket.set(section.name, current)
    }
  }
  return [...bucket.entries()]
    .map(([name, value]) => ({
      name,
      avgScorePct: Number((value.score / value.count).toFixed(1)),
      avgAccuracy: Number((value.accuracy / value.count).toFixed(1)),
      avgTime: Number((value.time / value.count).toFixed(1)),
      count: value.count,
    }))
    .sort((a, b) => b.avgScorePct - a.avgScorePct)
}

export function buildSectionalSubjectPerformance(mocks: SectionalMockDoc[]): SubjectMetric[] {
  const bucket = new Map<string, { score: number; accuracy: number; time: number; count: number }>()
  for (const mock of mocks) {
    const key = mock.subject === 'GS' ? 'GA' : mock.subject
    const current = bucket.get(key) ?? { score: 0, accuracy: 0, time: 0, count: 0 }
    current.score += getMockPercentage(mock)
    current.accuracy += mock.overall.accuracy
    current.time += mock.overall.time
    current.count += 1
    bucket.set(key, current)
  }
  return [...bucket.entries()]
    .map(([name, value]) => ({
      name,
      avgScorePct: Number((value.score / value.count).toFixed(1)),
      avgAccuracy: Number((value.accuracy / value.count).toFixed(1)),
      avgTime: Number((value.time / value.count).toFixed(1)),
      count: value.count,
    }))
    .sort((a, b) => b.avgScorePct - a.avgScorePct)
}

export function detectWeakSubjects(mocks: SectionalMockDoc[]): SubjectMetric[] {
  return buildSectionalSubjectPerformance(mocks)
    .filter((item) => item.count > 0)
    .sort((a, b) => a.avgScorePct + a.avgAccuracy - (b.avgScorePct + b.avgAccuracy))
    .slice(0, 3)
}
