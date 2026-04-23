import { motion } from 'framer-motion'
import { AvatarIcon } from './AvatarIcon'

type MissionContributor = {
  uid: string
  displayName: string
  username: string
  contributionPct: number
}

type SquadMissionProps = {
  title: string
  goalHours: number
  currentHours: number
  remainingHours: number
  activeMembers: number
  totalMembers: number
  contributors: MissionContributor[]
}

export function SquadMission(props: SquadMissionProps) {
  const { title, goalHours, currentHours, remainingHours, activeMembers, totalMembers, contributors } = props
  const progress = Math.min(100, (currentHours / goalHours) * 100)

  return (
    <motion.section
      className="squad-shell squad-mission-compact"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="squad-mission-topline">
        <strong>{title}</strong>
        <span>{Math.round(progress)}% synced</span>
      </div>

      <div className="squad-mission-summary">
        {goalHours}h goal · {currentHours.toFixed(1)}h done · {remainingHours.toFixed(1)}h left
      </div>

      <div className="squad-mission-meta">
        <span>{activeMembers}/{totalMembers} active now</span>
        <span>{contributors.length} contributors today</span>
      </div>

      <div className="squad-progress-bar squad-progress-bar-thin" aria-label="Squad mission progress">
        <motion.div
          className="squad-progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {contributors.length > 0 ? (
        <div className="squad-avatar-inline">
          {contributors.slice(0, 5).map((member) => (
            <div key={member.uid} className="squad-avatar-inline-item" title={`${member.displayName} ${member.contributionPct}%`}>
              <AvatarIcon username={member.username || member.displayName} size={24} />
            </div>
          ))}
        </div>
      ) : null}
    </motion.section>
  )
}
