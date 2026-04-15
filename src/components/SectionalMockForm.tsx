import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { SUBJECTS } from '../lib/calculations'
import type { Subject } from '../types'

type Props = {
  onSubmit: (data: {
    subject: Subject
    score: number
    accuracyPct: number
    durationMin: number
  }) => Promise<void>
}

export function SectionalMockForm({ onSubmit }: Props) {
  const { user } = useAuth()
  const [subject, setSubject] = useState<Subject>('Maths')
  const [score, setScore] = useState(25)
  const [percentage, setPercentage] = useState(50)
  const [accuracyPct, setAccuracyPct] = useState(70)
  const [durationMin, setDurationMin] = useState(30)
  const [busy, setBusy] = useState(false)

  const getProgressClass = () => {
    if (percentage >= 70) return 'high'
    if (percentage >= 50) return 'medium'
    return 'low'
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!user?.uid) return
    setBusy(true)
    try {
      await onSubmit({
        subject,
        score,
        accuracyPct,
        durationMin,
      })
      setScore(25)
      setPercentage(50)
      setAccuracyPct(70)
      setDurationMin(30)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.section
      className="card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="card-head">
        <h2>Sectional Mock</h2>
        <p className="card-sub">Score out of 50 • +15 min study bonus</p>
      </div>

      <form className="mock-form" onSubmit={submit}>
        <label className="field full">
          <span>Subject</span>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value as Subject)}
          >
            {SUBJECTS.filter((s) => s !== 'Mixed').map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className="field-row">
          <label className="field">
            <span>Score</span>
            <input
              type="number"
              value={score}
              min={0}
              max={50}
              onChange={(e) => setScore(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Max</span>
            <input type="number" value={50} disabled className="disabled" />
          </label>
        </div>

        <div className="mock-progress-bar">
          <motion.div
            className={`mock-progress-fill ${getProgressClass()}`}
            style={{ width: `${percentage}%` }}
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>

        <div className="field-row">
          <label className="field">
            <span>Percentage %</span>
            <input
              type="number"
              value={percentage}
              min={0}
              max={100}
              onChange={(e) => setPercentage(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Accuracy %</span>
            <input
              type="number"
              value={accuracyPct}
              min={0}
              max={100}
              onChange={(e) => setAccuracyPct(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Time (min)</span>
            <input
              type="number"
              value={durationMin}
              min={0}
              onChange={(e) => setDurationMin(Number(e.target.value))}
            />
          </label>
        </div>

        <button
          type="submit"
          className="btn primary full-width"
          disabled={busy || !user?.uid}
        >
          {busy ? 'Saving…' : 'Save Sectional Mock'}
        </button>
      </form>
    </motion.section>
  )
}
