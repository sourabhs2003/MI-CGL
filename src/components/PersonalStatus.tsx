import { Flame, TrendingUp, TrendingDown } from 'lucide-react'
import { useMemo } from 'react'
import { useActiveSessions } from '../hooks/useActiveSessions'
import { useSessions } from '../hooks/useFirestoreData'
import { useDailyTarget } from '../hooks/useDailyTarget'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useUserProfile } from '../hooks/useUserProfile'
import { lastNDaysKeys, todayKey } from '../lib/dates'

type Props = {
  uid: string
}

function formatHours(seconds: number) {
  return `${(seconds / 3600).toFixed(seconds >= 3600 ? 1 : 2)}h`
}

function getDisplayStreak(streak: number, lastStudyDay: string | null) {
  if (!lastStudyDay) return 0
  const keys = lastNDaysKeys(2)
  return keys.includes(lastStudyDay) ? streak : 0
}

export function PersonalStatus({ uid }: Props) {
  const sessions = useSessions(uid, 500)
  const activeSessions = useActiveSessions()
  const { rows: leaderboard } = useLeaderboard()
  const { profile } = useUserProfile(uid)

  const today = todayKey()

  const todaySessions = sessions.filter((s) => s.dayKey === today)
  const todaySec = todaySessions.reduce((sum, s) => sum + s.durationSec, 0)
  const activeSession = activeSessions.find((session) => session.userId === uid)
  const liveSec = activeSession?.startTime ? Math.max(0, Math.round((Date.now() - activeSession.startTime) / 1000)) : 0
  const displayTodaySec = todaySec + liveSec
  const todayHours = formatHours(displayTodaySec)

  const yesterdayKey = lastNDaysKeys(2)[0]
  const yesterdaySessions = sessions.filter((s) => s.dayKey === yesterdayKey)
  const yesterdaySec = yesterdaySessions.reduce((sum, s) => sum + s.durationSec, 0)

  const weeklyTrend = useMemo(() => {
    if (displayTodaySec > yesterdaySec * 1.1) return 'up'
    if (displayTodaySec < yesterdaySec * 0.9) return 'down'
    return 'same'
  }, [displayTodaySec, yesterdaySec])

  const { targetHours, upgradedToday } = useDailyTarget(uid, displayTodaySec)
  const progressPct = Math.min((displayTodaySec / (targetHours * 3600)) * 100, 100)
  const ringStyle = {
    background: `conic-gradient(#2ED573 ${progressPct * 3.6}deg, rgba(148, 163, 184, 0.16) 0deg)`,
  }
  const streak = getDisplayStreak(profile?.streak ?? 0, profile?.lastStudyDay ?? null)

  const myRank = leaderboard.findIndex((row) => row.uid === uid) + 1
  const myRankDisplay = myRank > 0 ? `#${myRank}` : 'N/A'

  return (
    <section className="card personal-status-card compact">
      <div className="personal-status-header">
        <div className="personal-status-info">
          <span className="personal-status-hours">{todayHours} / {targetHours}h</span>
          <span className="personal-status-rank">{myRankDisplay}</span>
          <span className={`personal-status-target ${upgradedToday ? 'upgraded' : ''}`}>
            {upgradedToday ? `Target upgraded: ${targetHours}h` : `Target: ${targetHours}h`}
          </span>
          <span className={`personal-status-streak ${streak === 0 ? 'broken' : ''}`}>
            <Flame size={14} />
            {streak} Day Streak
          </span>
        </div>
        <div className="personal-status-right">
          <div className="daily-progress-ring" style={ringStyle}>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="personal-status-trend">
          {weeklyTrend === 'up' && <TrendingUp size={16} className="trend-up" />}
          {weeklyTrend === 'down' && <TrendingDown size={16} className="trend-down" />}
          {weeklyTrend === 'same' && <Flame size={16} className="trend-same" />}
          </div>
        </div>
      </div>

      <div className="personal-status-progress">
        <div className="progress-bar-thin">
          <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </section>
  )
}
