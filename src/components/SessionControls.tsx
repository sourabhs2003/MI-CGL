import { useEffect, useState, type CSSProperties } from 'react'
import confetti from 'canvas-confetti'
import { Play, Square, Plus, CheckCircle, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { SUBJECTS } from '../lib/calculations'
import { getActiveSession, startSession, stopSession } from '../services/studySession'
import { useTasks } from '../hooks/useFirestoreData'
import { todayKey } from '../lib/dates'
import { completeTask } from '../services/tasks'
import type { Subject, TaskDoc } from '../types'

type Props = {
  onSessionChange?: () => void
}

const SUBJECT_COLORS: Record<Subject, string> = {
  Maths: '#1D5E91',
  GS: '#8A551F',
  English: '#5A3A99',
  Reasoning: '#1D7A59',
  Mixed: '#ec4899',
  Mock: '#94a3b8',
  Miscellaneous: '#a855f7',
}

export function SessionControls({ onSessionChange }: Props) {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const [activeSession, setActiveSession] = useState<{ id: string; subject: Subject; startTime: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [completingTask, setCompletingTask] = useState<{ id: string; xp: number } | null>(null)
  const [rewardSubject, setRewardSubject] = useState<Subject | null>(null)
  const [longPressSubject, setLongPressSubject] = useState<Subject | null>(null)
  const [now, setNow] = useState(Date.now())
  const [manualSubject, setManualSubject] = useState<Subject>('Maths')
  const [manualDuration, setManualDuration] = useState('')
  const tasks = useTasks(uid)
  const today = todayKey()

  async function handleStart(subject: Subject) {
    if (!uid) return
    setLoading(true)
    setError(null)
    try {
      const sessionId = await startSession(uid, subject)
      setActiveSession({ id: sessionId, subject, startTime: Date.now() })
      onSessionChange?.()
    } catch (error) {
      console.error('Failed to start session:', error)
      setError(error instanceof Error ? error.message : 'Failed to start session')
    } finally {
      setLoading(false)
    }
  }

  async function handleStop() {
    if (!uid || !activeSession || !activeSession.id) {
      setError('No active session to stop')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await stopSession(uid, activeSession.id)
      setActiveSession(null)
      onSessionChange?.()
    } catch (error) {
      console.error('Failed to stop session:', error)
      setError(error instanceof Error ? error.message : 'Failed to stop session')
    } finally {
      setLoading(false)
    }
  }

  async function handleResume() {
    if (!uid) return
    setLoading(true)
    try {
      const session = await getActiveSession(uid)
      if (session) {
        setActiveSession({ id: session.id, subject: session.subject, startTime: session.startTime })
      }
    } catch (error) {
      console.error('Failed to resume session:', error)
    } finally {
      setLoading(false)
    }
  }

  function getTaskXp(task: TaskDoc) {
    if (task.priority === 'High') return 15
    if (task.priority === 'Medium') return 10
    return 5
  }

  async function handleTaskToggle(task: TaskDoc, subject: Subject, willCompleteSubject: boolean) {
    if (!uid || !task.id || task.completed) return
    setCompletingTask({ id: task.id, xp: getTaskXp(task) })
    setRewardSubject(subject)
    try {
      await completeTask(uid, task)
      if (willCompleteSubject) {
        void confetti({
          particleCount: 12,
          spread: 34,
          startVelocity: 14,
          scalar: 0.5,
          ticks: 70,
          origin: { y: 0.64 },
        })
      }
    } catch (error) {
      console.error('Failed to toggle task:', error)
    } finally {
      setTimeout(() => setCompletingTask(null), 280)
      setTimeout(() => setRewardSubject(null), 520)
    }
  }

  async function handleManualEntry() {
    if (!uid || !manualDuration) return
    setLoading(true)
    setError(null)
    try {
      const duration = parseInt(manualDuration, 10)
      if (isNaN(duration) || duration <= 0) {
        setError('Please enter a valid duration')
        return
      }
      const sessionId = await startSession(uid, manualSubject)
      await stopSession(uid, sessionId)
      setShowManual(false)
      setManualDuration('')
      onSessionChange?.()
    } catch (error) {
      console.error('Failed to add manual entry:', error)
      setError(error instanceof Error ? error.message : 'Failed to add manual entry')
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(subject: Subject) {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      if (next.has(subject)) {
        next.delete(subject)
      } else {
        next.add(subject)
      }
      return next
    })
  }

  useEffect(() => {
    if (uid) {
      void handleResume()
    }
  }, [uid])

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(intervalId)
  }, [])

  const elapsedMinutes = activeSession ? Math.floor((now - activeSession.startTime) / 60000) : 0

  const getTasksForSubject = (subject: Subject) => {
    return tasks.filter((task) => task.dateKey === today && task.subject === subject && !task.completed)
  }

  const getAllTasksForSubject = (subject: Subject) => {
    return tasks.filter((task) => task.dateKey === today && task.subject === subject)
  }

  const isSubjectComplete = (subject: Subject) => {
    const allTasks = getAllTasksForSubject(subject)
    return allTasks.length > 0 && allTasks.every((task) => task.completed)
  }

  const subjects = SUBJECTS.filter((s) => s !== 'Mock') as Subject[]

  return (
    <section className="card session-controls-card">
      <div className="card-head">
        <h2>Study Session</h2>
        <button type="button" className="btn-icon" onClick={() => setShowManual(!showManual)}>
          <Plus size={18} />
        </button>
      </div>

      {error && <p className="muted error-text">{error}</p>}

      {activeSession ? (
        <div className="session-active">
          <div className="session-status">
            <div className="session-status-indicator active" />
            <span>Studying {activeSession.subject}</span>
            <span className="session-timer">{elapsedMinutes} min</span>
          </div>
          <button
            type="button"
            className="btn danger full-width"
            disabled={loading}
            onClick={() => void handleStop()}
          >
            <Square size={16} />
            Stop Session
          </button>
        </div>
      ) : (
        <div className="subject-cards-list">
          {subjects.map((subject) => {
            const subjectTasks = getTasksForSubject(subject)
            const complete = isSubjectComplete(subject)
            const color = SUBJECT_COLORS[subject]
            const isExpanded = expandedTasks.has(subject)
            const cardStyle: CSSProperties & { '--subject-color'?: string } = {
              '--subject-color': color,
              borderLeftColor: color,
            }
            let longPressTimer: number | undefined
            return (
              <div
                key={subject}
                className={`subject-card-item ${complete ? 'subject-card-complete' : ''} ${rewardSubject === subject ? 'subject-reward-pulse' : ''}`}
                style={cardStyle}
                onPointerDown={() => {
                  window.clearTimeout(longPressTimer)
                  longPressTimer = window.setTimeout(() => {
                    setLongPressSubject(subject)
                    void handleStart(subject)
                    window.setTimeout(() => setLongPressSubject(null), 450)
                  }, 520)
                }}
                onPointerUp={() => window.clearTimeout(longPressTimer)}
                onPointerLeave={() => window.clearTimeout(longPressTimer)}
              >
                <div className="subject-card-header">
                  <span className="subject-card-name">{subject}</span>
                  {complete && <CheckCircle size={18} className="complete-icon" />}
                  <button
                    type="button"
                    className="btn-play"
                    disabled={loading}
                    onClick={() => void handleStart(subject)}
                    style={{
                      background: 'linear-gradient(145deg, #102033, #0b1622)',
                      borderColor: `${color}88`,
                      boxShadow: `0 0 10px ${color}24`,
                      color,
                    }}
                  >
                    <Play size={16} />
                  </button>
                </div>
                {subjectTasks.length > 0 && (
                  <>
                    <div className="subject-card-tasks">
                      {subjectTasks.slice(0, isExpanded ? undefined : 2).map((task) => (
                        <div
                          key={task.id}
                          className={`subject-task-item ${completingTask?.id === task.id ? 'completing' : ''}`}
                          onClick={() => void handleTaskToggle(task, subject, subjectTasks.length === 1)}
                        >
                          <div
                            className={`task-checkbox`}
                            style={{ borderColor: color }}
                          >
                            <Check size={12} className="check-icon" />
                          </div>
                          <span className="subject-task-title">{task.title}</span>
                          {completingTask && completingTask.id === task.id ? <span className="subject-task-xp">+{completingTask.xp} XP</span> : null}
                        </div>
                      ))}
                    </div>
                    {subjectTasks.length > 2 && (
                      <button
                        type="button"
                        className="btn-expand"
                        onClick={() => toggleExpand(subject)}
                      >
                        {isExpanded ? 'Show less' : `Show ${subjectTasks.length - 2} more`}
                      </button>
                    )}
                  </>
                )}
                {complete && (
                  <p className="subject-complete-message">
                    <span className="complete-pulse" />
                    All done. You're ahead today.
                  </p>
                )}
                {longPressSubject === subject ? <span className="quick-start-flash">Quick start</span> : null}
              </div>
            )
          })}
        </div>
      )}

      {showManual && (
        <div className="manual-entry-panel">
          <div className="manual-entry-form">
            <div className="manual-entry-field">
              <label className="manual-entry-label">Subject</label>
              <select
                className="manual-entry-select"
                value={manualSubject}
                onChange={(e) => setManualSubject(e.target.value as Subject)}
              >
                {subjects.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="manual-entry-field">
              <label className="manual-entry-label">Duration (minutes)</label>
              <input
                type="number"
                className="manual-entry-input"
                placeholder="30"
                value={manualDuration}
                onChange={(e) => setManualDuration(e.target.value)}
                min="1"
              />
            </div>
            <div className="manual-entry-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowManual(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={loading}
                onClick={() => void handleManualEntry()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
