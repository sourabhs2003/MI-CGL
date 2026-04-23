import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useMocks } from '../hooks/useFirestoreData'
import { normalizeScore, sortMocksChronologically, splitMocks } from '../lib/mockAnalytics'
import { toMillis } from '../lib/firestoreTime'
import type { FullMockDoc, MockDoc, SectionName, SectionalMockDoc } from '../types'

type DashboardTab = 'full' | 'sectional'
type SectionalSubjectKey = 'Maths' | 'Reasoning' | 'English' | 'GS'
type SubjectStatus = 'Weak' | 'Improving' | 'Strong'

type MetricStripItem = {
  label: string
  value: string
  hint?: string
}

type TrendPoint = {
  id: string
  label: string
  dateLabel: string
  score: number
  accuracy: number
  attempted: number
  total: number
  percentile: number | null
}

type FullSectionRow = {
  name: string
  averageScore: number
  averageAccuracy: number
  latestScore: number
}

type SubjectInsight = {
  title: string
  body: string
}

type SectionalSubjectSummary = {
  key: SectionalSubjectKey
  label: string
  mocks: SectionalMockDoc[]
  trend: TrendPoint[]
  metrics: MetricStripItem[]
  status: SubjectStatus
  statusDetail: string
  insights: SubjectInsight[]
}

type FullMockSummary = {
  metrics: MetricStripItem[]
  scoreTrend: TrendPoint[]
  accuracyTrend: TrendPoint[]
  contributionData: Array<{ name: string; score: number }>
  sectionRows: FullSectionRow[]
  strongest?: FullSectionRow
  weakest?: FullSectionRow
}

type QuickInsight = {
  label: string
  value: string
  detail: string
}

const sectionalSubjects: Array<{ key: SectionalSubjectKey; label: string }> = [
  { key: 'Maths', label: 'Quant' },
  { key: 'Reasoning', label: 'Reasoning' },
  { key: 'English', label: 'English' },
  { key: 'GS', label: 'GS' },
]

const fullSectionDisplayMap: Record<SectionName, string> = {
  Maths: 'Quant',
  Reasoning: 'Reasoning',
  English: 'English',
  GA: 'GS',
}

function formatShortDate(value: unknown) {
  const millis = toMillis(value)
  if (!millis) return '--'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(millis))
}

function formatScore(score: number, total: number) {
  return `${Math.round(score)} / ${Math.round(total)}`
}

function formatPercentage(value: number) {
  return `${value.toFixed(1)}%`
}

