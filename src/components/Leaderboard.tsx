import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Crown, Medal, X, Zap } from 'lucide-react'

export type LeaderboardRow = {
  username: string
  uid: string
  xp: number
  streak: number
  weekHours: number
  mockCount: number
  lastMock: string
  totalSessions: number
  lastActivity: string
}

type Props = {
  rows: LeaderboardRow[]
  loading: boolean
  meUid?: string | null
  todayXp?: number
}

function getSortedRows(rows: LeaderboardRow[]) {
  return rows.slice().sort((a, b) => b.weekHours - a.weekHours || b.xp - a.xp)
}

function buildCompetitiveMessage(rows: LeaderboardRow[], meUid: string | null | undefined, rankDelta: number) {
  if (!meUid) return null
  const meIndex = rows.findIndex((row) => row.uid === meUid)
  if (meIndex === -1) return null

  const me = rows[meIndex]
  const nextUp = meIndex > 0 ? rows[meIndex - 1] : null

  if (rankDelta > 0) return 'Dropped rank'
  if (meIndex === 0) return 'You lead'
  if (!nextUp) return `#${meIndex + 1}`

  const gapMinutes = Math.max(10, Math.round((nextUp.weekHours - me.weekHours) * 60))
  return `#${meIndex + 1} · ${gapMinutes} min to #${meIndex}`
}

function getRowTone(index: number) {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return 'base'
}

export function Leaderboard({ rows, loading, meUid, todayXp = 0 }: Props) {
  const sorted = useMemo(() => getSortedRows(rows), [rows])
  const [rankDelta, setRankDelta] = useState(0)
  const [previousRank, setPreviousRank] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<LeaderboardRow | null>(null)

  const meIndex = sorted.findIndex((row) => row.uid === meUid)
  const nextUp = meIndex > 0 ? sorted[meIndex - 1] : null
  const gapToNextMinutes =
    meIndex > 0 && nextUp && sorted[meIndex]
      ? Math.max(0, Math.round((nextUp.weekHours - sorted[meIndex].weekHours) * 60))
      : 0
  const message = buildCompetitiveMessage(sorted, meUid, rankDelta)
  const leaderWeekHours = sorted[0]?.weekHours ?? 0
  const selectedRank =
    selectedUser ? sorted.findIndex((row) => row.uid === selectedUser.uid) + 1 : 0
  const selectedProgress =
    selectedUser && leaderWeekHours > 0
      ? Math.min(100, (selectedUser.weekHours / leaderWeekHours) * 100)
      : 0

  useEffect(() => {
    if (meIndex === -1) return
    const currentRank = meIndex + 1
    if (previousRank !== null && previousRank !== currentRank) {
      setRankDelta(previousRank - currentRank)
    }
    setPreviousRank(currentRank)
  }, [meIndex, previousRank])

  return (
    <>
      <motion.section
        className="card leaderboard-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeInOut' }}
      >
        <div className="leaderboard-header">
          <h2>Leaderboard</h2>
          <div className="leaderboard-xp-chip">
            <Zap size={14} />
            <span>+{todayXp}</span>
          </div>
        </div>

        {message ? <p className="lb-msg">{message}</p> : null}

        {meIndex > 0 ? (
          <div className="leaderboard-gap-card">
            <span>Next rank</span>
            <strong>{gapToNextMinutes} min</strong>
          </div>
        ) : null}

        {loading ? (
          <p className="muted">Loading...</p>
        ) : (
          <div className="leaderboard-scroll" role="list" aria-label="Leaderboard">
            {sorted.map((row, index) => {
              const isMe = row.uid === meUid
              const tone = getRowTone(index)
              return (
                <motion.button
                  key={row.uid}
                  layout
                  type="button"
                  role="listitem"
                  className={`leaderboard-row leaderboard-${tone}${isMe ? ' me-row' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut', delay: index * 0.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedUser(row)}
                >
                  <div className="leaderboard-rank-col">
                    <span className="leaderboard-rank-number">#{index + 1}</span>
                    {index === 0 ? (
                      <Crown size={14} className="leaderboard-rank-icon" />
                    ) : (
                      <Medal size={14} className="leaderboard-rank-icon" />
                    )}
                  </div>

                  <div className="leaderboard-content">
                    <div className="leaderboard-name-row">
                      <strong className="leaderboard-name">{row.username}</strong>
                      <div className="leaderboard-badges">
                        {isMe ? <span className="leaderboard-tag you">You</span> : null}
                        {index === 0 ? <span className="leaderboard-tag top">Leader</span> : null}
                      </div>
                    </div>

                    <div className="leaderboard-stats-grid">
                      <span>XP {row.xp}</span>
                      <span>{row.streak}d</span>
                      <span>{row.weekHours.toFixed(1)}h</span>
                    </div>
                  </div>

                  {isMe && rankDelta !== 0 ? (
                    <div className={`leaderboard-shift ${rankDelta > 0 ? 'up' : 'down'}`}>
                      {rankDelta > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    </div>
                  ) : null}
                </motion.button>
              )
            })}
          </div>
        )}
      </motion.section>

      <AnimatePresence>
        {selectedUser ? (
          <>
            <motion.div
              className="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
            />
            <motion.section
              className="profile-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <div className="sheet-head">
                <div>
                  <div className="sheet-label">Profile</div>
                  <h3>{selectedUser.username}</h3>
                </div>
                <button
                  type="button"
                  className="sheet-close"
                  onClick={() => setSelectedUser(null)}
                  aria-label="Close profile"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="sheet-rank-row">
                <div className="sheet-rank-pill">#{selectedRank}</div>
                <div className="sheet-badges">
                  {selectedUser.uid === meUid ? <span className="leaderboard-tag you">You</span> : null}
                  {selectedRank === 1 ? <span className="leaderboard-tag top">Leader</span> : null}
                </div>
              </div>

              <div className="sheet-stats-grid">
                <div className="sheet-stat">
                  <span className="sheet-stat-label">XP</span>
                  <strong>{selectedUser.xp}</strong>
                </div>
                <div className="sheet-stat">
                  <span className="sheet-stat-label">Streak</span>
                  <strong>{selectedUser.streak}d</strong>
                </div>
                <div className="sheet-stat">
                  <span className="sheet-stat-label">7d</span>
                  <strong>{selectedUser.weekHours.toFixed(1)}h</strong>
                </div>
                <div className="sheet-stat">
                  <span className="sheet-stat-label">Sessions</span>
                  <strong>{selectedUser.totalSessions}</strong>
                </div>
              </div>

              <div className="sheet-progress-block">
                <div className="sheet-progress-head">
                  <span className="sheet-stat-label">Progress</span>
                  <strong>{Math.round(selectedProgress)}%</strong>
                </div>
                <div className="sheet-progress-bar">
                  <motion.div
                    className="sheet-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedProgress}%` }}
                    transition={{ duration: 0.32, ease: 'easeInOut' }}
                  />
                </div>
              </div>

              <div className="sheet-meta-list">
                <div className="sheet-meta-row">
                  <span className="sheet-stat-label">Last activity</span>
                  <strong>{selectedUser.lastActivity}</strong>
                </div>
                <div className="sheet-meta-row">
                  <span className="sheet-stat-label">Last mock</span>
                  <strong>{selectedUser.lastMock}</strong>
                </div>
              </div>
            </motion.section>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
