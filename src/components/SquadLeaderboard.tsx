import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowRight, ArrowUp, Crown, Pause, Play, Signal, Snowflake, X, Zap } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import type { SquadMemberCard } from '../hooks/useSquadPageData'
import { AvatarIcon } from './AvatarIcon'

type SquadLeaderboardProps = {
  members: SquadMemberCard[]
  onSelectMember: (uid: string) => void
  onFreezeSelf: () => void
  onUnfreezeSelf: () => void
}

function movementIcon(movement: SquadMemberCard['rankMovement']) {
  if (movement === 'up') return <ArrowUp size={12} />
  if (movement === 'down') return <ArrowDown size={12} />
  return <ArrowRight size={12} />
}

function momentumIcon(momentum: SquadMemberCard['momentum']) {
  if (momentum === 'up') return <Zap size={12} />
  if (momentum === 'down') return <ArrowDown size={12} />
  return <ArrowRight size={12} />
}

function statusIcon(statusLevel: SquadMemberCard['statusLevel']) {
  if (statusLevel === 'active') return <Signal size={12} />
  if (statusLevel === 'low') return <ArrowRight size={12} />
  if (statusLevel === 'inactive') return <Pause size={12} />
  return <Snowflake size={12} />
}

function gapLabel(member: SquadMemberCard, ranked: SquadMemberCard[]) {
  if (member.frozen || member.rank == null) return null
  const rankIndex = ranked.findIndex((item) => item.uid === member.uid)
  if (rankIndex === -1) return null

  if (rankIndex === 0) {
    const next = ranked[1]
    if (!next) return null
    return `+${member.xp - next.xp} XP ahead of #${next.rank}`
  }

  const above = ranked[rankIndex - 1]
  if (!above) return null
  return `-${above.xp - member.xp} XP from #${above.rank}`
}

export function SquadLeaderboard(props: SquadLeaderboardProps) {
  const { members, onSelectMember, onFreezeSelf, onUnfreezeSelf } = props
  const ranked = useMemo(() => members.filter((member) => !member.frozen), [members])
  const [quickMember, setQuickMember] = useState<SquadMemberCard | null>(null)
  const holdTimerRef = useRef<number | null>(null)

  const clearHoldTimer = () => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current)
      holdTimerRef.current = null
    }
  }

  const startHold = (member: SquadMemberCard) => {
    clearHoldTimer()
    holdTimerRef.current = window.setTimeout(() => {
      setQuickMember(member)
      holdTimerRef.current = null
    }, 420)
  }

  if (members.length === 0) return null

  const topUid = ranked[0]?.uid
  const maxProgressBase = Math.max(...ranked.map((member) => member.todayHours), 0.5)

  return (
    <>
      <section className="squad-shell squad-board-compact">
        <div className="squad-section-head">
          <strong>Leaderboard</strong>
          <span>{members.length} members</span>
        </div>

        <div className="squad-list-compact">
          {members.map((member, index) => {
            const gap = gapLabel(member, ranked)
            const progress = member.frozen ? 0 : Math.max(0, Math.min((member.todayHours / maxProgressBase) * 100, 100))
            const topPlayer = member.uid === topUid

            return (
              <motion.button
                key={member.uid}
                type="button"
                className={`squad-row-compact ${member.frozen ? 'is-frozen' : ''} ${member.isMe ? 'is-me' : ''} ${topPlayer ? 'is-top' : ''} ${member.live ? 'is-live' : ''}`}
                onClick={() => onSelectMember(member.uid)}
                onPointerDown={() => startHold(member)}
                onPointerUp={clearHoldTimer}
                onPointerLeave={clearHoldTimer}
                onPointerCancel={clearHoldTimer}
                onContextMenu={(event) => {
                  event.preventDefault()
                  clearHoldTimer()
                  setQuickMember(member)
                }}
                whileTap={{ scale: 0.995 }}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, delay: index * 0.02 }}
              >
                <div className="squad-row-main">
                  <div className="squad-rank-compact">
                    <strong>{member.rank != null ? `#${member.rank}` : '--'}</strong>
                    <span className={`squad-rank-shift ${member.rankMovement}`}>{movementIcon(member.rankMovement)}</span>
                  </div>

                  <div className="squad-avatar-rank">
                    <AvatarIcon username={member.username || member.displayName} size={24} />
                    {topPlayer ? (
                      <span className="squad-crown-inline">
                        <Crown size={12} />
                      </span>
                    ) : null}
                  </div>

                  <div className="squad-name-compact">
                    <div className="squad-name-row">
                      <strong>{member.displayName}</strong>
                      <span className={`squad-status-compact ${member.statusLevel}`}>{statusIcon(member.statusLevel)}</span>
                      <span className={`squad-momentum ${member.momentum}`}>{momentumIcon(member.momentum)}</span>
                      {member.live ? <span className="squad-live-pill mini">Live</span> : null}
                    </div>
                    {gap ? <span>{gap}</span> : <span>{member.role ?? member.status}</span>}
                  </div>

                  <div className="squad-metrics-compact">
                    <span>{member.xp} XP</span>
                    <strong>{member.todayHours.toFixed(1)}h</strong>
                  </div>
                </div>

                <div className="squad-row-progress">
                  <motion.div
                    className="squad-row-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.35 }}
                  />
                </div>
              </motion.button>
            )
          })}
        </div>
      </section>

      <AnimatePresence>
        {quickMember ? (
          <motion.div
            className="squad-quick-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQuickMember(null)}
          >
            <motion.div
              className="squad-quick-sheet"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="squad-quick-head">
                <strong>{quickMember.displayName}</strong>
                <button type="button" className="squad-inline-btn" onClick={() => setQuickMember(null)} aria-label="Close quick actions">
                  <X size={14} />
                </button>
              </div>

              <button
                type="button"
                className="squad-quick-action"
                onClick={() => {
                  onSelectMember(quickMember.uid)
                  setQuickMember(null)
                }}
              >
                <span>Compare</span>
              </button>

              <button
                type="button"
                className="squad-quick-action"
                onClick={() => {
                  onSelectMember(quickMember.uid)
                  setQuickMember(null)
                }}
              >
                <span>View details</span>
              </button>

              {quickMember.isMe ? (
                <button
                  type="button"
                  className="squad-quick-action"
                  onClick={() => {
                    if (quickMember.frozen) onUnfreezeSelf()
                    else onFreezeSelf()
                    setQuickMember(null)
                  }}
                >
                  {quickMember.frozen ? <Play size={14} /> : <Pause size={14} />}
                  <span>{quickMember.frozen ? 'Unfreeze' : 'Freeze'}</span>
                </button>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
