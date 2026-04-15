import { useState, type FormEvent } from 'react'
import { todayKey } from '../lib/dates'
import { addTask } from '../services/tasks'
import type { Subject, TaskDoc } from '../types'
import { SubjectSelector } from './SubjectSelector'

type Props = {
  myUid: string
}

export function TaskForm({ myUid }: Props) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState<Subject>('Maths')
  const [dateKey, setDateKey] = useState(todayKey())
  const [priority, setPriority] = useState<TaskDoc['priority']>('Medium')
  const [busy, setBusy] = useState(false)

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      await addTask(myUid, {
        title: title.trim(),
        subject,
        dateKey,
        priority,
      })
      setTitle('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Add Task</h2>
          <p className="card-sub">Minimal input. Fast execution.</p>
        </div>
      </div>

      <form className="task-form" onSubmit={onAdd}>
        <div className="field full">
          <span>Subject</span>
          <SubjectSelector value={subject} onChange={(s) => setSubject(s)} />
        </div>

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
            <span>Date</span>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value)}
            />
          </label>
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
  )
}
