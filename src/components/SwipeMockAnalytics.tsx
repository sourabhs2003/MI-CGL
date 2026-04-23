import { useState, useMemo } from 'react'
import { TrendingUp, AlertTriangle, Award, Target } from 'lucide-react'
import type { MockDoc } from '../types'
import { splitMocks } from '../lib/mockAnalytics'

type Props = {
  mocks: MockDoc[]
}

type MockCard = 'overall' | 'trend' | 'sectional' | 'weak'

export function SwipeMockAnalytics({ mocks }: Props) {
  const [activeCard, setActiveCard] = useState<MockCard>('overall')
  const { tier1Mocks, tier2Mocks, sectionalMocks } = useMemo(() => splitMocks(mocks), [mocks])
  const allMocks = [...tier1Mocks, ...tier2Mocks, ...sectionalMocks]

  const latestMock = allMocks[allMocks.length - 1]
  const avgScore = allMocks.length > 0 
    ? Math.round(allMocks.reduce((sum, m) => sum + m.overall.score, 0) / allMocks.length)
    : 0
  const avgAccuracy = allMocks.length > 0
    ? Math.round(allMocks.reduce((sum, m) => sum + m.overall.accuracy, 0) / allMocks.length)
    : 0

  // Calculate sectional data from real mocks
  const sectionalData = useMemo(() => {
    if (allMocks.length === 0) return []
    
    const sectionMap = new Map<string, { score: number; total: number; count: number }>()
    
    for (const mock of allMocks) {
      if ('sections' in mock) {
        for (const section of mock.sections) {
          const existing = sectionMap.get(section.name) || { score: 0, total: 0, count: 0 }
          sectionMap.set(section.name, {
            score: existing.score + section.score,
            total: existing.total + section.total,
            count: existing.count + 1,
          })
        }
      }
    }
    
    return [...sectionMap.entries()].map(([name, data]) => ({
      name,
      score: data.score,
      total: data.total,
      accuracy: Math.round((data.score / data.total) * 100),
    }))
  }, [allMocks])

  // Identify weak areas from real data
  const weakAreas = useMemo(() => {
    if (sectionalData.length === 0) return []
    return sectionalData
      .filter((s) => s.accuracy < 60)
      .sort((a, b) => a.accuracy - b.accuracy)
      .map((s) => s.name)
  }, [sectionalData])

  const cards: Array<{ key: MockCard; label: string; icon: any }> = [
    { key: 'overall', label: 'Overall', icon: Award },
    { key: 'trend', label: 'Trend', icon: TrendingUp },
    { key: 'sectional', label: 'Sectional', icon: Target },
    { key: 'weak', label: 'Weak Areas', icon: AlertTriangle },
  ]

  if (allMocks.length === 0) {
    return (
      <section className="swipe-mock-analytics">
        <div className="mock-card empty-state">
          <p className="muted">No mock data available. Take a mock test to see analytics.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="swipe-mock-analytics">
      <div className="mock-card-indicators">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <button
              key={card.key}
              type="button"
              className={`mock-indicator ${activeCard === card.key ? 'active' : ''}`}
              onClick={() => setActiveCard(card.key)}
            >
              <Icon size={14} />
            </button>
          )
        })}
      </div>

      <div className="mock-card-container">
        {activeCard === 'overall' && (
          <div className="mock-card">
            <div className="mock-card-header">
              <span className="card-label">Overall Performance</span>
            </div>
            <div className="mock-stats">
              <div className="mock-stat">
                <span className="stat-label">Score</span>
                <strong className="stat-value">{latestMock?.overall.score ?? 0}/{latestMock?.overall.total ?? 200}</strong>
              </div>
              <div className="mock-stat">
                <span className="stat-label">Accuracy</span>
                <strong className="stat-value">{latestMock?.overall.accuracy ?? avgAccuracy}%</strong>
              </div>
              <div className="mock-stat">
                <span className="stat-label">Percentile</span>
                <strong className="stat-value">{latestMock?.overall.percentile ?? 0}%</strong>
              </div>
            </div>
          </div>
        )}

        {activeCard === 'trend' && (
          <div className="mock-card">
            <div className="mock-card-header">
              <span className="card-label">Score Trend</span>
            </div>
            <div className="trend-summary">
              <span className="trend-label">Average Score</span>
              <strong className="trend-value">{avgScore}</strong>
            </div>
            <div className="trend-bars">
              {allMocks.slice(-5).map((mock, index) => {
                const percentage = (mock.overall.score / mock.overall.total) * 100
                return (
                  <div key={index} className="trend-bar-wrapper">
                    <div 
                      className="trend-bar" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeCard === 'sectional' && (
          <div className="mock-card">
            <div className="mock-card-header">
              <span className="card-label">Sectional Performance</span>
            </div>
            {sectionalData.length > 0 ? (
              <div className="sectional-list">
                {sectionalData.map((section) => (
                  <div key={section.name} className="sectional-item">
                    <div className="section-info">
                      <span className="section-name">{section.name}</span>
                      <span className="section-accuracy">{section.accuracy}%</span>
                    </div>
                    <strong className="section-score">{section.score}/{section.total}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No sectional data available</p>
            )}
          </div>
        )}

        {activeCard === 'weak' && (
          <div className="mock-card">
            <div className="mock-card-header">
              <span className="card-label">Weak Areas</span>
            </div>
            {weakAreas.length > 0 ? (
              <div className="weak-list">
                {weakAreas.map((area, index) => (
                  <div key={index} className="weak-tag">
                    {area}
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">No weak areas identified. Good job!</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
