import { useState, type FormEvent } from 'react'
import { todayKey } from '../lib/dates'
import { addTask } from '../services/tasks'
import type { Subject, TaskDoc } from '../types'
import { SubjectSelector } from './SubjectSelector'

type Props = {
  myUid: string
}

type TaskMode = 'subject' | 'target'

export function TaskForm({ myUid }: Props) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState<Subject>('Maths')
  const [dateKey, setDateKey] = useState(todayKey())
  const [priority, setPriority] = useState<TaskDoc['priority']>('Medium')
  const [taskMode, setTaskMode] = useState<TaskMode>('subject')
  const [taskType, setTaskType] = useState<Exclude<TaskDoc['type'], 'target'>>('study')
  const [targetType, setTargetType] = useState<TaskDoc['targetType']>('time')
  const [duration, setDuration] = useState<number | undefined>()
  const [notes, setNotes] = useState('')
  const [isGroupTask, setIsGroupTask] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Task title is required.')
      return
    }
    if (taskMode === 'target' && targetType === 'time' && (!duration || duration <= 0)) {
      setError('Enter a valid duration.')
      return
    }

    setBusy(true)
    setError('')
    try {
      await addTask(myUid, {
        title: title.trim(),
        subject: taskMode === 'subject' ? subject : 'Target',
        type: taskMode === 'subject' ? taskType : 'target',
        targetType: taskMode === 'target' ? targetType : undefined,
        dateKey,
        priority,
        duration: taskMode === 'target' && targetType === 'time' ? duration : undefined,
        notes: taskMode === 'target' ? notes : undefined,
        isGroupTask,
      })
      setTitle('')
      setDuration(undefined)
      setNotes('')
      setIsGroupTask(false)
      setTaskType('study')
      setTaskMode('subject')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card task-form-card">
      <div className="card-head">
        <h2>Add Task</h2>
      </div>

      <form className="task-form dynamic-mock-form" onSubmit={onAdd}>
        <div className="segmented-toggle">
          <button
            type="button"
            className={taskMode === 'subject' ? 'btn primary' : 'btn ghost'}
            onClick={() => setTaskMode('subject')}
          >
            Subject
          </button>
          <button
            type="button"
            className={taskMode === 'target' ? 'btn primary' : 'btn ghost'}
            onClick={() => setTaskMode('target')}
          >
            Target
          </button>
        </div>

        {taskMode === 'subject' ? (
          <>
            <div className="field full">
              <span>Subject</span>
              <SubjectSelector value={subject} onChange={(next) => setSubject(next)} />
            </div>

            <label className="field full">
              <span>Type</span>
              <select value={taskType} onChange={(e) => setTaskType(e.target.value as Exclude<TaskDoc['type'], 'target'>)}>
                <option value="study">Study</option>
                <option value="mock">Mock</option>
              </select>
            </label>

            <label className="field full">
              <span>Task Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Algebra revision"
                required
              />
            </label>
          </>
        ) : (
          <>
            <label className="field full">
              <span>Type</span>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as TaskDoc['targetType'])}
              >
                <option value="time">Study 2 hours</option>
                <option value="chapter">Complete chapter</option>
                <option value="custom">Workout</option>
              </select>
            </label>

            <label className="field full">
              <span>Task Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Complete Polity chapter"
                required
              />
            </label>

            {targetType === 'time' ? (
              <label className="field full">
                <span>Duration (minutes)</span>
                <input
                  type="number"
                  min={1}
                  value={duration ?? ''}
                  onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : undefined)}
                />
              </label>
            ) : null}

            <label className="field full">
              <span>Notes</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional"
              />
            </label>
          </>
        )}

        <div className="field-row">
          <label className="field">
            <span>Date</span>
            <input type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
          </label>
          <label className="field">
            <span>Priority</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskDoc['priority'])}>
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

        {error ? <p className="form-error">{error}</p> : null}

        <button type="submit" className="btn primary full-width" disabled={busy}>
          {busy ? 'Adding...' : 'Add task'}
        </button>
      </form>
    </section>
  )
}
