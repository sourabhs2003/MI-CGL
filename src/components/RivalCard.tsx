import { motion } from 'framer-motion'
import { Swords } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  myStudyTimeToday: number
  leaderboardUsers: Array<{ uid: string; username: string; xp: number; weekHours: number }>
  myUid: string | undefined
}

export function RivalCard({ myStudyTimeToday, leaderboardUsers, myUid }: Props) {
  const [prevRank, setPrevRank] = useState<number>(0)
  const [rankChange, setRankChange] = useState<number>(0)

  const rival = useMemo(() => {
    if (!myUid || leaderboardUsers.length === 0) return null

    const sorted = leaderboardUsers.slice().sort((a, b) => b.weekHours - a.weekHours || b.xp - a.xp)
    const myIndex = sorted.findIndex((user) => user.uid === myUid)
    if (myIndex === -1) return null

    const rivalIndex = myIndex > 0 ? myIndex - 1 : myIndex + 1
    return sorted[rivalIndex] ?? null
  }, [leaderboardUsers, myUid])

  const difference = useMemo(() => {
    if (!rival) return 0
    const rivalMinutes = rival.weekHours * 60
    const myMinutes = myStudyTimeToday / 60
    return myMinutes - rivalMinutes
  }, [rival, myStudyTimeToday])

  useEffect(() => {
    if (!myUid || leaderboardUsers.length === 0) return

    const sorted = leaderboardUsers.slice().sort((a, b) => b.weekHours - a.weekHours || b.xp - a.xp)
    const myIndex = sorted.findIndex((user) => user.uid === myUid)
    if (myIndex === -1) return

    const newRank = myIndex + 1
    if (prevRank > 0 && newRank !== prevRank) {
      setRankChange(newRank - prevRank)
    }
    setPrevRank(newRank)
  }, [leaderboardUsers, myUid, prevRank])

  if (!rival) return null

  const isAhead = difference > 0
  const diffMinutes = Math.abs(Math.round(difference))

  return (
    <motion.section
      className="card rival-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.28 }}
    >
      <div className="card-head">
        <div className="ai-header">
          <div className="ai-icon">
            <Swords size={18} className="icon active" />
          </div>
          <h2>Rival tracker</h2>
        </div>
      </div>

      <div className="rival-info">
        <div className="rival-name">
          <span className="label">Target</span>
          <strong>{rival.username}</strong>
        </div>

        <div className="progress-comparison">
          <div className="progress-row">
            <span className="label">You</span>
            <div className="progress-bar">
              <motion.div
                className="progress-fill my-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((myStudyTimeToday / 60) / 180) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
            </div>
            <span className="value">{Math.round(myStudyTimeToday / 60)}m</span>
          </div>

          <div className="progress-row">
            <span className="label">{rival.username}</span>
            <div className="progress-bar">
              <motion.div
                className="progress-fill rival-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(((rival.weekHours * 60) / 180) * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.08 }}
              />
            </div>
            <span className="value">{Math.round(rival.weekHours * 60)}m</span>
          </div>
        </div>

        <motion.div
          className={`difference-badge ${isAhead ? 'ahead' : 'behind'}`}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 320 }}
        >
          {isAhead ? 'Leading by' : 'Behind by'} {diffMinutes} mins
        </motion.div>

        <p className="rival-message">
          {isAhead ? 'Keep the pressure on and defend your rank.' : 'One more clean session can flip this race.'}
        </p>

        {rankChange !== 0 ? (
          <motion.div
            className={`rank-change ${rankChange < 0 ? 'climb' : 'drop'}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {rankChange < 0 ? `You climbed to #${prevRank}` : `You slipped to #${prevRank}`}
          </motion.div>
        ) : null}
      </div>
    </motion.section>
  )
}
