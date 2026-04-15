import { motion } from 'framer-motion'
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

    const myIndex = leaderboardUsers.findIndex(u => u.uid === myUid)
    if (myIndex === -1) return null

    // Find rival - next person in leaderboard
    const rivalIndex = myIndex > 0 ? myIndex - 1 : myIndex + 1
    return leaderboardUsers[rivalIndex] || null
  }, [leaderboardUsers, myUid])

  const difference = useMemo(() => {
    if (!rival) return 0
    // Convert rival's weekly hours to minutes
    const rivalMinutes = rival.weekHours * 60
    const myMinutes = myStudyTimeToday / 60
    return myMinutes - rivalMinutes
  }, [rival, myStudyTimeToday])

  // Track rank change
  useEffect(() => {
    if (!myUid || leaderboardUsers.length === 0) return

    const myIndex = leaderboardUsers.findIndex(u => u.uid === myUid)
    if (myIndex !== -1) {
      const newRank = myIndex + 1
      if (prevRank > 0 && newRank !== prevRank) {
        setRankChange(newRank - prevRank)
        setPrevRank(newRank)
      } else if (prevRank === 0) {
        setPrevRank(newRank)
      }
    }
  }, [leaderboardUsers, myUid, prevRank])

  if (!rival) return null

  const isAhead = difference > 0
  const diffMinutes = Math.abs(Math.round(difference))

  return (
    <motion.section
      className="card rival-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <div className="card-head">
        <h2>🎯 Your Rival</h2>
      </div>
      
      <div className="rival-info">
        <div className="rival-name">
          <span className="label">Rival</span>
          <strong>{rival.username}</strong>
        </div>
        
        <div className="progress-comparison">
          <div className="progress-row">
            <span className="label">You</span>
            <div className="progress-bar">
              <motion.div
                className="progress-fill my-fill"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((myStudyTimeToday / 60) / 120 * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
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
                animate={{ width: `${Math.min((rival.weekHours * 60) / 120 * 100, 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
            <span className="value">{Math.round(rival.weekHours * 60)}m</span>
          </div>
        </div>

        <motion.div
          className={`difference-badge ${isAhead ? 'ahead' : 'behind'}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 500 }}
        >
          {isAhead ? 'Leading by' : 'Behind by'} {diffMinutes} mins
        </motion.div>

        <motion.p
          className="rival-message"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {isAhead ? 'Hold your position' : 'Push now to take the lead'}
        </motion.p>

        {rankChange !== 0 && (
          <motion.div
            className={`rank-change ${rankChange < 0 ? 'climb' : 'drop'}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {rankChange < 0 ? `You moved up to #${prevRank} 🔥` : `You dropped to #${prevRank}`}
          </motion.div>
        )}
      </div>
    </motion.section>
  )
}
