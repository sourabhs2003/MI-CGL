import { AvatarIcon } from './AvatarIcon'
import { useActiveSessions } from '../hooks/useActiveSessions'
import { useLeaderboard } from '../hooks/useLeaderboard'

export function LiveSquadStatus() {
  const activeSessions = useActiveSessions()
  const { rows: leaderboard } = useLeaderboard()

  // Create a map of userId to user data from leaderboard
  const userMap = new Map(leaderboard.map((row) => [row.uid, row]))

  if (activeSessions.length === 0) {
    return (
      <section className="card live-squad-card">
        <div className="card-head">
          <h2>Live Squad Status</h2>
        </div>
        <p className="muted">No active sessions</p>
      </section>
    )
  }

  return (
    <section className="card live-squad-card">
      <div className="card-head">
        <h2>Live Squad Status</h2>
      </div>

      <div className="live-squad-list">
        {activeSessions
          .filter((session) => userMap.has(session.userId))
          .map((session) => {
            const user = userMap.get(session.userId)!
            const elapsedMinutes = Math.floor((Date.now() - session.startTime) / 60000)

            return (
              <div key={session.id} className="live-squad-item">
                <div className="live-squad-user">
                  <AvatarIcon username={user.username} size={32} />
                  <div className="live-squad-info">
                    <span className="live-squad-name">{user.displayName}</span>
                    <span className="live-squad-subject">{session.subject}</span>
                  </div>
                  <div className="live-squad-timer">{elapsedMinutes} min</div>
                </div>
              </div>
            )
          })}
      </div>
    </section>
  )
}