function average(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function averageAttemptRate(points: TrendPoint[]) {
  if (!points.length) return 0
  return average(points.map((point) => (point.total > 0 ? (point.attempted / point.total) * 100 : 0)))
}

function scoreRange(points: TrendPoint[]) {
  if (!points.length) return 0
  const scores = points.map((point) => point.score)
  return Math.max(...scores) - Math.min(...scores)
}

function buildTrendPoints<T extends MockDoc>(mocks: T[]): TrendPoint[] {
  return sortMocksChronologically(mocks).map((mock) => ({
    id: mock.id,
    label: formatShortDate(mock.createdAt),
    dateLabel: formatShortDate(mock.createdAt),
    score: mock.overall.score,
    accuracy: mock.overall.accuracy,
    attempted: mock.overall.attempted,
    total: mock.overall.total,
    percentile: mock.overall.percentile ?? null,
  }))
}

function deriveSubjectStatus(points: TrendPoint[]): { status: SubjectStatus; detail: string } {
  if (!points.length) {
    return { status: 'Weak', detail: 'No attempts yet in this subject.' }
  }

  const latest = points.at(-1)!
  const first = points[0]!
  const recentWindow = points.slice(-3)
  const scoreDelta = latest.score - first.score
  const accuracyDelta = latest.accuracy - first.accuracy
  const consistencyBand = scoreRange(recentWindow)

  if (latest.accuracy >= 75 && normalizeScore(latest.score, latest.total) >= 70 && consistencyBand <= 8) {
    return { status: 'Strong', detail: 'Scores are holding steady with solid accuracy.' }
  }

  if (scoreDelta >= 5 || accuracyDelta >= 6) {
    return { status: 'Improving', detail: 'Recent attempts show upward movement in output or control.' }
  }

  return { status: 'Weak', detail: 'This subject still needs sharper conversion and steadier accuracy.' }
}

function buildSubjectInsights(subjectLabel: string, points: TrendPoint[]): SubjectInsight[] {
  if (!points.length) {
    return [
      {
        title: 'Start signal',
        body: `Log a few ${subjectLabel} mocks to unlock subject-level trend detection.`,
      },
    ]
  }

  const latest = points.at(-1)!
  const first = points[0]!
  const recentWindow = points.slice(-3)
  const latestScorePct = normalizeScore(latest.score, latest.total)
  const firstScorePct = normalizeScore(first.score, first.total)
  const avgAttempted = average(points.map((point) => point.attempted))
  const avgAccuracy = average(points.map((point) => point.accuracy))
  const attemptDelta = latest.attempted - first.attempted
  const accuracyDelta = latest.accuracy - first.accuracy
  const scoreDelta = latestScorePct - firstScorePct
  const stagnating = recentWindow.length >= 3 && scoreRange(recentWindow) <= 3

  const attemptInsight =
    attemptDelta >= 4 && accuracyDelta >= 0
      ? 'You are taking on more questions without losing control, which usually signals better pacing.'
      : attemptDelta >= 4 && accuracyDelta < 0
        ? 'Attempts are rising faster than accuracy, so speed is outpacing precision right now.'
        : avgAccuracy >= 80 && avgAttempted <= latest.total * 0.72
          ? 'Accuracy is healthy, but attempt volume is still conservative and leaving marks on the table.'
          : 'Attempts and accuracy are moving together in a fairly stable way.'

  const trendInsight =
    scoreDelta >= 8
      ? 'The score trend is clearly moving upward across your recent attempts.'
      : scoreDelta <= -5
        ? 'Recent performance has dipped, so this subject needs a reset before it compounds.'
        : stagnating
          ? 'Scores are flat across recent attempts, which points to stagnation rather than randomness.'
          : 'Progress is present, but the trend is not strong enough to feel locked in yet.'

  const patternInsight =
    latest.accuracy >= avgAccuracy + 5
      ? `The latest ${subjectLabel} attempt shows cleaner decision-making than your usual baseline.`
      : latestScorePct >= firstScorePct + 6
        ? 'The latest paper converted better than your early attempts, so practice is paying off.'
        : latest.accuracy < avgAccuracy - 5
          ? 'The latest attempt slipped below your normal control level, so review misses before the next mock.'
          : 'Your current pattern is stable, so the next gain will likely come from tighter review after each test.'

  return [
    { title: 'Attempts vs accuracy', body: attemptInsight },
    { title: 'Trend read', body: trendInsight },
    { title: 'Pattern to act on', body: patternInsight },
  ]
}

function buildSectionalSubjectSummary(subject: SectionalSubjectKey, label: string, mocks: SectionalMockDoc[]): SectionalSubjectSummary {
  const ordered = sortMocksChronologically(mocks.filter((mock) => mock.subject === subject))
  const trend = buildTrendPoints(ordered)
  const latest = ordered.at(-1)
  const percentages = ordered.map((mock) => normalizeScore(mock.overall.score, mock.overall.total))
  const percentiles = ordered
    .map((mock) => mock.overall.percentile)
    .filter((value): value is number => typeof value === 'number')
  const bestScorePct = percentages.length ? Math.max(...percentages) : 0
  const averageScorePct = average(percentages)
  const latestPercentile = latest?.overall.percentile
  const bestPercentile = percentiles.length ? Math.max(...percentiles) : null
  const averagePercentile = percentiles.length ? average(percentiles) : null
  const status = deriveSubjectStatus(trend)

  return {
    key: subject,
    label,
    mocks: ordered,
    trend,
    metrics: [
      {
        label: 'Latest Score',
        value: latest ? formatScore(latest.overall.score, latest.overall.total) : '--',
        hint: latest ? formatPercentage(normalizeScore(latest.overall.score, latest.overall.total)) : 'No attempts',
      },
      {
        label: 'Best Score',
        value: percentages.length ? formatPercentage(bestScorePct) : '--',
        hint: latest ? `Best of ${ordered.length}` : undefined,
      },
      {
        label: 'Average Score',
        value: percentages.length ? formatPercentage(averageScorePct) : '--',
        hint:
          averagePercentile != null
            ? `${formatPercentage(averagePercentile)} avg percentile`
            : ordered.length
              ? `${ordered.length} attempts`
              : undefined,
      },
      {
        label: 'Percentile',
        value: latestPercentile != null ? formatPercentage(latestPercentile) : '--',
        hint: bestPercentile != null ? `Best ${formatPercentage(bestPercentile)}` : 'Percentile not logged',
      },
      {
        label: 'Total Attempts',
        value: String(ordered.length),
        hint: ordered.length ? `Latest ${formatShortDate(latest?.createdAt)}` : 'Start with one mock',
      },
    ],
    status: status.status,
    statusDetail: status.detail,
    insights: buildSubjectInsights(label, trend),
  }
}

function buildFullMockSummary(mocks: FullMockDoc[]): FullMockSummary {
  const ordered = sortMocksChronologically(mocks)
  const latest = ordered.at(-1)
  const scorePercentages = ordered.map((mock) => normalizeScore(mock.overall.score, mock.overall.total))
  const percentiles = ordered
    .map((mock) => mock.overall.percentile)
    .filter((value): value is number => typeof value === 'number')
  const scoreTrend = buildTrendPoints(ordered)
  const sectionBucket = new Map<string, { score: number; accuracy: number; count: number; latestScore: number }>()

  for (const mock of ordered) {
    for (const section of mock.sections) {
      const name = fullSectionDisplayMap[section.name]
      const current = sectionBucket.get(name) ?? { score: 0, accuracy: 0, count: 0, latestScore: 0 }
      current.score += normalizeScore(section.score, section.total)
      current.accuracy += section.accuracy
      current.count += 1
      current.latestScore = normalizeScore(section.score, section.total)
      sectionBucket.set(name, current)
    }
  }

  const sectionRows = [...sectionBucket.entries()]
    .map(([name, value]) => ({
      name,
      averageScore: Number((value.score / value.count).toFixed(1)),
      averageAccuracy: Number((value.accuracy / value.count).toFixed(1)),
      latestScore: Number(value.latestScore.toFixed(1)),
    }))
    .sort((a, b) => b.averageScore - a.averageScore)

  return {
    metrics: [
      {
        label: 'Latest Score',
        value: latest ? formatScore(latest.overall.score, latest.overall.total) : '--',
        hint: latest ? formatPercentage(normalizeScore(latest.overall.score, latest.overall.total)) : 'No mocks',
      },
      {
        label: 'Average Score',
        value: scorePercentages.length ? formatPercentage(average(scorePercentages)) : '--',
        hint: ordered.length ? `${ordered.length} mocks` : undefined,
      },
      {
        label: 'Percentile',
        value: latest?.overall.percentile != null ? formatPercentage(latest.overall.percentile) : '--',
        hint: percentiles.length ? `Avg ${formatPercentage(average(percentiles))}` : (latest?.exam ?? 'Latest full mock'),
      },
      {
        label: 'Rank',
        value:
          latest?.overall.rank != null
            ? latest.overall.rankTotal != null
              ? `${latest.overall.rank}/${latest.overall.rankTotal}`
              : String(latest.overall.rank)
            : '--',
        hint: latest?.overall.rank != null ? 'Latest full mock rank' : 'Rank not captured in current data',
      },
    ],
    scoreTrend,
    accuracyTrend: scoreTrend,
    contributionData: sectionRows.map((row) => ({ name: row.name, score: row.latestScore })),
    sectionRows,
    strongest: sectionRows[0],
    weakest: sectionRows.at(-1),
  }
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <section className="card mock-analysis-empty">
      <h2>{title}</h2>
      <p className="muted">{copy}</p>
    </section>
  )
}

