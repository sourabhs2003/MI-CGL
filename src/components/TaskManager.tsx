import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { useMemo, useState, type FormEvent } from 'react'
import { SUBJECTS } from '../lib/calculations'
import { todayKey } from '../lib/dates'
import { addTask, completeTask, deleteTask } from '../services/tasks'
import type { Subject, TaskDoc } from '../types'

type Props = {
  myUid: string
  tasks: TaskDoc[]
}

function burst() {
  try {
    confetti({
      particleCount: 70,
      spread: 60,
      startVelocity: 35,
      gravity: 0.9,
      ticks: 180,
      origin: { y: 0.85 },
    })
  } catch {
    /* no canvas in some environments */
  }
}

export function TaskManager({ myUid, tasks }: Props) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState<Subject>('Maths')
  const [dateKey, setDateKey] = useState(todayKey())
  const [priority, setPriority] = useState<TaskDoc['priority']>('Medium')
  const [busy, setBusy] = useState(false)

  const todaysTasks = useMemo(
    () => tasks.filter((t) => t.dateKey === dateKey),
    [tasks, dateKey],
  )

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      await addTask(myUid, {
        title: title.trim(),
        subject,
        priority,
        dateKey,
      })
      setTitle('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="card">
        <div className="card-head">
          <div>
            <h2>Tasks</h2>
            <p className="card-sub">Add goals. Mark done. Earn XP.</p>
          </div>
          <motion.div
            className="study-duration-pill"
            initial={false}
            animate={{ opacity: 1 }}
          >
            {dateKey}
          </motion.div>
        </div>

        <form className="task-form" onSubmit={onAdd}>
          <label className="field full">
            <span>Task title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 50 Algebra questions"
              required
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Subject</span>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value as Subject)}
              >
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={dateKey}
                onChange={(e) => setDateKey(e.target.value)}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskDoc['priority'])}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>
          </div>

          <button type="submit" className="btn primary full-width" disabled={busy}>
            {busy ? 'Adding…' : 'Add task'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Tasks for {dateKey}</h2>
        {todaysTasks.length === 0 ? (
          <p className="muted">No tasks for this date.</p>
        ) : (
          <ul className="task-list">
            {todaysTasks.map((t) => (
              <li key={t.id} className="task-row">
                <div>
                  <strong>{t.title}</strong>
                  <span className="task-meta">
                    {t.subject} · {t.priority || 'No priority'}
                  </span>
                </div>
                <div className="task-actions">
                  <button
                    type="button"
                    className="btn primary sm"
                    disabled={t.completed}
                    onClick={async () => {
                      await completeTask(myUid, t.id!)
                      burst()
                    }}
                  >
                    {t.completed ? 'Done' : 'Complete (+5 XP)'}
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => void deleteTask(myUid, t.id!)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

