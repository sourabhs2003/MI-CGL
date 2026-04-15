import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { SUBJECTS, clamp, durationMinutes, minutesToSec } from '../lib/calculations'
import type { Subject } from '../types'

type Props = {
  onSaved: (payload: {
    subject: Subject
    topic: string
    durationSec: number
  }) => Promise<void>
}

export function StudyInput({ onSaved }: Props) {
  const [subject, setSubject] = useState<Subject>('Maths')
  const [start, setStart] = useState('07:00')
  const [end, setEnd] = useState('08:00')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [showXP, setShowXP] = useState(false)

  const minutes = useMemo(() => durationMinutes(start, end) ?? 0, [start, end])
  const durationLabel = useMemo(() => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }, [minutes])

  const xpGained = Math.floor(minutes * 0.5)

  async function save() {
    setErr(null)
    const mins = durationMinutes(start, end)
    if (mins == null) {
      setErr('Pick valid time')
      return
    }

    const durationSec = minutesToSec(mins)
    if (durationSec <= 0) {
      setErr('Duration > 0')
      return
    }

    setSaving(true)
    try {
      await onSaved({
        subject,
        topic: `Study (${start}-${end})`,
        durationSec,
      })
      setShowXP(true)
      window.setTimeout(() => setShowXP(false), 2000)
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function quickAdd(mins: number) {
    setErr(null)
    setSaving(true)
    try {
      await onSaved({
        subject,
        topic: `Quick add ${mins}m`,
        durationSec: minutesToSec(mins),
      })
      setShowXP(true)
      window.setTimeout(() => setShowXP(false), 2000)
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card study-input">
      <div className="card-head">
        <h2>Quick study</h2>
        <motion.div
          className="study-duration-pill"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 0.28 }}
          key={durationLabel}
        >
          {durationLabel}
        </motion.div>
      </div>

      <label className="field full">
        <span>Subject</span>
        <select value={subject} onChange={(event) => setSubject(event.target.value as Subject)}>
          {SUBJECTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <div className="field-row">
        <label className="field">
          <span>Start</span>
          <input type="time" value={start} onChange={(event) => setStart(event.target.value)} />
        </label>
        <label className="field">
          <span>End</span>
          <input type="time" value={end} onChange={(event) => setEnd(event.target.value)} />
        </label>
      </div>

      {err ? <p className="form-error">{err}</p> : null}

      <div className="study-actions">
        <AnimatePresence>
          {showXP ? (
            <motion.div
              className="xp-float"
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -30, scale: 1.2 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              +{xpGained} XP
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="button"
          className="btn primary full-width"
          disabled={saving}
          onClick={() => void save()}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {saving ? 'Saving...' : 'Save'}
        </motion.button>

        <div className="quick-row">
          <motion.button
            type="button"
            className="btn ghost"
            disabled={saving}
            onClick={() => void quickAdd(30)}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            +30m
          </motion.button>
          <motion.button
            type="button"
            className="btn ghost"
            disabled={saving}
            onClick={() => void quickAdd(60)}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            +1h
          </motion.button>
          <motion.button
            type="button"
            className="btn ghost"
            disabled={saving}
            onClick={() => {
              const next = clamp(minutes + 15, 15, 12 * 60)
              const hh = String(Math.floor((next % (24 * 60)) / 60)).padStart(2, '0')
              const mm = String(next % 60).padStart(2, '0')
              setEnd(`${hh}:${mm}`)
            }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            +15m
          </motion.button>
        </div>
      </div>
    </section>
  )
}
