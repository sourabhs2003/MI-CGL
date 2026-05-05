import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { AlertTriangle, BarChart3, CalendarDays, ChevronDown, Clock3, Crosshair, Flame, ListChecks, Sparkles, Target, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMocks } from '../hooks/useFirestoreData'
import { normalizeScore, sortMocksChronologically } from '../lib/mockAnalytics'
import { toMillis } from '../lib/firestoreTime'
import type { FullExamType, MockDoc, SectionName } from '../types'
import type { AnalysisTrendPoint, SectionChartPoint } from '../components/MockAnalysisCharts'

const ScoreTrendChart = lazy(() => import('../components/MockAnalysisCharts').then((module) => ({ default: module.ScoreTrendChart })))
const AccuracyTrendChart = lazy(() => import('../components/MockAnalysisCharts').then((module) => ({ default: module.AccuracyTrendChart })))
const SectionPerformanceChart = lazy(() => import('../components/MockAnalysisCharts').then((module) => ({ default: module.SectionPerformanceChart })))
const AttemptAccuracyChart = lazy(() => import('../components/MockAnalysisCharts').then((module) => ({ default: module.AttemptAccuracyChart })))

type DateRangeFilter = 'all' | '7d' | '30d' | '90d'
type ExamFilter = 'all' | FullExamType | 'sectional'
type MetricTone = 'good' | 'average' | 'weak' | 'neutral'
type SectionRow = {
  name: string
  averageScore: number
  averageAccuracy: number
  attempts: number
  averageTime: number
}

type AnalysisSummary = {
  totalMocks: number
  averageScore: number
  bestScore: number
  accuracy: number
  weakestSection: SectionRow | null
  strongestSection: SectionRow | null
  averageTime: number
  attemptRate: number
  bestWindow: string | null
  bestWindowScore: number | null
  scoreTrend: AnalysisTrendPoint[]
  sectionRows: SectionRow[]
  sectionChart: SectionChartPoint[]
}

type CompareSnapshot = {
  recentAverage: number
  overallAverage: number
  delta: number
}

type Insight = {
  id: string
  tone: MetricTone
  icon: ReactNode
  message: string
  value: string
}

const sectionDisplayMap: Record<SectionName, string> = {
  Maths: 'Quant',
  Reasoning: 'Reasoning',
  English: 'English',
  GA: 'GS',
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function formatShortDate(value: unknown) {
  const millis = toMillis(value)
  if (!millis) return '--'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(millis))
}

function formatMockTitle(mock: MockDoc) {
  if (mock.type === 'full') return mock.exam.replace('SSC CGL ', '')
  if (mock.subject === 'Maths') return 'Quant Sectional'
  if (mock.subject === 'GS') return 'GS Sectional'
  return `${mock.subject} Sectional`
}

function getTimeWindowLabel(value: unknown) {
  const millis = toMillis(value)
  if (!millis) return null
  const hour = new Date(millis).getHours()
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  if (hour < 21) return 'Evening'
  return 'Night'
}

function isWithinDateRange(mock: MockDoc, range: DateRangeFilter) {
  if (range === 'all') return true
  const millis = toMillis(mock.createdAt)
  if (!millis) return true
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return Date.now() - millis <= days * 24 * 60 * 60 * 1000
}

function matchesExamFilter(mock: MockDoc, examFilter: ExamFilter) {
  if (examFilter === 'all') return true
  if (examFilter === 'sectional') return mock.type === 'sectional'
  return mock.type === 'full' && mock.exam === examFilter
}

function metricTone(value: number, good = 75, weak = 50): MetricTone {
  if (value >= good) return 'good'
  if (value < weak) return 'weak'
  return 'average'
}