function SegmentedToggle({
  value,
  onChange,
}: {
  value: DashboardTab
  onChange: (value: DashboardTab) => void
}) {
  return (
    <div className="mock-analysis-toggle" role="tablist" aria-label="Mock analysis mode">
      <button
        type="button"
        className={value === 'full' ? 'mock-analysis-toggle-btn active' : 'mock-analysis-toggle-btn'}
        onClick={() => onChange('full')}
      >
        Full Mock
      </button>
      <button
        type="button"
        className={value === 'sectional' ? 'mock-analysis-toggle-btn active' : 'mock-analysis-toggle-btn'}
        onClick={() => onChange('sectional')}
      >
        Sectional
      </button>
    </div>
  )
}

function MetricStrip({ items }: { items: MetricStripItem[] }) {
  return (
    <div className="mock-analysis-strip" role="list">
      {items.map((item) => (
        <article key={item.label} className="mock-analysis-strip-item" role="listitem">
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint ? <small>{item.hint}</small> : null}
        </article>
      ))}
    </div>
  )
}

function ChartShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className="mock-analysis-chart">
      <div className="mock-analysis-chart-head">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
      </div>
      <div className="mock-analysis-chart-body">{children}</div>
    </section>
  )
}

function ScoreTrendChart({ data, color }: { data: TrendPoint[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.09)" vertical={false} />
        <XAxis dataKey="label" stroke="#7f8ea3" axisLine={false} tickLine={false} />
        <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="score" stroke={color} strokeWidth={3} dot={false} name="Score" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function AccuracyTrendChart({ data, color }: { data: TrendPoint[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.09)" vertical={false} />
        <XAxis dataKey="label" stroke="#7f8ea3" axisLine={false} tickLine={false} />
        <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="accuracy" stroke={color} strokeWidth={3} dot={false} name="Accuracy" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function PercentileTrendChart({ data, color }: { data: TrendPoint[]; color: string }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.09)" vertical={false} />
        <XAxis dataKey="label" stroke="#7f8ea3" axisLine={false} tickLine={false} />
        <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} domain={[0, 100]} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="percentile" stroke={color} strokeWidth={3} dot={false} name="Percentile" connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}

function AttemptsChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.09)" vertical={false} />
        <XAxis dataKey="label" stroke="#7f8ea3" axisLine={false} tickLine={false} />
        <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Line type="monotone" dataKey="attempted" stroke="#f59e0b" strokeWidth={3} dot={false} name="Attempted" />
        <Line type="monotone" dataKey="total" stroke="#64748b" strokeWidth={2} dot={false} name="Total" />
      </LineChart>
    </ResponsiveContainer>
  )
}

