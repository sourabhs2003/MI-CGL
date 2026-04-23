import { useEffect, useMemo, useState } from 'react'
import { AvatarIcon } from './AvatarIcon'
import { useActiveSessions } from '../hooks/useActiveSessions'
import { useLeaderboard } from '../hooks/useLeaderboard'
import type { ActiveSession } from '../services/studySession'

function getSquadTag(todayHours: number, targetHours: number): { text: string; className: string } {
  const progress = todayHours / targetHours

  if (progress >= 0.8) return { text: 'On pace', className: 'tag-fire' }
  if (progress >= 0.25) return { text: 'Needs push', className: 'tag-behind' }
  return { text: 'Low output', className: 'tag-inactive' }
}

function getMemberStatus(userId: string, activeSessions: ActiveSession[]): { status: 'studying' | 'idle' | 'inactive'; session?: ActiveSession } {
  const session = activeSessions.find((item) => item.userId === userId)
  if (session) {
    return { status: 'studying', session }
  }
  return { status: 'idle' }
}

function getStatusLabel(status: 'studying' | 'idle' | 'inactive', subject?: string) {
  if (status === 'studying') return `Studying ${subject ?? ''}`.trim()
  if (status === 'idle') return 'Idle'
  return 'Inactive'
}

export function SquadCompetition() {
  const { rows: leaderboard } = useLeaderboard()
  const activeSessions = useActiveSessions()
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [now, setNow] = useState(Date.now())
  const targetHours = 4

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(intervalId)
  }, [])

  const myUid = useMemo(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return null
      const user = JSON.parse(raw) as { uid: string }
      return user.uid
    } catch {
      return null
    }
  }, [])

  const rankedMembers = leaderboard
    .filter((user) => !user.inactive)
    .map((user) => {
      const active = activeSessions.find((session) => session.userId === user.uid)
      const liveHours = active ? Math.max(0, (now - active.startTime) / 3600000) : 0
      return {
        ...user,
        displayTodayHours: user.todayHours + liveHours,
        rankingActivityMs: active?.startTime ?? user.latestTodayActivityMs ?? 0,
      }
    })
    .sort((a, b) => {
      if (b.displayTodayHours !== a.displayTodayHours) return b.displayTodayHours - a.displayTodayHours
      return b.rankingActivityMs - a.rankingActivityMs
    })

  const displayMembers = rankedMembers.slice(0, 4)
  const frozenMembers = leaderboard.filter((user) => user.inactive).slice(0, 2)

  return (
    <section className="card squad-competition-card">
      <div className="card-head">
        <h2>Squad Competition</h2>
      </div>

      <div className="squad-members-grid">
        {displayMembers.map((user) => {
          const { status, session } = getMemberStatus(user.uid, activeSessions)
          const isExpanded = expandedUser === user.uid
          const tag = getSquadTag(user.displayTodayHours, targetHours)
          const rank = rankedMembers.findIndex((row) => row.uid === user.uid) + 1
          const isLastVisible = rank === displayMembers.length
          const isInactive = status !== 'studying' && user.displayTodayHours < 0.1
          const statusLabel = getStatusLabel(isInactive ? 'inactive' : status, session?.subject)

          return (
            <div
              key={user.uid}
              className={`squad-member-card ${isExpanded ? 'expanded' : ''} ${user.uid === myUid ? 'me' : ''} ${status === 'studying' ? 'studying-glow' : ''} ${rank === 1 ? 'top-performer' : ''} ${isLastVisible ? 'last-place' : ''} ${isInactive ? 'inactive-member' : ''}`}
              onClick={() => setExpandedUser(isExpanded ? null : user.uid)}
            >
              <div className="squad-member-main">
                <AvatarIcon username={user.username} size={32} />
                <div className="squad-member-info">
                  <span className="squad-member-name">{user.displayName}</span>
                </div>
                <span className="squad-member-time">{user.displayTodayHours.toFixed(1)}h</span>
                <span className={`squad-status-dot dot-${isInactive ? 'inactive' : status}`} aria-label={statusLabel} />
                <span className={`rank-badge rank-${rank}`}>#{rank}</span>
              </div>

              {isExpanded ? (
                <div className="squad-member-details">
                  <div className="squad-subject-inline">
                    {Object.entries(user.todaySubjects).length > 0 ? (
                      Object.entries(user.todaySubjects).map(([subject, hours]) => (
                        <span key={subject} className="squad-subject-time">
                          <span>{subject}</span>
                          <strong>{hours.toFixed(1)}h</strong>
                        </span>
                      ))
                    ) : (
                      <p className="muted squad-no-subjects">No subject time logged today.</p>
                    )}
                  </div>
                  <div className="squad-expanded-status">
                    <span>{statusLabel}</span>
                    {status === 'studying' && session ? <strong>{Math.floor((now - session.startTime) / 60000)}m</strong> : null}
                  </div>
                  <div className="squad-member-subjects">
                    <span className="detail-label">Momentum</span>
                    <span className={`detail-value ai-tag ${tag.className}`}>{tag.text}</span>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}

        {frozenMembers.map((user) => (
          <div key={user.uid} className="squad-member-card inactive-member frozen-member">
            <div className="squad-member-main">
              <AvatarIcon username={user.username} size={32} />
              <div className="squad-member-info">
                <span className="squad-member-name">{user.displayName}</span>
              </div>
              <span className="squad-member-time">{user.todayHours.toFixed(1)}h</span>
              <span className="squad-status-dot dot-inactive" aria-label="Frozen" />
              <span className="rank-badge">Frozen</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
