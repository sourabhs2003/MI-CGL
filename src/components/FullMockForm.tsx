import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import type { MockKind } from '../types'

type Props = {
  onSubmit: (data: {
    kind: MockKind
    score: number
    accuracyPct: number
    durationMin: number
  }) => Promise<void>
}

export function FullMockForm({ onSubmit }: Props) {
  const { user } = useAuth()
  const [kind, setKind] = useState<MockKind>('full_t1')
  const [score, setScore] = useState(120)
  const [percentage, setPercentage] = useState(60)
  const [accuracyPct, setAccuracyPct] = useState(78)
  const [durationMin, setDurationMin] = useState(60)
  const [busy, setBusy] = useState(false)

  const maxScore = 200
  const studyBonus = kind === 'full_t1' ? '+1 hour' : '+2 hours'

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
        kind,
        score,
        accuracyPct,
        durationMin,
      })
      setScore(120)
      setPercentage(60)
      setAccuracyPct(78)
      setDurationMin(60)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.section
      className="card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    >
      <div className="card-head">
        <h2>Full Mock</h2>
        <p className="card-sub">
          Score out of 200 • {studyBonus} study bonus
        </p>
      </div>

      <form className="mock-form" onSubmit={submit}>
        <label className="field full">
          <span>Tier</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as MockKind)}
          >
            <option value="full_t1">Tier 1 (+1 hour bonus)</option>
            <option value="full_t2">Tier 2 (+2 hours bonus)</option>
          </select>
        </label>

        <div className="field-row">
          <label className="field">
            <span>Score</span>
            <input
              type="number"
              value={score}
              min={0}
              max={maxScore}
              onChange={(e) => setScore(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Max</span>
            <input
              type="number"
              value={maxScore}
              disabled
              className="disabled"
            />
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
          {busy ? 'Saving…' : 'Save Full Mock'}
        </button>
      </form>
    </motion.section>
  )
}
