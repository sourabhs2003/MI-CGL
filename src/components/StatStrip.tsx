import { motion } from 'framer-motion'

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

export function StatStrip({ todaySec, weekSec, focusToday }: Props) {
  return (
    <motion.section
      className="stat-strip"
      aria-label="Quick stats"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="stat-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        <div className="stat-icon">⚡</div>
        <div className="stat-content">
          <span className="stat-label">Today</span>
          <span className="stat-value">{fmtDuration(todaySec)}</span>
          <span className="stat-hint">study time</span>
        </div>
      </motion.div>
      <motion.div
        className="stat-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        <div className="stat-icon">📅</div>
        <div className="stat-content">
          <span className="stat-label">This Week</span>
          <span className="stat-value">{fmtDuration(weekSec)}</span>
          <span className="stat-hint">total</span>
        </div>
      </motion.div>
      <motion.div
        className="stat-card"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        <div className="stat-icon">🎯</div>
        <div className="stat-content">
          <span className="stat-label">Sessions</span>
          <span className="stat-value">{focusToday}</span>
          <span className="stat-hint">today</span>
        </div>
      </motion.div>
    </motion.section>
  )
}