function ContributionChart({ data }: { data: Array<{ name: string; score: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.09)" vertical={false} />
        <XAxis dataKey="name" stroke="#7f8ea3" axisLine={false} tickLine={false} />
        <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="score" fill="#7c3aed" radius={[12, 12, 0, 0]} name="Latest score %" />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={`${item.name}-${item.value}`} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ backgroundColor: item.color }} />
          <span>{item.name}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

function FullMockView({ summary }: { summary: FullMockSummary }) {
  const latest = summary.scoreTrend.at(-1)
  const fullInsights: QuickInsight[] = [
    {
      label: 'Latest Pulse',
      value: latest ? `${normalizeScore(latest.score, latest.total).toFixed(1)}%` : '--',
      detail: latest ? `${latest.attempted}/${latest.total} attempted with ${latest.accuracy.toFixed(1)}% accuracy` : 'Log one full mock to activate this panel.',
    },
    {
      label: 'Attempt Discipline',
      value: `${averageAttemptRate(summary.scoreTrend).toFixed(1)}%`,
      detail: latest ? `Latest attempt pace is ${latest.attempted}/${latest.total}` : 'No attempt history yet.',
    },
    {
      label: 'Section Gap',
      value:
        summary.strongest && summary.weakest
          ? `${(summary.strongest.averageScore - summary.weakest.averageScore).toFixed(1)} pts`
          : '--',
      detail:
        summary.strongest && summary.weakest
          ? `${summary.strongest.name} is currently ahead of ${summary.weakest.name}`
          : 'Need section data to compare strengths.',
    },
  ]

  return (
    <section className="mock-analysis-layout">
      <MetricStrip items={summary.metrics} />

      <section className="mock-analysis-quick-grid">
        {fullInsights.map((item) => (
          <article key={item.label} className="mock-analysis-quick-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.detail}</small>
          </article>
        ))}
      </section>

      <div className="mock-analysis-charts-grid">
        <ChartShell title="Score Trend" subtitle="See how full mock output is moving over time.">
          <ScoreTrendChart data={summary.scoreTrend} color="#16a34a" />
        </ChartShell>

        <ChartShell title="Accuracy Trend" subtitle="Keep accuracy separate so quality stays visible.">
          <AccuracyTrendChart data={summary.accuracyTrend} color="#0ea5e9" />
        </ChartShell>

        <ChartShell title="Percentile Trend" subtitle="Track how your standing is moving across full mocks.">
          <PercentileTrendChart data={summary.scoreTrend} color="#a855f7" />
        </ChartShell>

        <ChartShell title="Section Contribution" subtitle="Latest full mock contribution by section score percentage.">
          <ContributionChart data={summary.contributionData} />
        </ChartShell>
      </div>

      <section className="mock-analysis-section-compare">
        <div className="mock-analysis-chart-head">
          <div>
            <h2>Section Performance</h2>
            <p className="muted">All sections in one view, with strongest and weakest signals surfaced.</p>
          </div>
        </div>

        <div className="mock-analysis-section-callouts">
          <article className="mock-analysis-callout strong">
            <span>Strongest</span>
            <strong>{summary.strongest?.name ?? '--'}</strong>
            <small>{summary.strongest ? `${summary.strongest.averageScore.toFixed(1)}% avg score` : 'No data'}</small>
          </article>

          <article className="mock-analysis-callout weak">
            <span>Weakest</span>
            <strong>{summary.weakest?.name ?? '--'}</strong>
            <small>{summary.weakest ? `${summary.weakest.averageScore.toFixed(1)}% avg score` : 'No data'}</small>
          </article>
        </div>

        <div className="mock-analysis-table">
          {summary.sectionRows.map((row) => (
            <div key={row.name} className="mock-analysis-table-row compact">
              <strong>{row.name}</strong>
              <span>{row.averageScore.toFixed(1)}% avg score</span>
              <span>{row.averageAccuracy.toFixed(1)}% avg accuracy</span>
              <span>{row.latestScore.toFixed(1)}% latest</span>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

function StatusBadge({ status }: { status: SubjectStatus }) {
  return (
    <span className={`mock-analysis-status ${status.toLowerCase()}`}>{status}</span>
  )
}

function SectionalView({
  subjects,
  activeSubject,
  onSubjectChange,
}: {
  subjects: SectionalSubjectSummary[]
  activeSubject: SectionalSubjectKey
  onSubjectChange: (value: SectionalSubjectKey) => void
}) {
  const active = subjects.find((subject) => subject.key === activeSubject) ?? subjects[0]

  if (!active) {
    return <EmptyState title="No sectional data yet" copy="Log sectional mocks to unlock subject-wise tracking." />
  }

  const latest = active.trend.at(-1)
  const subjectPulse: QuickInsight[] = [
    {
      label: 'Latest Score',
      value: latest ? `${normalizeScore(latest.score, latest.total).toFixed(1)}%` : '--',
      detail: latest ? `${latest.score}/${latest.total} in the latest paper` : 'No attempts yet.',
    },
    {
      label: 'Attempt Rate',
      value: latest ? `${((latest.attempted / latest.total) * 100).toFixed(1)}%` : '--',
      detail: latest ? `${latest.attempted}/${latest.total} attempted` : 'No attempt history yet.',
    },
    {
      label: 'Avg Accuracy',
      value: active.trend.length ? `${average(active.trend.map((point) => point.accuracy)).toFixed(1)}%` : '--',
      detail: active.trend.length ? `Across ${active.trend.length} logged attempts` : 'Accuracy will appear after the first mock.',
    },
  ]

  return (
    <section className="mock-analysis-layout">
      <div className="mock-analysis-subject-tabs" role="tablist" aria-label="Sectional subject tabs">
        {subjects.map((subject) => (
          <button
            key={subject.key}
            type="button"
            className={subject.key === active.key ? 'mock-analysis-subject-tab active' : 'mock-analysis-subject-tab'}
            onClick={() => onSubjectChange(subject.key)}
          >
            {subject.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.section
          key={active.key}
          initial={{ opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -18 }}
          transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          className="mock-analysis-subject-panel"
        >
          <div className="mock-analysis-subject-head">
            <div>
              <p className="eyebrow">Sectional Analysis</p>
              <h2>{active.label}</h2>
            </div>
            <div className="mock-analysis-status-wrap">
              <StatusBadge status={active.status} />
              <p className="muted">{active.statusDetail}</p>
            </div>
          </div>

          <MetricStrip items={active.metrics} />

          <section className="mock-analysis-quick-grid">
            {subjectPulse.map((item) => (
              <article key={item.label} className="mock-analysis-quick-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </section>

          {!active.trend.length ? (
            <EmptyState title={`No ${active.label} mocks yet`} copy={`Add ${active.label} sectional attempts to see trends here.`} />
          ) : (
            <>
              <div className="mock-analysis-charts-grid">
                <ChartShell title="Score Trend" subtitle="Keep the score story isolated to this subject only.">
                  <ScoreTrendChart data={active.trend} color="#22c55e" />
                </ChartShell>

                <ChartShell title="Accuracy Trend" subtitle="Accuracy stays separate so precision remains visible.">
                  <AccuracyTrendChart data={active.trend} color="#38bdf8" />
                </ChartShell>

                <ChartShell title="Percentile Trend" subtitle="See whether this subject is climbing against the field over time.">
                  <PercentileTrendChart data={active.trend} color="#a855f7" />
                </ChartShell>

                <ChartShell title="Attempt Analysis" subtitle="Track attempted versus total questions over time.">
                  <AttemptsChart data={active.trend} />
                </ChartShell>
              </div>

              <section className="mock-analysis-ai-box">
                <div className="mock-analysis-chart-head">
                  <div>
                    <h2>AI Insight Box</h2>
                    <p className="muted">Meaningful, subject-specific analysis based on attempts, accuracy, and trend shape.</p>
                  </div>
                </div>
                <div className="mock-analysis-insights">
                  {active.insights.map((insight) => (
                    <article key={insight.title} className="mock-analysis-insight">
                      <span>{insight.title}</span>
                      <p>{insight.body}</p>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
        </motion.section>
      </AnimatePresence>
    </section>
  )
}

export function MockAnalysisPage() {
  const { user } = useAuth()
  const mocks = useMocks(user?.uid)
  const [tab, setTab] = useState<DashboardTab>('full')
  const [activeSubject, setActiveSubject] = useState<SectionalSubjectKey>('Maths')

  const { fullMocks, sectionalMocks } = useMemo(() => splitMocks(mocks), [mocks])
  const fullSummary = useMemo(() => buildFullMockSummary(fullMocks), [fullMocks])
  const sectionalSummaries = useMemo(
    () => sectionalSubjects.map((subject) => buildSectionalSubjectSummary(subject.key, subject.label, sectionalMocks)),
    [sectionalMocks],
  )

  useEffect(() => {
    const current = sectionalSummaries.find((subject) => subject.key === activeSubject)
    if (current?.mocks.length) return
    const firstAvailable = sectionalSummaries.find((subject) => subject.mocks.length)
    if (firstAvailable) {
      setActiveSubject(firstAvailable.key)
    }
  }, [activeSubject, sectionalSummaries])

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Mocks</p>
        <div className="page-head-row">
          <div>
            <h1>Mock Analysis</h1>
            <p className="muted">A lighter, chart-first analysis space with separate full-mock and subject-tracker modes.</p>
          </div>
          <Link to="/mocks" className="btn ghost sm">
            Entry
          </Link>
        </div>
      </header>

      <section className="mock-analysis-v2">
        <SegmentedToggle value={tab} onChange={setTab} />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          >
            {tab === 'full' ? (
              fullMocks.length ? (
                <FullMockView summary={fullSummary} />
              ) : (
                <EmptyState title="No full mocks yet" copy="Log full mocks to unlock score, accuracy, and section contribution tracking." />
              )
            ) : sectionalMocks.length ? (
              <SectionalView
                subjects={sectionalSummaries}
                activeSubject={activeSubject}
                onSubjectChange={setActiveSubject}
              />
            ) : (
              <EmptyState title="No sectional mocks yet" copy="Log subject-wise mocks to turn this page into a personal performance tracker." />
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </>
  )
}
