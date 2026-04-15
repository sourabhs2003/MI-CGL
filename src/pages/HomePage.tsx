import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Calendar, Check, CheckCircle2, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSessions, useTasks } from '../hooks/useFirestoreData'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useUserProfile } from '../hooks/useUserProfile'
import { todayKey } from '../lib/dates'
import { getRankTier, type RankTier, xpFromStudySeconds } from '../lib/xp'
import { completeTask } from '../services/tasks'
import { saveStudySession } from '../services/studySession'
import type { TaskDoc } from '../types'
import { Leaderboard } from '../components/Leaderboard'
import { StudyInput } from '../components/StudyInput'

function getNextRankName(current: RankTier): string {
  const tiers: RankTier[] = ['Bronze', 'Silver', 'Gold', 'Elite', 'Topper']
  const idx = tiers.indexOf(current)
  return idx < tiers.length - 1 ? tiers[idx + 1] : 'Max'
}

export function HomePage() {
  const { user } = useAuth()
  const uid = user?.uid
  const { profile, error: profileErr } = useUserProfile(uid)
  const sessions = useSessions(uid, 400)
  const tasks = useTasks(uid)
  const { rows: leaderboardUsers, loading: leaderboardLoading, meUid } = useLeaderboard()
  const today = todayKey()
  const [selectedDate, setSelectedDate] = useState(today)
  const [rankUpPulse, setRankUpPulse] = useState(false)
  const [showTaskXP, setShowTaskXP] = useState(false)
  const [taskXPAmount, setTaskXPAmount] = useState(0)

  const todaySec = useMemo(
    () =>
      sessions
        .filter((session) => session.dayKey === today)
        .reduce((sum, session) => sum + session.durationSec, 0),
    [sessions, today],
  )

  const tasksForDate = useMemo(
    () => tasks.filter((task) => task.dateKey === selectedDate && !task.completed),
    [tasks, selectedDate],
  )

  const completedTasksForDate = useMemo(
    () => tasks.filter((task) => task.dateKey === selectedDate && task.completed),
    [tasks, selectedDate],
  )

  const xp = profile?.xp ?? 0
  const streak = profile?.streak ?? 0
  const rank = getRankTier(xp)
  const todayXp = xpFromStudySeconds(todaySec) + taskXPAmount

  useEffect(() => {
    setRankUpPulse(true)
    const timer = window.setTimeout(() => setRankUpPulse(false), 800)
    return () => window.clearTimeout(timer)
  }, [rank.tier])

  async function handleTaskComplete(task: TaskDoc) {
    if (!uid || !task.id) return

    await completeTask(uid, task)

    let earnedXp = 5
    if (task.priority === 'Medium') earnedXp = 10
    if (task.priority === 'High') earnedXp = 15

    setTaskXPAmount((current) => current + earnedXp)
    setShowTaskXP(true)
    window.setTimeout(() => setShowTaskXP(false), 1800)

    confetti({
      particleCount: 50,
      spread: 45,
      origin: { y: 0.64 },
      colors: ['#22c55e', '#facc15'],
    })
  }

  return (
    <main className="home-flow">
      <motion.section
        className="xp-block compact rank-panel home-section"
        initial={{ opacity: 0, y: 12 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: rankUpPulse ? [1, 1.02, 1] : 1,
        }}
        transition={{ duration: 0.24, ease: 'easeInOut' }}
        style={{ borderColor: `${rank.color}55` }}
      >
        <div className="home-xp-head">
          <div>
            <p className="eyebrow">Level</p>
            <h1>{rank.tier}</h1>
          </div>
          <div className="today-xp-chip">+{todayXp} XP</div>
        </div>

        <div className="rank-badge">
          <span className="rank-icon">{rank.icon}</span>
          <div className="rank-info">
            <span className="rank-name">{xp} XP</span>
            <span className="rank-xp">{streak}d streak</span>
          </div>
        </div>

        <div className="xp-bar" aria-hidden>
          <motion.div
            className="xp-fill"
            initial={{ width: 0 }}
            animate={{ width: `${(rank.xpIntoTier / rank.tierTotal) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            style={{ background: `linear-gradient(90deg, ${rank.color}99, ${rank.color})` }}
          />
        </div>

        <p className="xp-hint">
          {rank.xpToNext > 0 ? `${rank.xpToNext} XP to ${getNextRankName(rank.tier)}` : 'Top rank'}
        </p>
      </motion.section>

      {profileErr ? (
        <p className="banner warn home-section">
          Cloud sync issue: {profileErr}. Deploy rules in <code>firestore.rules</code>.
        </p>
      ) : null}

      <section className="home-section">
        <Leaderboard rows={leaderboardUsers} loading={leaderboardLoading} meUid={meUid} todayXp={todayXp} />
      </section>

      <motion.section
        className="card mission-card home-section"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeInOut', delay: 0.04 }}
      >
        <div className="card-head">
          <h2>Today</h2>
          <label className="date-selector" htmlFor="task-date">
            <Calendar size={15} className="icon" />
            <input
              id="task-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="date-input"
            />
          </label>
        </div>

        <AnimatePresence>
          {showTaskXP ? (
            <motion.div
              className="xp-float task-xp-float"
              initial={{ opacity: 0, y: 0, scale: 0.8 }}
              animate={{ opacity: 1, y: -24, scale: 1 }}
              exit={{ opacity: 0, y: -36, scale: 0.9 }}
              transition={{ duration: 0.32, ease: 'easeInOut' }}
            >
              +{taskXPAmount} XP
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="tasks-container">
          <AnimatePresence mode="popLayout">
            {tasksForDate.map((task) => (
              <motion.div
                key={task.id}
                layout
                className={`task-item priority-${task.priority?.toLowerCase() ?? 'low'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="task-content">
                  <div className="task-header">
                    <span className={`task-priority ${task.priority?.toLowerCase() ?? 'low'}`}>
                      {task.priority ?? 'Low'}
                    </span>
                    <span className="task-subject">{task.subject}</span>
                    {task.isGroupTask ? (
                      <span className="task-badge">
                        <Users size={12} />
                        Group
                      </span>
                    ) : null}
                  </div>
                  <p className="task-title">{task.title}</p>
                </div>
                <motion.button
                  type="button"
                  className="btn ghost sm task-check"
                  whileTap={{ scale: 0.98 }}
                  onClick={() => void handleTaskComplete(task)}
                >
                  <Check size={16} className="icon" />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>

          {tasksForDate.length === 0 ? <p className="muted">No active tasks.</p> : null}
        </div>

        {completedTasksForDate.length > 0 ? (
          <div className="completed-tasks compact">
            <h3>Done</h3>
            {completedTasksForDate.map((task) => (
              <div key={task.id} className="task-item completed">
                <div className="task-content">
                  <p className="task-title">{task.title}</p>
                </div>
                <CheckCircle2 size={16} className="icon active" />
              </div>
            ))}
          </div>
        ) : null}
      </motion.section>

      <motion.section
        className="home-section"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeInOut', delay: 0.08 }}
      >
        <StudyInput
          onSaved={async (payload) => {
            if (!uid) return
            await saveStudySession(uid, payload)
          }}
        />
      </motion.section>
    </main>
  )
}
