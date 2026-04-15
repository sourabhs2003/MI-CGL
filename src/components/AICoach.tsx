import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { generateAICoachMessage } from '../services/aiCoach'

type Props = {
  todayStudyTime: number
  streak: number
  rank: string
  leaderboardPosition: number
}

export function AICoach({ todayStudyTime, streak, rank, leaderboardPosition }: Props) {
  const [message, setMessage] = useState<string>('Loading AI Coach...')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMessage() {
      setLoading(true)
      try {
        const nextMessage = await generateAICoachMessage({
          todayStudyTime,
          streak,
          rank,
          leaderboardPosition,
        })
        setMessage(nextMessage)
      } catch {
        setMessage('Stay consistent. Short focused sessions still stack up.')
      } finally {
        setLoading(false)
      }
    }

    void loadMessage()
    const interval = window.setInterval(() => void loadMessage(), 30 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [todayStudyTime, streak, rank, leaderboardPosition])

  return (
    <motion.section
      className="card ai-coach-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.34 }}
    >
      <div className="card-head">
        <div className="ai-header">
          <motion.div
            className="ai-icon"
            animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles size={18} className="icon active" />
          </motion.div>
          <h2>AI Coach</h2>
        </div>
      </div>

      <motion.p
        className="ai-message"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.14 }}
      >
        {loading ? 'Analyzing your momentum...' : message}
      </motion.p>
    </motion.section>
  )
}
