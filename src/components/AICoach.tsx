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
        const msg = await generateAICoachMessage({
          todayStudyTime,
          streak,
          rank,
          leaderboardPosition,
        })
        setMessage(msg)
      } catch (err) {
        setMessage('Stay consistent. You can do it!')
      } finally {
        setLoading(false)
      }
    }

    loadMessage()
    // Refresh every session
    const interval = setInterval(loadMessage, 60000 * 30) // 30 minutes
    return () => clearInterval(interval)
  }, [todayStudyTime, streak, rank, leaderboardPosition])

  return (
    <motion.section
      className="card ai-coach-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <div className="card-head">
        <div className="ai-header">
          <motion.div
            className="ai-icon"
            animate={{
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
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
        transition={{ delay: 0.5 }}
      >
        {loading ? 'Analyzing your progress...' : message}
      </motion.p>
    </motion.section>
  )
}
