import { motion } from 'framer-motion'
import { Bolt, CalendarDays, Focus } from 'lucide-react'

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

type Props = {
  todaySec: number
  weekSec: number
  focusToday: number
}

const stats = [
  {
    key: 'today',
    label: 'Today',
    hint: 'study time',
    accent: 'green',
    icon: Bolt,
  },
  {
    key: 'week',
    label: 'This Week',
    hint: 'total hours',
    accent: 'yellow',
    icon: CalendarDays,
  },
  {
    key: 'sessions',
    label: 'Sessions',
    hint: 'today',
    accent: 'red',
    icon: Focus,
  },
] as const

export function StatStrip({ todaySec, weekSec, focusToday }: Props) {
  const values = {
    today: fmtDuration(todaySec),
    week: fmtDuration(weekSec),
    sessions: String(focusToday),
  }

  return (
    <motion.section
      className="stat-strip"
      aria-label="Quick stats"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.key}
          className={`stat-card ${stat.accent}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.08 + index * 0.08 }}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="stat-icon-shell">
            <stat.icon size={18} className="stat-svg" />
          </div>
          <div className="stat-content">
            <span className="stat-label">{stat.label}</span>
            <span className="stat-value">{values[stat.key]}</span>
            <span className="stat-hint">{stat.hint}</span>
          </div>
        </motion.div>
      ))}
    </motion.section>
  )
}
