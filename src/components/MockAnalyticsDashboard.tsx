import { useMemo, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts'
import { TrendingUp, AlertTriangle, Target, Award } from 'lucide-react'
import type { FullMockDoc, MockDoc } from '../types'

type Props = {
  tier1Mocks: FullMockDoc[]
  tier2Mocks: FullMockDoc[]
  sectionalMocks: MockDoc[]
}

type Filter = 'tier1' | 'tier2' | 'sectional'

const filters: Array<{ key: Filter; label: string }> = [
  { key: 'tier1', label: 'Tier 1' },
  { key: 'tier2', label: 'Tier 2' },
  { key: 'sectional', label: 'Sectional' },
]

function MockTooltip({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <div key={item.name} className="chart-tooltip-row">
          <span className="chart-tooltip-dot" style={{ backgroundColor: item.color }} />
          <span>{item.name}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

export function MockAnalyticsDashboard({ tier1Mocks, tier2Mocks, sectionalMocks }: Props) {
  const [filter, setFilter] = useState<Filter>('tier1')

  const filteredMocks = useMemo(() => {
    if (filter === 'tier1') return tier1Mocks
    if (filter === 'tier2') return tier2Mocks
    return sectionalMocks
  }, [filter, tier1Mocks, tier2Mocks, sectionalMocks])

  const latestMock = filteredMocks[filteredMocks.length - 1]

  // Calculate trend data
  const trendData = useMemo(() => {
    return filteredMocks.slice(-5).map((mock, index) => {
      const overall = 'overall' in mock ? mock.overall : mock
      return {
        label: `${mock.dayKey.slice(5)} ${index + 1}`,
        score: overall.score,
        accuracy: overall.accuracy,
        percentile: overall.percentile || 0,
      }
    })
  }, [filteredMocks])

  // Calculate sectional breakdown
  const sectionalData = useMemo(() => {
    if (filter === 'sectional') {
      return sectionalMocks.map((mock) => {
        if (mock.type === 'sectional') {
          return {
            name: mock.subject,
            score: mock.overall.score,
            accuracy: mock.overall.accuracy,
            total: mock.overall.total,
          }
        }
        return {
          name: mock.label,
          score: mock.overall.score,
          accuracy: mock.overall.accuracy,
          total: mock.overall.total,
        }
      })
    }
    // For tier mocks, calculate section averages
    const sections = ['Quant', 'Reasoning', 'English', 'GA']
    return sections.map((section) => {
      const sectionMocks = filteredMocks.filter((m): m is FullMockDoc => 'sections' in m && m.sections.some((s) => s.name === section))
      if (sectionMocks.length === 0) {
        return { name: section, score: 0, accuracy: 0, total: 50 }
      }
      const totalScore = sectionMocks.reduce((sum, m) => {
        const sec = m.sections.find((s) => s.name === section)
        return sum + (sec?.score || 0)
      }, 0)
      const totalAccuracy = sectionMocks.reduce((sum, m) => {
        const sec = m.sections.find((s) => s.name === section)
        return sum + (sec?.accuracy || 0)
      }, 0)
      return {
        name: section,
        score: Math.round(totalScore / sectionMocks.length),
        accuracy: Math.round(totalAccuracy / sectionMocks.length),
        total: 50,
      }
    })
  }, [filter, filteredMocks, sectionalMocks])

  // Calculate improvement trend
  const improvement = useMemo(() => {
    if (trendData.length < 2) return 0
    const recent = trendData[trendData.length - 1].score
    const previous = trendData[trendData.length - 2].score
    return recent - previous
  }, [trendData])

  // Identify weak areas
  const weakAreas = useMemo(() => {
    return sectionalData
      .filter((s) => s.accuracy < 60)
      .map((s) => s.name)
      .slice(0, 3)
  }, [sectionalData])

  if (filteredMocks.length === 0) {
    return (
      <section className="card mock-analytics-card">
        <div className="card-head">
          <h2>Mock Analytics</h2>
        </div>
        <p className="muted">No mock data yet. Attempt your first mock!</p>
      </section>
    )
  }

  const overall = 'overall' in (latestMock || {}) ? (latestMock as FullMockDoc).overall : (latestMock as MockDoc)?.overall

  return (
    <section className="mock-analytics-section">
      {/* Main Mock Performance */}
      <article className="card mock-main-card">
        <div className="card-head">
          <h2>🎯 Mock Summary</h2>
          <div className="mock-filters">
            {filters.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`mock-filter-btn ${filter === item.key ? 'active' : ''}`}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mock-summary-grid">
          <div className="mock-summary-item">
            <div className="summary-icon">
              <Target size={24} />
            </div>
            <div className="summary-content">
              <span className="summary-label">Score</span>
              <strong className="summary-value">{overall?.score || 0} / {overall?.total || 200}</strong>
            </div>
          </div>

          <div className="mock-summary-item">
            <div className="summary-icon">
              <Award size={24} />
            </div>
            <div className="summary-content">
              <span className="summary-label">Accuracy</span>
              <strong className="summary-value">{overall?.accuracy || 0}%</strong>
            </div>
          </div>

          <div className="mock-summary-item">
            <div className="summary-icon">
              <TrendingUp size={24} />
            </div>
            <div className="summary-content">
              <span className="summary-label">Percentile</span>
              <strong className="summary-value">{overall?.percentile || 0}%</strong>
            </div>
          </div>

          <div className="mock-summary-item">
            <div className="summary-icon trend-icon">
              <TrendingUp size={24} />
            </div>
            <div className="summary-content">
              <span className="summary-label">Trend</span>
              <strong className={`summary-value ${improvement >= 0 ? 'positive' : 'negative'}`}>
                {improvement >= 0 ? `↑ +${improvement}` : `↓ ${improvement}`}
              </strong>
            </div>
          </div>
        </div>

        <div className="mock-trend-chart">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
              <Tooltip content={<MockTooltip />} />
              <Line type="monotone" dataKey="score" stroke="#00E6A8" strokeWidth={3} dot={false} name="Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mock-insight">
          <span className="insight-text">
            {improvement > 0 
              ? 'You are improving in score. Keep up the momentum!' 
              : improvement < 0 
              ? 'Score dipped. Analyze weak areas and practice more.' 
              : 'Score stable. Focus on accuracy improvement.'}
          </span>
        </div>
      </article>

      {/* Sectional Analysis */}
      <article className="card mock-sectional-card">
        <div className="card-head">
          <h2>🧩 Sectional Analysis</h2>
        </div>

        <div className="sectional-grid">
          {sectionalData.map((section) => (
            <div key={section.name} className="sectional-item">
              <div className="sectional-header">
                <span className="sectional-name">{section.name}</span>
                <span className={`sectional-status ${section.accuracy >= 70 ? 'good' : section.accuracy >= 50 ? 'warning' : 'bad'}`}>
                  {section.accuracy >= 70 ? '✅' : section.accuracy >= 50 ? '⚠' : '❌'}
                </span>
              </div>
              <div className="sectional-metrics">
                <span className="sectional-score">{section.score}/{section.total}</span>
                <span className="sectional-accuracy">Accuracy: {section.accuracy}%</span>
              </div>
            </div>
          ))}
        </div>

        {weakAreas.length > 0 && (
          <div className="weak-areas-section">
            <div className="weak-areas-header">
              <AlertTriangle size={18} />
              <span>⚠ Weak Topics</span>
            </div>
            <div className="weak-areas-list">
              {weakAreas.map((area) => (
                <span key={area} className="weak-area-tag">{area}</span>
              ))}
            </div>
          </div>
        )}

        <div className="mock-recommendation">
          <span className="recommendation-title">🔥 Focus Next:</span>
          <ul className="recommendation-list">
            {weakAreas.length > 0 ? (
              <>
                <li>2 {weakAreas[0]} sectional mocks</li>
                <li>1 {weakAreas[1] || 'English'} grammar revision</li>
              </>
            ) : (
              <>
                <li>1 full-length mock test</li>
                <li>Review previous mistakes</li>
              </>
            )}
          </ul>
        </div>
      </article>
    </section>
  )
}
