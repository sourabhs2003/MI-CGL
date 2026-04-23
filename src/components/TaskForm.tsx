import { useState, useEffect, useRef, type FormEvent } from 'react'
import { todayKey } from '../lib/dates'
import { addTask } from '../services/tasks'
import type { Subject } from '../types'

type Props = {
  myUid: string
}

const SUBJECTS: Subject[] = ['Maths', 'English', 'Reasoning', 'GS', 'Mock', 'Miscellaneous']

export function TaskForm({ myUid }: Props) {
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState<Subject>('Maths')
  const [dateKey, setDateKey] = useState(todayKey())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [buttonAnimating, setButtonAnimating] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  // Load last selected subject from localStorage
  useEffect(() => {
    const lastSubject = localStorage.getItem('last-selected-subject')
    if (lastSubject && SUBJECTS.includes(lastSubject as Subject)) {
      setSubject(lastSubject as Subject)
    }
  }, [])

  // Save last selected subject to localStorage
  useEffect(() => {
    localStorage.setItem('last-selected-subject', subject)
  }, [subject])

  function handleSubjectSelect(selectedSubject: Subject) {
    setSubject(selectedSubject)
    // Auto-focus title input after subject selection
    setTimeout(() => titleInputRef.current?.focus(), 50)

    // Smart behavior: auto-suggest title for Mock
    if (selectedSubject === 'Mock' && !title) {
      setTitle('Mock Test')
    }
  }

  function getPlaceholder(): string {
    if (subject === 'Miscellaneous') {
      return 'e.g. Revision, Notes, Doubt solving'
    }
    if (subject === 'Mock') {
      return 'e.g. Mock Test'
    }
    return 'e.g. Algebra revision, PYQ practice'
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Task title is required.')
      return
    }

    setBusy(true)
    setError('')
    setButtonAnimating(true)
    try {
      await addTask(myUid, {
        title: title.trim(),
        subject,
        type: 'study',
        dateKey,
      })
      setTitle('')
    } finally {
      setBusy(false)
      setTimeout(() => setButtonAnimating(false), 200)
    }
  }

  return (
    <section className="card task-form-card">
      <div className="card-head">
        <h2>Add Task</h2>
      </div>

      <form className="task-form" onSubmit={onAdd}>
        <div className="field full">
          <span>Subject</span>
          <div className="subject-chips">
            {SUBJECTS.map((s) => (
              <button
                key={s}
                type="button"
                className={`subject-chip ${subject === s ? 'selected' : ''}`}
                onClick={() => handleSubjectSelect(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <label className="field full">
          <span>Task Title</span>
          <input
            ref={titleInputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={getPlaceholder()}
            required
          />
        </label>

        <label className="field full">
          <span>Date</span>
          <input type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <button
          type="submit"
          className={`btn primary full-width add-task-btn ${buttonAnimating ? 'animating' : ''}`}
          disabled={busy}
        >
          {busy ? 'Adding...' : 'Add Task'}
        </button>
      </form>
    </section>
  )
}
