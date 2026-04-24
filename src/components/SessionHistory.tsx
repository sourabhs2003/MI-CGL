import { useState } from 'react'
import { Edit2, Trash2, X, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { deleteSession, updateSession } from '../services/studySession'
import { todayKey } from '../lib/dates'
import type { StudySessionDoc, Subject } from '../types'

type Props = {
  sessions: StudySessionDoc[]
}

type EditingSession = {
  id: string
  durationSec: number
  subject: Subject
}

const SUBJECTS: Subject[] = ['Maths', 'GS', 'English', 'Reasoning', 'Mixed', 'Miscellaneous']

export function SessionHistory({ sessions }: Props) {
  const { user } = useAuth()
  const uid = user?.uid
  const today = todayKey()
  const todaySessions = sessions.filter((s) => s.dayKey === today && s.id)
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState<EditingSession | null>(null)
  const [editDuration, setEditDuration] = useState('')
  const [editSubject, setEditSubject] = useState<Subject>('Maths')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(sessionId: string) {
    if (!uid || typeof uid !== 'string' || !uid.trim()) {
      console.error('Missing or invalid uid - user not authenticated')
      return
    }
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      console.error('Missing or invalid sessionId')
      return
    }
    console.log('Attempting to delete session:', { uid: uid.trim(), sessionId: sessionId.trim() })
    setDeletingId(sessionId)
    try {
      await deleteSession(uid.trim(), sessionId.trim())
    } catch (error) {
      console.error('Failed to delete session:', error)
    } finally {
      setDeletingId(null)
    }
  }

  function startEdit(session: StudySessionDoc) {
    if (!session.id) return
    setEditing({
      id: session.id,
      durationSec: session.durationSec,
      subject: session.subject,
    })
    setEditDuration(String(Math.round(session.durationSec / 60)))
    setEditSubject(session.subject)
  }

  function cancelEdit() {
    setEditing(null)
    setEditDuration('')
  }

  async function handleSaveEdit() {
    if (!uid || !editing) return
    const durationMin = parseInt(editDuration, 10)
    if (isNaN(durationMin) || durationMin <= 0) return

    try {
      await updateSession(uid, editing.id, {
        durationSec: durationMin * 60,
        subject: editSubject,
      })
      setEditing(null)
      setEditDuration('')
    } catch (error) {
      console.error('Failed to update session:', error)
    }
  }

  if (todaySessions.length === 0) {
    return null
  }

  return (
    <section className="session-history">
      <button
        type="button"
        className="session-history-header"
        onClick={() => setExpanded(!expanded)}
      >
        <h3>Today's Sessions</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="session-count">{todaySessions.length} sessions</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>
      {expanded && (
        <div className="session-list">
          {todaySessions.map((session) => {
            if (!session.id) {
              console.log('Skipping session without id:', session)
              return null
            }
            const isEditing = editing?.id === session.id
            const isDeleting = deletingId === session.id
            const durationMin = Math.round(session.durationSec / 60)

            return (
              <div key={session.id} className="session-item">
                {isEditing ? (
                  <div className="session-edit-form">
                    <select
                      className="session-edit-select"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value as Subject)}
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="session-edit-input"
                      placeholder="Minutes"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      min="1"
                    />
                    <button
                      type="button"
                      className="btn-icon session-edit-save"
                      onClick={handleSaveEdit}
                      title="Save"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon session-edit-cancel"
                      onClick={cancelEdit}
                      title="Cancel"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="session-info">
                      <span className="session-subject">{session.subject}</span>
                      <span className="session-duration">{durationMin} min</span>
                      {session.topic && <span className="session-topic">{session.topic}</span>}
                    </div>
                    <div className="session-actions">
                      <button
                        type="button"
                        className="btn-icon session-edit-btn"
                        onClick={() => startEdit(session)}
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon session-delete-btn"
                        onClick={() => {
                          console.log('Delete button clicked for session:', session.id, session)
                          handleDelete(session.id)
                        }}
                        disabled={isDeleting}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
