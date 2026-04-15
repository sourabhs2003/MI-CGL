import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock, Target } from 'lucide-react'

export function Countdown() {
  const countdownData = useMemo(() => {
    const now = new Date()
    const examDate = new Date('2027-06-01')
    const syllabusDeadline = new Date('2026-12-31')
    
    const daysToExam = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const daysToSyllabus = Math.ceil((syllabusDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    return {
      daysToExam: Math.max(0, daysToExam),
      daysToSyllabus: Math.max(0, daysToSyllabus)
    }
  }, [])

  const getMessage = () => {
    if (countdownData.daysToSyllabus < 60) {
      return 'Critical – Push 2 hours daily'
    } else if (countdownData.daysToSyllabus < 120) {
      return 'Behind – Push 1 hour more'
    } else if (countdownData.daysToSyllabus < 180) {
      return 'Stay consistent – You can do it'
    } else {
      return 'Ahead – Keep the momentum'
    }
  }

  return (
    <motion.section
      className="card countdown-card compact"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="card-head">
        <h2>CGL 2027</h2>
        <p className="card-sub">Time is running. Stay consistent.</p>
      </div>

      <div className="countdown-grid">
        <div className="countdown-item">
          <div className="countdown-icon">
            <Clock size={18} />
          </div>
          <div className="countdown-content">
            <span className="countdown-label">Days Left</span>
            <span className="countdown-value">{countdownData.daysToExam}</span>
          </div>
        </div>

        <div className="countdown-item">
          <div className="countdown-icon">
            <Target size={18} />
          </div>
          <div className="countdown-content">
            <span className="countdown-label">Syllabus</span>
            <span className="countdown-value">{countdownData.daysToSyllabus}</span>
          </div>
        </div>
      </div>

      <motion.p
        className="countdown-message"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {getMessage()}
      </motion.p>
    </motion.section>
  )
}
