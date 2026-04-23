import { motion } from 'framer-motion'
import { TrendingDown, TrendingUp } from 'lucide-react'

type WeeklyTrendCardProps = {
  currentWeekHours: number
  lastWeekHours: number
}

export function WeeklyTrendCard({ currentWeekHours, lastWeekHours }: WeeklyTrendCardProps) {
  const diff = Number((currentWeekHours - lastWeekHours).toFixed(1))
  const percentage = lastWeekHours > 0 ? Math.round((diff / lastWeekHours) * 100) : 0
  const positive = diff >= 0

  return (
    <motion.section
      className="squad-shell squad-trend-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <div className="squad-card-head">
        <div>
          <p className="squad-kicker">Weekly Trend</p>
          <h3>{currentWeekHours.toFixed(1)}h this week</h3>
        </div>
        {positive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
      </div>

      <div className={`squad-trend-change ${positive ? 'positive' : 'negative'}`}>
        <strong>{positive ? '+' : ''}{percentage}%</strong>
        <span>{positive ? 'vs last week' : 'below last week'}</span>
      </div>

      <div className="squad-health-meta">
        <span>This week: {currentWeekHours.toFixed(1)}h</span>
        <span>Last week: {lastWeekHours.toFixed(1)}h</span>
      </div>
    </motion.section>
  )
}
