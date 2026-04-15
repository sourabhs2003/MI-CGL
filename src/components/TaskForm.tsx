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
  const [isGroupTask, setIsGroupTask] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onAdd(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return

    setBusy(true)
    try {
      await addTask(myUid, {
        title: title.trim(),
        subject,
        dateKey,
        priority,
        isGroupTask,
      })
      setTitle('')
      setIsGroupTask(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card task-form-card">
      <div className="card-head">
        <h2>Add task</h2>
      </div>

      <form className="task-form" onSubmit={onAdd}>
        <div className="field full">
          <span>Subject</span>
          <SubjectSelector value={subject} onChange={(next) => setSubject(next)} />
        </div>

        <label className="field full">
          <span>Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Task"
            required
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} />
          </label>
          <label className="field">
            <span>Priority</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskDoc['priority'])}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </label>
        </div>

        <label className="toggle-row">
          <input
            type="checkbox"
            checked={isGroupTask}
            onChange={(event) => setIsGroupTask(event.target.checked)}
          />
          <span>Assign to group</span>
        </label>

        <button type="submit" className="btn primary full-width" disabled={busy}>
          {busy ? 'Adding...' : 'Add'}
        </button>
      </form>
    </section>
  )
}
