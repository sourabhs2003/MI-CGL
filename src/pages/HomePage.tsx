import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Check, Calendar, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSessions, useTasks } from '../hooks/useFirestoreData'
import { useUserProfile } from '../hooks/useUserProfile'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { getRankTier, type RankTier } from '../lib/xp'
import { todayKey } from '../lib/dates'
import { completeTask } from '../services/tasks'
import { saveStudySession } from '../services/studySession'
import type { TaskDoc } from '../types'
import { Countdown } from '../components/Countdown'
import { Leaderboard } from '../components/Leaderboard'
import { StatStrip } from '../components/StatStrip'
import { QuickActions } from '../components/QuickActions'
import { StudyInput } from '../components/StudyInput'
import { RivalCard } from '../components/RivalCard'
import { AICoach } from '../components/AICoach'

function getNextRankName(current: RankTier): string {
  const tiers: RankTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Topper']
  const idx = tiers.indexOf(current)
  return idx < tiers.length - 1 ? tiers[idx + 1] : 'Max'
}

export function HomePage() {
  const { user } = useAuth()
  const uid = user?.uid
  const { profile, error: profileErr } = useUserProfile(uid)
  const sessions = useSessions(uid, 400)
  const tasks = useTasks(uid)
  const { rows: leaderboardUsers, loading: leaderboardLoading } = useLeaderboard()
  const today = todayKey()
  const [selectedDate, setSelectedDate] = useState(today)

  const todaySec = useMemo(() => {
    return sessions
      .filter((s) => s.dayKey === today)
      .reduce((a, s) => a + s.durationSec, 0)
  }, [sessions, today])

  const weekSec = useMemo(() => {
    return sessions
      .filter((s) => {
        const d = new Date(s.dayKey)
        const now = new Date()
        const diff = now.getTime() - d.getTime()
        return diff < 7 * 24 * 60 * 60 * 1000
      })
      .reduce((a, s) => a + s.durationSec, 0)
  }, [sessions])

  const focusToday = useMemo(() => {
    return sessions.filter((s) => s.dayKey === today).length
  }, [sessions, today])

  const tasksForDate = useMemo(
    () => tasks.filter((t) => t.dateKey === selectedDate && !t.completed),
    [tasks, selectedDate],
  )

  const completedTasksForDate = useMemo(
    () => tasks.filter((t) => t.dateKey === selectedDate && t.completed),
    [tasks, selectedDate],
  )

  const xp = profile?.xp ?? 0
  const streak = profile?.streak ?? 0
  const rank = getRankTier(xp)
  const [rankUpPulse, setRankUpPulse] = useState(false)
  const [prevRank, setPrevRank] = useState<string>(rank.tier)
  const [showTaskXP, setShowTaskXP] = useState(false)
  const [taskXPAmount, setTaskXPAmount] = useState(0)

  // Detect rank up
  useEffect(() => {
    if (rank.tier !== prevRank) {
      setRankUpPulse(true)
      setTimeout(() => setRankUpPulse(false), 2000)
      setPrevRank(rank.tier)
    }
  }, [rank.tier, prevRank])

  async function handleTaskComplete(task: TaskDoc) {
    if (!uid || !task.id) return
    await completeTask(uid, task.id)
    
    // Calculate XP based on priority
    let xp = 5
    if (task.priority === 'High') xp = 15
    if (task.priority === 'Medium') xp = 10
    
    setTaskXPAmount(xp)
    setShowTaskXP(true)
    setTimeout(() => setShowTaskXP(false), 2000)
    
    // Trigger confetti animation
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#6366f1', '#8b5cf6', '#a855f7'],
    })
  }

  return (
    <>
      <header className="top-bar battle-header">
        <div className="header-main">
          <p className="eyebrow">MI CGL</p>
          <h1>Your Battle Dashboard</h1>
          <motion.div
            className="streak-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <motion.span
              className="streak-flame"
              animate={{
                scale: [1, 1.1, 1],
                opacity: streak === 0 ? 0.5 : 1,
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{ fontSize: `${1 + Math.min(streak * 0.1, 0.8)}rem` }}
            >
              🔥
            </motion.span>
            <motion.span
              className="streak-text"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              {streak === 0
                ? 'Start your streak today'
                : streak <= 3
                ? 'Good start. Don\'t break it'
                : streak <= 7
                ? 'Momentum building'
                : 'Unstoppable'}
            </motion.span>
          </motion.div>
        </div>
        <motion.div
          className="xp-block compact"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            boxShadow: rankUpPulse 
              ? [`0 0 20px ${rank.color}40`, `0 0 40px ${rank.color}80`, `0 0 20px ${rank.color}40`]
              : `0 0 20px ${rank.color}20`
          }}
          transition={{ 
            duration: 0.4, 
            delay: 0.2,
            boxShadow: rankUpPulse ? { duration: 0.6, repeat: 3 } : { duration: 0.4 }
          }}
          style={{ borderColor: rank.color }}
        >
          <div className="rank-badge">
            <motion.span
              className="rank-icon"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 500 }}
            >
              {rank.icon}
            </motion.span>
            <div className="rank-info">
              <motion.span
                className="rank-name"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                style={{ color: rank.color }}
              >
                {rank.tier}
              </motion.span>
              <motion.span
                className="rank-xp"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                {xp} XP
              </motion.span>
            </div>
          </div>
          <div className="xp-bar" aria-hidden>
            <motion.div
              className="xp-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(rank.xpIntoTier / rank.tierTotal) * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut', delay: 0.45 }}
              style={{ 
                width: `${(rank.xpIntoTier / rank.tierTotal) * 100}%`,
                background: `linear-gradient(90deg, ${rank.color}80, ${rank.color})`
              }}
            />
          </div>
          <motion.p
            className="xp-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {rank.xpToNext > 0 ? `${rank.xpToNext} XP to ${rank.tier === 'Topper' ? 'Max' : getNextRankName(rank.tier)}` : 'Max Rank!'}
          </motion.p>
        </motion.div>
      </header>

      {profileErr ? (
        <p className="banner warn">
          Cloud sync issue: {profileErr}. Deploy rules in{' '}
          <code>firestore.rules</code> (allowed user ids: user1–user4).
        </p>
      ) : null}

      <StatStrip
        todaySec={todaySec}
        weekSec={weekSec}
        focusToday={focusToday}
      />

      <QuickActions />

      <Leaderboard />

      <motion.section
        className="card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="card-head">
          <h2>Tasks for {selectedDate}</h2>
          <div className="date-selector">
            <Calendar size={18} className="icon" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-input"
            />
          </div>
        </div>

        <AnimatePresence>
          {showTaskXP && (
            <motion.div
              className="xp-float task-xp-float"
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -30, scale: 1.2 }}
              exit={{ opacity: 0, y: -50, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              +{taskXPAmount} XP
            </motion.div>
          )}
        </AnimatePresence>

        <div className="tasks-container">
          <AnimatePresence mode="popLayout">
            {tasksForDate.map((task) => (
              <motion.div
                key={task.id}
                className="task-item"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <div className="task-content">
                  <div className="task-header">
                    <span className={`task-priority ${task.priority?.toLowerCase()}`}>
                      {task.priority}
                    </span>
                    <span className="task-subject">{task.subject}</span>
                  </div>
                  <p className="task-title">{task.title}</p>
                </div>
                <button
                  type="button"
                  className="btn ghost sm task-check"
                  onClick={() => void handleTaskComplete(task)}
                >
                  <Check size={16} className="icon" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {tasksForDate.length === 0 && (
            <motion.p
              className="muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No tasks for this date
            </motion.p>
          )}
        </div>

        <div className="completed-tasks">
          <h3>Completed</h3>
          <AnimatePresence mode="popLayout">
            {completedTasksForDate.map((task) => (
              <motion.div
                key={task.id}
                className="task-item completed"
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <div className="task-content">
                  <div className="task-header">
                    <span className="task-subject">{task.subject}</span>
                  </div>
                  <p className="task-title">{task.title}</p>
                </div>
                <CheckCircle2 size={16} className="icon active" />
              </motion.div>
            ))}
          </AnimatePresence>
          {completedTasksForDate.length === 0 && (
            <motion.p
              className="muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No completed tasks
            </motion.p>
          )}
        </div>
      </motion.section>

      <main className="grid-main">
        <StudyInput
          onSaved={async (payload) => {
            if (!uid) return
            await saveStudySession(uid, payload)
          }}
        />
      </main>

      {!leaderboardLoading && (
        <RivalCard
          myStudyTimeToday={todaySec}
          leaderboardUsers={leaderboardUsers}
          myUid={uid}
        />
      )}

      <AICoach
        todayStudyTime={todaySec}
        streak={streak}
        rank={rank.tier}
        leaderboardPosition={leaderboardUsers.findIndex(u => u.uid === uid) + 1}
      />

      <Countdown />

      <footer className="footer-note">
        <Link to="/dashboard">Open full analytics</Link>
      </footer>
    </>
  )
}
