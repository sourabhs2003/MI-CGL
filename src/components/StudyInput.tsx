import { motion, AnimatePresence } from 'framer-motion'
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
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }, [minutes])

  const xpGained = Math.floor(minutes * 0.5)

  async function save() {
    setErr(null)
    const mins = durationMinutes(start, end)
    if (mins == null) {
      setErr('Pick valid start and end times')
      return
    }
    const durationSec = minutesToSec(mins)
    if (durationSec <= 0) {
      setErr('Duration must be greater than 0')
      return
    }
    setSaving(true)
    try {
      await onSaved({
        subject,
        topic: `Study (${start}–${end})`,
        durationSec,
      })
      setShowXP(true)
      setTimeout(() => setShowXP(false), 2000)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save')
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
      setTimeout(() => setShowXP(false), 2000)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card study-input">
      <div className="card-head">
        <div>
          <h2>Quick log study</h2>
          <p className="card-sub">No timer. Two taps. Save and move on.</p>
        </div>
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
        <select value={subject} onChange={(e) => setSubject(e.target.value as Subject)}>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <div className="field-row">
        <label className="field">
          <span>Start</span>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field">
          <span>End</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>

      {err ? <p className="form-error">{err}</p> : null}

      <div className="study-actions">
        <AnimatePresence>
          {showXP && (
            <motion.div
              className="xp-float"
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -30, scale: 1.2 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              +{xpGained} XP
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          className="btn primary full-width"
          disabled={saving}
          onClick={() => void save()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          {saving ? 'Saving…' : 'Save study'}
        </motion.button>
        <div className="quick-row">
          <motion.button
            type="button"
            className="btn ghost"
            disabled={saving}
            onClick={() => void quickAdd(30)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            +30m
          </motion.button>
          <motion.button
            type="button"
            className="btn ghost"
            disabled={saving}
            onClick={() => void quickAdd(60)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            +15m
          </motion.button>
        </div>
      </div>
    </section>
  )
}