function buildSectionRows(mocks: MockDoc[]): SectionRow[] {
  const buckets = new Map<string, { score: number[]; accuracy: number[]; time: number[] }>()

  for (const mock of mocks) {
    if (mock.type === 'full') {
      for (const section of mock.sections) {
        const name = sectionDisplayMap[section.name]
        const current = buckets.get(name) ?? { score: [], accuracy: [], time: [] }
        current.score.push(normalizeScore(section.score, section.total))
        current.accuracy.push(section.accuracy)
        current.time.push(section.time)
        buckets.set(name, current)
      }
      continue
    }

    const name = mock.subject === 'Maths' ? 'Quant' : mock.subject === 'GS' ? 'GS' : mock.subject
    const current = buckets.get(name) ?? { score: [], accuracy: [], time: [] }
    current.score.push(normalizeScore(mock.overall.score, mock.overall.total))
    current.accuracy.push(mock.overall.accuracy)
    current.time.push(mock.overall.time)
    buckets.set(name, current)
  }

  return [...buckets.entries()]
    .map(([name, values]) => ({
      name,
      averageScore: Number(average(values.score).toFixed(1)),
      averageAccuracy: Number(average(values.accuracy).toFixed(1)),
      averageTime: Number(average(values.time).toFixed(1)),
      attempts: values.score.length,
    }))
    .sort((a, b) => b.averageScore - a.averageScore)
}

function buildSummary(mocks: MockDoc[]): AnalysisSummary {
  const ordered = sortMocksChronologically(mocks)
  const scorePercentages = ordered.map((mock) => normalizeScore(mock.overall.score, mock.overall.total))
  const accuracies = ordered.map((mock) => mock.overall.accuracy)
  const times = ordered.map((mock) => mock.overall.time)
  const attemptRates = ordered.map((mock) => (mock.overall.total > 0 ? (mock.overall.attempted / mock.overall.total) * 100 : 0))
  const sectionRows = buildSectionRows(ordered)
  const windowBuckets = new Map<string, number[]>()

  for (const mock of ordered) {
    const label = getTimeWindowLabel(mock.createdAt)
    if (!label) continue
    const current = windowBuckets.get(label) ?? []
    current.push(normalizeScore(mock.overall.score, mock.overall.total))
    windowBuckets.set(label, current)
  }

  const bestWindow = [...windowBuckets.entries()]
    .map(([label, scores]) => ({ label, score: average(scores) }))
    .sort((a, b) => b.score - a.score)[0]

  return {
    totalMocks: ordered.length,
    averageScore: Number(average(scorePercentages).toFixed(1)),
    bestScore: Number((scorePercentages.length ? Math.max(...scorePercentages) : 0).toFixed(1)),
    accuracy: Number(average(accuracies).toFixed(1)),
    weakestSection: sectionRows.at(-1) ?? null,
    strongestSection: sectionRows[0] ?? null,
    averageTime: Number(average(times).toFixed(1)),
    attemptRate: Number(average(attemptRates).toFixed(1)),
    bestWindow: bestWindow?.label ?? null,
    bestWindowScore: bestWindow ? Number(bestWindow.score.toFixed(1)) : null,
    scoreTrend: ordered.map((mock) => ({
      id: mock.id,
      label: formatShortDate(mock.createdAt),
      score: Number(normalizeScore(mock.overall.score, mock.overall.total).toFixed(1)),
      accuracy: Number(mock.overall.accuracy.toFixed(1)),
      attempted: Number(mock.overall.attempted.toFixed(1)),
      total: Number(mock.overall.total.toFixed(1)),
      attemptRate: Number((mock.overall.total > 0 ? (mock.overall.attempted / mock.overall.total) * 100 : 0).toFixed(1)),
    })),
    sectionRows,
    sectionChart: sectionRows.map((row) => ({
      name: row.name,
      score: row.averageScore,
      accuracy: row.averageAccuracy,
    })),
  }
}

function buildCompareSnapshot(mocks: MockDoc[]): CompareSnapshot | null {
  if (!mocks.length) return null
  const ordered = sortMocksChronologically(mocks)
  const overallAverage = average(ordered.map((mock) => normalizeScore(mock.overall.score, mock.overall.total)))
  const recent = ordered.slice(-5)
  const recentAverage = average(recent.map((mock) => normalizeScore(mock.overall.score, mock.overall.total)))
  return {
    recentAverage: Number(recentAverage.toFixed(1)),
    overallAverage: Number(overallAverage.toFixed(1)),
    delta: Number((recentAverage - overallAverage).toFixed(1)),
  }
}

