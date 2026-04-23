import { motion } from 'framer-motion'
import { Zap, Clock } from 'lucide-react'

interface MiniChallengeProps {
  title: string
  description: string
  reward: string
  timeRemaining: string
  onStart: () => void
  isStarted?: boolean
}

export function MiniChallenge({ 
  title, 
  description, 
  reward, 
  timeRemaining, 
  onStart,
  isStarted = false 
}: MiniChallengeProps) {
  return (
    <motion.div
      className="mini-challenge-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mini-challenge-header">
        <Zap size={20} className="mini-challenge-icon" />
        <h3>{title}</h3>
      </div>

      <p className="mini-challenge-description">{description}</p>

      <div className="mini-challenge-reward">
        <span>🎁 Reward: {reward}</span>
      </div>

      <div className="mini-challenge-timer">
        <Clock size={14} />
        <span>{timeRemaining}</span>
      </div>

      <button
        type="button"
        className={`mini-challenge-btn ${isStarted ? 'mini-challenge-btn-started' : ''}`}
        onClick={onStart}
        disabled={isStarted}
      >
        {isStarted ? 'In Progress...' : 'Start Challenge'}
      </button>
    </motion.div>
  )
}
