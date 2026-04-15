import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Clock3, Target } from 'lucide-react'

export function Countdown() {
  const countdownData = useMemo(() => {
    const now = new Date()
    const examDate = new Date('2027-06-01')
    const syllabusDeadline = new Date('2026-12-31')

    const daysToExam = Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const daysToSyllabus = Math.ceil((syllabusDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return {
      daysToExam: Math.max(0, daysToExam),
      daysToSyllabus: Math.max(0, daysToSyllabus),
    }
  }, [])

  function getMessage() {
    if (countdownData.daysToSyllabus < 60) return 'Critical window. Push two focused hours daily.'
    if (countdownData.daysToSyllabus < 120) return 'Time to tighten the routine and close gaps.'
    if (countdownData.daysToSyllabus < 180) return 'You are on track. Stay consistent.'
    return 'Early advantage. Build depth before the pressure starts.'
  }

  return (
    <motion.section
      className="card countdown-card compact"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="card-head">
        <h2>CGL countdown</h2>
        <p className="card-sub">A clear clock for exam day and syllabus closure.</p>
      </div>

      <div className="countdown-grid">
        <div className="countdown-item">
          <div className="countdown-icon">
            <Clock3 size={18} />
          </div>
          <div className="countdown-content">
            <span className="countdown-label">Exam Day</span>
            <span className="countdown-value">{countdownData.daysToExam}</span>
          </div>
        </div>

        <div className="countdown-item">
          <div className="countdown-icon">
            <Target size={18} />
          </div>
          <div className="countdown-content">
            <span className="countdown-label">Syllabus Lock</span>
            <span className="countdown-value">{countdownData.daysToSyllabus}</span>
          </div>
        </div>
      </div>

      <motion.p
        className="countdown-message"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.16 }}
      >
        {getMessage()}
      </motion.p>
    </motion.section>
  )
}
