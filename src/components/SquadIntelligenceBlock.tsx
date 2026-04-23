import { Activity, ShieldAlert, TrendingUp, Trophy } from 'lucide-react'

type Props = {
  healthScore: number
  healthLabel: string
  weeklyTrend: { currentWeekHours: number; lastWeekHours: number } | null
  leaderName: string | null
  atRiskName: string | null
}

function getTrendLabel(weeklyTrend: { currentWeekHours: number; lastWeekHours: number } | null) {
  if (!weeklyTrend || weeklyTrend.lastWeekHours <= 0) return 'No data'
  const pct = Math.round(((weeklyTrend.currentWeekHours - weeklyTrend.lastWeekHours) / weeklyTrend.lastWeekHours) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

function getHealthTone(healthLabel: string) {
  if (healthLabel === 'Good') return 'good'
  if (healthLabel === 'Critical') return 'critical'
  return 'steady'
}

export function SquadIntelligenceBlock(props: Props) {
  const { healthScore, healthLabel, weeklyTrend, leaderName, atRiskName } = props
  const trendLabel = getTrendLabel(weeklyTrend)

  return (
    <section className="squad-shell squad-intelligence-compact">
      <div className="squad-section-head">
        <strong>Squad Intelligence</strong>
      </div>

      <div className="squad-intelligence-grid">
        <div className={`squad-intelligence-card ${getHealthTone(healthLabel)}`}>
          <span>Health</span>
          <strong>{healthScore}</strong>
          <small>{healthLabel}</small>
          <Activity size={14} />
        </div>

        <div className="squad-intelligence-card">
          <span>Trend</span>
          <strong>{trendLabel}</strong>
          <small>vs last week</small>
          <TrendingUp size={14} />
        </div>

        <div className="squad-intelligence-card">
          <span>Leader</span>
          <strong>{leaderName ?? 'No data'}</strong>
          <small>Current front-runner</small>
          <Trophy size={14} />
        </div>

        <div className="squad-intelligence-card">
          <span>At Risk</span>
          <strong>{atRiskName ?? 'No data'}</strong>
          <small>Needs attention</small>
          <ShieldAlert size={14} />
        </div>
      </div>
    </section>
  )
}