function buildInsights(mocks: MockDoc[], summary: AnalysisSummary): Insight[] {
  const ordered = sortMocksChronologically(mocks)
  if (ordered.length < 2) {
    return [
      {
        id: 'start',
        tone: 'average',
        icon: <Target size={18} />,
        message: 'Add a few more mocks to unlock trend feedback.',
        value: `${ordered.length}/2`,
      },
    ]
  }

  const first = ordered[0]!
  const latest = ordered.at(-1)!
  const scoreDelta = normalizeScore(latest.overall.score, latest.overall.total) - normalizeScore(first.overall.score, first.overall.total)
  const accuracyDelta = latest.overall.accuracy - first.overall.accuracy
  const recent = ordered.slice(-3)
  const firstRecent = recent[0]
  const latestRecent = recent.at(-1)
  const recentScoreDelta = firstRecent && latestRecent
    ? normalizeScore(latestRecent.overall.score, latestRecent.overall.total) - normalizeScore(firstRecent.overall.score, firstRecent.overall.total)
    : 0
  const insights: Insight[] = [
    {
      id: 'accuracy',
      tone: accuracyDelta >= 0 ? 'good' : 'weak',
      icon: accuracyDelta >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
      message: accuracyDelta >= 0 ? 'Accuracy is improving across the filtered set.' : 'Accuracy slipped across the filtered set.',
      value: `${accuracyDelta >= 0 ? '+' : ''}${accuracyDelta.toFixed(1)}%`,
    },
    {
      id: 'score',
      tone: scoreDelta >= 0 ? 'good' : 'weak',
      icon: scoreDelta >= 0 ? <Trophy size={18} /> : <AlertTriangle size={18} />,
      message: scoreDelta >= 0 ? 'Score direction is positive overall.' : 'Score direction needs attention.',
      value: `${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(1)} pts`,
    },
  ]

  if (summary.weakestSection) {
    insights.push({
      id: 'weakest',
      tone: 'weak',
      icon: <Crosshair size={18} />,
      message: `${summary.weakestSection.name} is the clearest repair area right now.`,
      value: `${summary.weakestSection.averageScore.toFixed(1)}%`,
    })
  }

  if (summary.strongestSection) {
    insights.push({
      id: 'strongest',
      tone: 'good',
      icon: <Flame size={18} />,
      message: `${summary.strongestSection.name} is carrying your performance baseline.`,
      value: `${summary.strongestSection.averageScore.toFixed(1)}%`,
    })
  }

  if (recent.length >= 3) {
    insights.push({
      id: 'recent',
      tone: recentScoreDelta >= 0 ? 'good' : 'weak',
      icon: recentScoreDelta >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />,
      message: recentScoreDelta >= 0 ? 'Last 3 mocks are trending upward.' : 'Your last 3 mocks are dropping.',
      value: `${recentScoreDelta >= 0 ? '+' : ''}${recentScoreDelta.toFixed(1)} pts`,
    })
  }

  if (summary.bestWindow && summary.bestWindowScore != null) {
    insights.push({
      id: 'window',
      tone: 'average',
      icon: <Clock3 size={18} />,
      message: `You perform best in ${summary.bestWindow.toLowerCase()} mock sessions.`,
      value: `${summary.bestWindowScore.toFixed(1)}%`,
    })
  }

  return insights.slice(0, 5)
}

