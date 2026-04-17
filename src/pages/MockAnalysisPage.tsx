import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useMocks } from '../hooks/useFirestoreData'
import {
  buildFullSectionBreakdown,
  buildMockScoreTrend,
  buildSectionalImprovementTracking,
  buildSectionalSubjectPerformance,
  getLatestMock,
  splitMocks,
} from '../lib/mockAnalytics'
import type { MockDoc } from '../types'
import { generateMockInsights, type MockInsights } from '../services/mockInsights'

type DashboardTab = 'full' | 'sectional'

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

const emptyInsights: MockInsights = {
  strengths: [],
  weaknesses: [],
  actionPlan: 'Add more mocks to unlock AI feedback.',
}

export function MockAnalysisPage() {
  const { user } = useAuth()
  const mocks = useMocks(user?.uid)
  const [tab, setTab] = useState<DashboardTab>('full')
  const [insights, setInsights] = useState<MockInsights>(emptyInsights)

  const { fullMocks, sectionalMocks } = useMemo(() => splitMocks(mocks), [mocks])
  const scopedMocks: MockDoc[] = tab === 'full' ? fullMocks : sectionalMocks
  const latestMock = useMemo(() => getLatestMock(scopedMocks), [scopedMocks])
  const scoreTrend = useMemo(
    () => buildMockScoreTrend(scopedMocks, (mock, index) => `${mock.dayKey.slice(5)} ${index + 1}`, 8),
    [scopedMocks],
  )
  const sectionRows = useMemo(
    () => (tab === 'full' ? buildFullSectionBreakdown(fullMocks) : buildSectionalSubjectPerformance(sectionalMocks)),
    [fullMocks, sectionalMocks, tab],
  )
  const sectionalImprovement = useMemo(() => buildSectionalImprovementTracking(sectionalMocks), [sectionalMocks])
  const latestImprovement = scoreTrend.at(-1)?.improvement ?? 0

  useEffect(() => {
    let active = true
    void generateMockInsights(mocks, tab).then((value) => {
      if (active) setInsights(value)
    })
    return () => {
      active = false
    }
  }, [mocks, tab])

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Mocks</p>
        <div className="page-head-row">
          <h1>Analysis</h1>
          <Link to="/mocks" className="btn ghost sm">
            Entry
          </Link>
        </div>
      </header>

      <div className="analytics-tabs" role="tablist" aria-label="Mock analytics type">
        <button type="button" className={tab === 'full' ? 'analytics-tab active' : 'analytics-tab'} onClick={() => setTab('full')}>
          Full Mock
        </button>
        <button type="button" className={tab === 'sectional' ? 'analytics-tab active' : 'analytics-tab'} onClick={() => setTab('sectional')}>
          Sectional
        </button>
      </div>

      {scopedMocks.length === 0 ? (
        <section className="card">
          <h2>{tab === 'full' ? 'Full Mock' : 'Sectional'}</h2>
        </section>
      ) : (
        <main className="mock-analysis-grid">
          <section className="card mock-overview-card">
            <div className="summary-grid">
              <div className="summary-card">
                <span className="summary-label">Latest Score</span>
                <strong className="summary-value">{latestMock ? `${latestMock.overall.score} / ${latestMock.overall.total}` : '0 / 0'}</strong>
              </div>
              <div className="summary-card">
                <span className="summary-label">Improvement</span>
                <strong className="summary-value">{latestImprovement >= 0 ? `+${latestImprovement}` : latestImprovement}</strong>
              </div>
              <div className="summary-card">
                <span className="summary-label">Accuracy</span>
                <strong className="summary-value">{latestMock?.overall.accuracy ?? 0}%</strong>
              </div>
              <div className="summary-card">
                <span className="summary-label">Attempted</span>
                <strong className="summary-value">{latestMock?.overall.attempted ?? 0}</strong>
              </div>
            </div>
          </section>

          <section className="card chart-card wide">
            <div className="card-head">
              <h2>Score Trend</h2>
            </div>
            <div className="chart-scroll">
              <div className="chart-panel">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={scoreTrend}>
                    <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="#7f8ea3" axisLine={false} tickLine={false} />
                    <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={3} dot={false} name="Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Accuracy</h2>
            </div>
            <div className="chart-scroll">
              <div className="chart-panel compact">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={scoreTrend}>
                    <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="#7f8ea3" axisLine={false} tickLine={false} />
                    <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="accuracy" stroke="#38bdf8" strokeWidth={3} dot={false} name="Accuracy" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Scores</h2>
            </div>
            <div className="chart-scroll">
              <div className="chart-panel compact">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreTrend}>
                    <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
                    <XAxis dataKey="label" stroke="#7f8ea3" axisLine={false} tickLine={false} />
                    <YAxis stroke="#7f8ea3" axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="score" fill="#f59e0b" radius={[10, 10, 0, 0]} name="Score" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h2>Sections</h2>
            </div>
            <div className="subject-strength-list">
              {sectionRows.map((item) => (
                <div key={item.name} className="subject-strength-row">
                  <strong>{item.name}</strong>
                  <span className="subject-strength-metrics">
                    {tab === 'full' ? `${item.avgScorePct.toFixed(1)}%` : `${item.avgScorePct.toFixed(1)}%`} • {item.avgAccuracy.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          {tab === 'sectional' ? (
            <section className="card">
              <div className="card-head">
                <h2>Improvement</h2>
              </div>
              <ul className="weak-list">
                {sectionalImprovement.map((item) => (
                  <li key={item.subject}>
                    <strong>{item.subject}</strong> <span className="muted">{item.improvement >= 0 ? '+' : ''}{item.improvement.toFixed(1)} score</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="card chart-card wide">
            <div className="card-head">
              <h2>AI</h2>
            </div>
            <div className="insights-grid">
              <div className="insight-column">
                <ul className="insight-list">
                  {insights.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="insight-column">
                <ul className="insight-list">
                  {insights.weaknesses.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="insight-column action">
                <p className="analytics-insight-text">{insights.actionPlan}</p>
              </div>
            </div>
          </section>
        </main>
      )}
    </>
  )
}
