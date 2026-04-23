import { motion } from 'framer-motion'
import { AvatarIcon } from './AvatarIcon'

interface ContributionMember {
  displayName: string
  username?: string
  contribution: number
  avatarColor?: string
  isMe?: boolean
}

interface TeamContributionProps {
  members: ContributionMember[]
}

export function TeamContribution({ members }: TeamContributionProps) {
  const sortedMembers = [...members].sort((a, b) => b.contribution - a.contribution)
  const lowestContributor = sortedMembers[sortedMembers.length - 1]

  return (
    <div className="team-contribution-section">
      <h3>Team Contribution</h3>
      
      <div className="team-contribution-bar">
        {sortedMembers.map((member, index) => (
          <motion.div
            key={index}
            className="team-contribution-segment"
            initial={{ width: 0 }}
            animate={{ width: `${member.contribution}%` }}
            transition={{ duration: 0.8, delay: index * 0.1 }}
            style={{
              background: member.avatarColor || `hsl(${index * 60}, 70%, 50%)`,
            }}
            title={`${member.displayName}: ${member.contribution}%`}
          />
        ))}
      </div>

      <div className="team-contribution-list">
        {sortedMembers.map((member, index) => (
          <div
            key={index}
            className={`team-contribution-item ${member.isMe ? 'team-contribution-me' : ''} ${member === lowestContributor ? 'team-contribution-lowest' : ''}`}
          >
            <div className="team-contribution-member">
              <AvatarIcon username={member.username || member.displayName} size={24} />
              <span>{member.displayName}</span>
              {member.isMe && <span className="team-contribution-you">(You)</span>}
            </div>
            <div className="team-contribution-value">
              <strong>{member.contribution}%</strong>
              {member === lowestContributor && (
                <span className="team-contribution-lowest-tag">Lowest</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