function buildAiBrief(summary: AnalysisSummary, compare: CompareSnapshot | null): string {
  if (!summary.totalMocks) return 'Add mocks to unlock the AI brief.'
  if (compare && compare.delta < -3) {
    return `Recent score is ${Math.abs(compare.delta).toFixed(1)} points below baseline. Run a repair block for ${summary.weakestSection?.name ?? 'the weakest section'} before the next mock.`
  }
  if (summary.accuracy < 60) {
    return `Accuracy is the biggest lever at ${summary.accuracy.toFixed(1)}%. Attempt fewer doubtful questions and review wrong answers first.`
  }
  if (summary.weakestSection && summary.strongestSection && summary.strongestSection.averageScore - summary.weakestSection.averageScore >= 12) {
    return `${summary.weakestSection.name} is lagging behind ${summary.strongestSection.name}. Use a 2:1 practice split until the gap drops below 8 points.`
  }
  if (summary.bestWindow) {
    return `Your best mock window is ${summary.bestWindow.toLowerCase()}. Put full mocks there and use other slots for revision.`
  }
  return 'Performance is stable. Keep the next mock timed and compare attempt rate with accuracy afterward.'
}

function useDesktopDefault() {
  const [isDesktop, setIsDesktop] = useState(() => (typeof window === 'undefined' ? true : window.matchMedia('(min-width: 900px)').matches))

  useEffect(() => {
    const media = window.matchMedia('(min-width: 900px)')
    const update = () => setIsDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isDesktop
}

function SectionFrame({ eyebrow, title, children, action }: { eyebrow: string; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <motion.section
      className="analysis-section-frame"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <div className="analysis-section-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  )
}

function FilterBar({
  dateRange,
  examFilter,
  onDateRangeChange,
  onExamFilterChange,
}: {
  dateRange: DateRangeFilter
  examFilter: ExamFilter
  onDateRangeChange: (value: DateRangeFilter) => void
  onExamFilterChange: (value: ExamFilter) => void
}) {
  return (
    <div className="analysis-filter-panel">
      <label>
        <span>Date range</span>
        <select value={dateRange} onChange={(event) => onDateRangeChange(event.target.value as DateRangeFilter)}>
          <option value="all">All time</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </label>
      <label>
        <span>Exam type</span>
        <select value={examFilter} onChange={(event) => onExamFilterChange(event.target.value as ExamFilter)}>
          <option value="all">All mocks</option>
          <option value="SSC CGL Tier 1">Tier 1</option>
          <option value="SSC CGL Tier 2">Tier 2</option>
          <option value="sectional">Sectional</option>
        </select>
      </label>
    </div>
  )
}

function SummaryCard({ label, value, hint, tone, icon }: { label: string; value: string; hint: string; tone: MetricTone; icon: ReactNode }) {
  return (
    <article className={`analysis-summary-card ${tone}`}>
      <div className="analysis-summary-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="analysis-chart-card">
      <h3>{title}</h3>
      <div className="analysis-chart-body">{children}</div>
    </article>
  )
}

function ChartLoader() {
  return <div className="analysis-chart-loader">Loading charts...</div>
}

function CompareCard({ compare }: { compare: CompareSnapshot | null }) {
  if (!compare) return null

  return (
    <article className={`analysis-compare-card ${compare.delta >= 0 ? 'good' : 'weak'}`}>
      <div>
        <span>Last 5 vs overall</span>
        <strong>{compare.delta >= 0 ? '+' : ''}{compare.delta.toFixed(1)} pts</strong>
      </div>
      <p>
        Recent average <strong>{compare.recentAverage.toFixed(1)}%</strong> against overall <strong>{compare.overallAverage.toFixed(1)}%</strong>.
      </p>
    </article>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <article className={`analysis-insight-card ${insight.tone}`}>
      <div className="analysis-insight-icon">{insight.icon}</div>
      <p>{insight.message}</p>
      <strong>{insight.value}</strong>
    </article>
  )
}

function AiBriefCard({ message }: { message: string }) {
  return (
    <article className="analysis-ai-brief">
      <div className="analysis-ai-brief-icon">
        <Sparkles size={18} />
      </div>
      <div>
        <span>AI brief</span>
        <strong>{message}</strong>
      </div>
    </article>
  )
}

function DetailPanel({ title, icon, children, defaultOpen }: { title: string; icon: ReactNode; children: ReactNode; defaultOpen: boolean }) {
  return (
    <details className="analysis-detail-panel" open={defaultOpen}>
      <summary>
        <span>{icon}</span>
        <strong>{title}</strong>
        <ChevronDown size={18} />
      </summary>
      <div className="analysis-detail-content">{children}</div>
    </details>
  )
}

function EmptyState() {
  return (
    <section className="analysis-empty-state">
      <h2>No mocks in this filter</h2>
      <p className="muted">Change the filters or add a mock to see analysis here.</p>
      <Link to="/mocks" className="btn primary sm">Add Mock</Link>
    </section>
  )
}

export function MockAnalysisPage() {
  const { user } = useAuth()
  const mocks = useMocks(user?.uid)
  const isDesktop = useDesktopDefault()
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all')
  const [examFilter, setExamFilter] = useState<ExamFilter>('all')

  const filteredMocks = useMemo(
    () => mocks.filter((mock) => isWithinDateRange(mock, dateRange) && matchesExamFilter(mock, examFilter)),
    [dateRange, examFilter, mocks],
  )
  const orderedMocks = useMemo(() => sortMocksChronologically(filteredMocks), [filteredMocks])
  const summary = useMemo(() => buildSummary(filteredMocks), [filteredMocks])
  const compareSnapshot = useMemo(() => buildCompareSnapshot(filteredMocks), [filteredMocks])
  const insights = useMemo(() => buildInsights(filteredMocks, summary), [filteredMocks, summary])
  const aiBrief = useMemo(() => buildAiBrief(summary, compareSnapshot), [summary, compareSnapshot])
  const latestMock = orderedMocks.at(-1)

  return (
    <>
      <header className="page-head analysis-page-head">
        <p className="eyebrow">Mocks</p>
        <div className="page-head-row">
          <div>
            <h1>Mock Analysis</h1>
            <p className="muted">Performance summary, trends, insights, and the full breakdown without the clutter.</p>
          </div>
          <Link to="/mocks" className="btn ghost sm">Entry</Link>
        </div>
      </header>

      <main className="analysis-redesign">
        <FilterBar
          dateRange={dateRange}
          examFilter={examFilter}
          onDateRangeChange={setDateRange}
          onExamFilterChange={setExamFilter}
        />

        {!filteredMocks.length ? (
          <EmptyState />
        ) : (
          <>
            <SectionFrame eyebrow="1. Performance Summary" title="Clear in 3 seconds">
              <AiBriefCard message={aiBrief} />
              <CompareCard compare={compareSnapshot} />
              <div className="analysis-summary-grid">
                <SummaryCard label="Total Mocks" value={String(summary.totalMocks)} hint={latestMock ? `Latest ${formatShortDate(latestMock.createdAt)}` : 'No latest mock'} tone="neutral" icon={<ListChecks size={18} />} />
                <SummaryCard label="Average Score" value={`${summary.averageScore.toFixed(1)}%`} hint="Across selected mocks" tone={metricTone(summary.averageScore)} icon={<BarChart3 size={18} />} />
                <SummaryCard label="Best Score" value={`${summary.bestScore.toFixed(1)}%`} hint="Highest score logged" tone={metricTone(summary.bestScore, 80, 55)} icon={<Trophy size={18} />} />
                <SummaryCard label="Accuracy" value={`${summary.accuracy.toFixed(1)}%`} hint="Average accuracy" tone={metricTone(summary.accuracy)} icon={<Target size={18} />} />
                <SummaryCard label="Weakest Section" value={summary.weakestSection?.name ?? '--'} hint={summary.weakestSection ? `${summary.weakestSection.averageScore.toFixed(1)}% avg score` : 'No section data'} tone="weak" icon={<TrendingDown size={18} />} />
                <SummaryCard label="Strongest Section" value={summary.strongestSection?.name ?? '--'} hint={summary.strongestSection ? `${summary.strongestSection.averageScore.toFixed(1)}% avg score` : 'No section data'} tone="good" icon={<TrendingUp size={18} />} />
              </div>
            </SectionFrame>

            <SectionFrame eyebrow="2. Visual Analysis" title="Trends over raw numbers">
              <div className="analysis-chart-grid">
                <Suspense fallback={<ChartLoader />}>
                  <ChartCard title="Score Trend">
                    <ScoreTrendChart data={summary.scoreTrend} />
                  </ChartCard>
                  <ChartCard title="Accuracy Trend">
                    <AccuracyTrendChart data={summary.scoreTrend} />
                  </ChartCard>
                  <ChartCard title="Section Performance">
                    <SectionPerformanceChart data={summary.sectionChart} />
                  </ChartCard>
                  <ChartCard title="Attempt vs Accuracy">
                    <AttemptAccuracyChart data={summary.scoreTrend} />
                  </ChartCard>
                </Suspense>
              </div>
            </SectionFrame>

            <SectionFrame eyebrow="3. Insights" title="What to act on next">
              <div className="analysis-insights-grid">
                {insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)}
              </div>
            </SectionFrame>

            <SectionFrame eyebrow="4. Detailed Breakdown" title="Everything else, organized">
              <div className="analysis-detail-stack">
                <DetailPanel title="Section-wise performance" icon={<BarChart3 size={18} />} defaultOpen={isDesktop}>
                  <div className="analysis-table">
                    {summary.sectionRows.map((row) => (
                      <div key={row.name} className="analysis-table-row">
                        <strong>{row.name}</strong>
                        <span>{row.averageScore.toFixed(1)}% avg score</span>
                        <span>{row.averageAccuracy.toFixed(1)}% avg accuracy</span>
                        <span>{row.attempts} attempts</span>
                      </div>
                    ))}
                  </div>
                </DetailPanel>

                <DetailPanel title="Time analysis" icon={<Clock3 size={18} />} defaultOpen={isDesktop}>
                  <div className="analysis-mini-grid">
                    <SummaryCard label="Avg Time" value={`${summary.averageTime.toFixed(1)}m`} hint="Per mock" tone="neutral" icon={<Clock3 size={18} />} />
                    <SummaryCard label="Attempt Rate" value={`${summary.attemptRate.toFixed(1)}%`} hint="Attempted vs total" tone={metricTone(summary.attemptRate, 80, 55)} icon={<Target size={18} />} />
                  </div>
                </DetailPanel>

                <DetailPanel title="Attempt accuracy" icon={<Crosshair size={18} />} defaultOpen={isDesktop}>
                  <div className="analysis-table">
                    {orderedMocks.slice(-8).reverse().map((mock) => (
                      <div key={mock.id} className="analysis-table-row">
                        <strong>{formatMockTitle(mock)}</strong>
                        <span>{mock.overall.attempted}/{mock.overall.total} attempted</span>
                        <span>{mock.overall.accuracy.toFixed(1)}% accuracy</span>
                        <span>{formatShortDate(mock.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </DetailPanel>

                <DetailPanel title="Historical mock list" icon={<CalendarDays size={18} />} defaultOpen={isDesktop}>
                  <div className="analysis-history-list">
                    {orderedMocks.slice().reverse().map((mock) => (
                      <article key={mock.id} className="analysis-history-item">
                        <div>
                          <strong>{formatMockTitle(mock)}</strong>
                          <span>{formatShortDate(mock.createdAt)}</span>
                        </div>
                        <div>
                          <strong>{mock.overall.score}/{mock.overall.total}</strong>
                          <span>{mock.overall.accuracy.toFixed(1)}% acc</span>
                        </div>
                        <div>
                          <strong>{mock.overall.time}m</strong>
                          <span>{mock.overall.rank && mock.overall.rank > 0 ? `Rank ${mock.overall.rank}` : 'No rank'}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </DetailPanel>
              </div>
            </SectionFrame>
          </>
        )}
      </main>
    </>
  )
}
