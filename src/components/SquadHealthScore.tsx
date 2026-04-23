import { motion } from 'framer-motion'
import { HeartPulse } from 'lucide-react'

type SquadHealthScoreProps = {
  score: number
  label: 'Good' | 'Needs Improvement' | 'Critical'
  activeRatio: number
  consistencyRatio: number
}

export function SquadHealthScore(props: SquadHealthScoreProps) {
  const { score, label, activeRatio, consistencyRatio } = props

  return (
    <motion.section
      className="squad-shell squad-health-card-v3"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <div className="squad-card-head">
        <div>
          <p className="squad-kicker">Squad Health Score</p>
          <h3>{label}</h3>
        </div>
        <HeartPulse size={18} />
      </div>

      <div className="squad-health-main">
        <strong>{score}</strong>
        <span>/100</span>
      </div>

      <div className="squad-progress-bar">
        <motion.div
          className="squad-progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>

      <div className="squad-health-meta">
        <span>Active ratio {(activeRatio * 100).toFixed(0)}%</span>
        <span>Consistency {(consistencyRatio * 100).toFixed(0)}%</span>
      </div>
    </motion.section>
  )
}
