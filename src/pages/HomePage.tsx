import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Brain, CheckCheck, Clock3, Flame, Sparkles, Target, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AvatarIcon } from '../components/AvatarIcon'
import { Countdown } from '../components/Countdown'
import { useAuth } from '../context/AuthContext'
import { useSessions, useTasks } from '../hooks/useFirestoreData'
import { useUserProfile } from '../hooks/useUserProfile'
import { durationMinutes, SUBJECTS } from '../lib/calculations'
import { todayKey } from '../lib/dates'
import { getIdentity } from '../lib/identity'
import { xpFromStudySeconds } from '../lib/xp'
import { completeTask } from '../services/tasks'
import { saveStudySession, syncQueuedStudySessions } from '../services/studySession'
import type { Subject, TaskDoc, TimeOfDay } from '../types'

const logSubjects = SUBJECTS.filter((item) => item !== 'Mock')

function getTaskXp(priority?: TaskDoc['priority']) {
  if (priority === 'High') return 15
  if (priority === 'Medium') return 10
  return 5
}

function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(seconds >= 3600 ? 1 : 2)}h`
}

function toTimeValue(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getTimeOfDay(startTime: string): TimeOfDay {
  const hour = Number(startTime.slice(0, 2))
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

export function HomePage() {
  const { user } = useAuth()
  const uid = user?.uid
  const today = todayKey()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
  const { profile } = useUserProfile(uid)
  const sessions = useSessions(uid, 500)
  const tasks = useTasks(uid)
  const [subject, setSubject] = useState<Subject>('Maths')
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState(toTimeValue())
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [xpPulse, setXpPulse] = useState<number | null>(null)
  const [cardIndex, setCardIndex] = useState(0)
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    void syncQueuedStudySessions()
    function handleOnline() {
      setIsOnline(true)
      void syncQueuedStudySessions()
      setFeedback('Offline sessions synced.')
    }
    function handleOffline() {
      setIsOnline(false)
      setFeedback('Offline mode. Study logs will sync later.')
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const todaySessions = useMemo(() => sessions.filter((session) => session.dayKey === today), [sessions, today])
  const todaySec = useMemo(() => todaySessions.reduce((sum, session) => sum + session.durationSec, 0), [todaySessions])
  const yesterdaySec = useMemo(
    () => sessions.filter((session) => session.dayKey === yesterdayKey).reduce((sum, session) => sum + session.durationSec, 0),
    [sessions, yesterdayKey],
  )
  const todayTasks = useMemo(() => tasks.filter((task) => task.dateKey === today && !task.isGroupTask), [tasks, today])
  const pendingTasks = useMemo(() => todayTasks.filter((task) => !task.completed), [todayTasks])
  const completedTasks = useMemo(() => todayTasks.filter((task) => task.completed), [todayTasks])
  const todayXp = useMemo(
    () => xpFromStudySeconds(todaySec) + completedTasks.reduce((sum, task) => sum + getTaskXp(task.priority), 0),
    [completedTasks, todaySec],
  )

  const userIdentity = useMemo(() => getIdentity(user?.username ?? 'user'), [user?.username])
  const targetHours = 4
  const progressPct = Math.min(100, Math.round((todaySec / (targetHours * 3600)) * 100))

  const aiCards = useMemo(() => {
    const subjectTotals = todaySessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.subject] = (acc[session.subject] ?? 0) + session.durationSec
      return acc
    }, {})
    const topSubject = Object.entries(subjectTotals).sort((a, b) => b[1] - a[1])[0]?.[0]

    return [
      {
        icon: Flame,
        title: 'Focus for today',
        text: todaySec < yesterdaySec ? `You studied ${((yesterdaySec - todaySec) / 3600).toFixed(1)}h less than yesterday - fix it.` : 'Consistency streak is building. Keep pressing.',
      },
      {
        icon: Brain,
        title: 'Performance insight',
        text: topSubject ? `${topSubject} time increased today. Protect the momentum.` : 'Your next strong session sets the tone.',
      },
      {
        icon: todaySec === 0 ? TriangleAlert : Target,
        title: todaySec === 0 ? 'Warning' : 'Encouragement',
        text: todaySec === 0 ? 'Low output so far. Start one clean block now.' : 'One more deep block can finish the day strong.',
      },
    ]
  }, [todaySec, todaySessions, yesterdaySec])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCardIndex((current) => (current + 1) % aiCards.length)
    }, 4500)
    return () => window.clearInterval(timer)
  }, [aiCards.length])

  const summary = useMemo(
    () => [
      { label: 'Hours', value: formatHours(todaySec), icon: Clock3 },
      { label: 'Streak', value: `${profile?.streak ?? 0}`, icon: Flame },
      { label: 'XP', value: `${todayXp}`, icon: Sparkles },
      { label: 'Done', value: `${completedTasks.length}`, icon: BarChart3 },
    ],
    [completedTasks.length, profile?.streak, todaySec, todayXp],
  )

  async function handleTimeLog() {
    if (!uid) return
    const mins = durationMinutes(startTime, endTime)
    if (mins == null || mins <= 0) {
      setFeedback('Select a valid time range.')
      return
    }

    setSaving(true)
    setFeedback(null)
    try {
      const result = await saveStudySession(uid, {
        subject,
        topic: `${startTime}-${endTime}`,
        durationSec: mins * 60,
        startTime,
        endTime,
        timeOfDay: getTimeOfDay(startTime),
      })
      const gainedXp = xpFromStudySeconds(mins * 60)
      setXpPulse(gainedXp)
      window.setTimeout(() => setXpPulse(null), 1200)
      setFeedback(result.queued ? 'Saved offline. Syncing when online.' : 'Study log added.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not save study log.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTaskToggle(task: TaskDoc) {
    if (!uid || !task.id || task.completed) return
    await completeTask(uid, task)
  }

  const liveCard = aiCards[cardIndex]!

  return (
    <main className="home-v2">
      <motion.header className="home-hero card hero-live center-brand" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <div className="brand-center">
          <p className="eyebrow">MI CGL</p>
          <div className="brand-identity" style={{ color: userIdentity.avatar.color }}>
            <AvatarIcon username={user?.username ?? userIdentity.username} size={32} />
            <strong>{profile?.displayName ?? userIdentity.displayName}</strong>
          </div>
        </div>

        <motion.div key={liveCard.title + liveCard.text} className="hero-ai-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
          <div className="hero-ai-head">
            <liveCard.icon size={16} />
            <strong>{liveCard.title}</strong>
          </div>
          <p className="hero-quote">{liveCard.text}</p>
        </motion.div>

        <div className="hero-progress-shell" aria-label="Today progress">
          <div className="hero-progress-head">
            <span>{formatHours(todaySec)} today</span>
            <span>{targetHours}h target</span>
          </div>
          <div className="hero-progress-bar">
            <motion.div className="hero-progress-fill" initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.4 }} />
          </div>
        </div>
      </motion.header>

      <section className="card home-block">
        <div className="home-block-head">
          <h2><CheckCheck size={16} /> Today&apos;s Tasks</h2>
          <span>{pendingTasks.length} open</span>
        </div>
        <div className="home-task-stack">
          {pendingTasks.map((task) => (
            <button key={task.id} type="button" className="home-task-card" onClick={() => void handleTaskToggle(task)}>
              <div>
                <strong>{task.title}</strong>
                <span>{task.subject}</span>
              </div>
              <span className="home-task-toggle" aria-hidden="true" />
            </button>
          ))}
          {pendingTasks.length === 0 ? <p className="muted">No tasks for today.</p> : null}
        </div>
      </section>

      <section className="card home-block home-study-block">
        <div className="home-block-head">
          <h2><Clock3 size={16} /> Study Log</h2>
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        <AnimatePresence>
          {xpPulse ? (
            <motion.div
              className="xp-popup"
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: -8, scale: 1 }}
              exit={{ opacity: 0, y: -22, scale: 0.92 }}
              transition={{ duration: 0.26 }}
            >
              +{xpPulse} XP
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="home-study-panel">
          <label className="field full">
            <span>Subject</span>
            <select value={subject} onChange={(event) => setSubject(event.target.value as Subject)}>
              {logSubjects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <div className="home-study-time-row">
            <label className="field">
              <span>Start Time</span>
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
            </label>
            <label className="field">
              <span>End Time</span>
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </label>
          </div>

          <button type="button" className="btn primary home-log-submit" disabled={saving} onClick={() => void handleTimeLog()}>
            Save
          </button>
        </div>

        {feedback ? <p className="muted">{feedback}</p> : null}
      </section>

      <section className="home-summary-grid">
        {summary.map((item) => (
          <article key={item.label} className="card home-summary-card">
            <item.icon size={18} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </section>

      <section className="card home-block">
        <div className="home-block-head">
          <h2><Target size={16} /> AI Insight</h2>
          <span>Live read</span>
        </div>
        <div className="home-insight-list">
          {aiCards.slice(0, 2).map((item) => (
            <strong key={item.title + item.text}>{item.text}</strong>
          ))}
        </div>
      </section>

      <section className="card home-block">
        <div className="home-block-head">
          <h2><BarChart3 size={16} /> Daily Summary</h2>
          <span>{completedTasks.length} completed</span>
        </div>
        <div className="home-summary-inline">
          <span>{formatHours(todaySec)} studied today</span>
          <span>{profile?.streak ?? 0} day streak</span>
          <span>{todayXp} XP gained</span>
          <span>{completedTasks.length} tasks completed</span>
        </div>
      </section>

      <Countdown />
    </main>
  )
}
