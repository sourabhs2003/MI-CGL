import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { SquadFeedItem } from '../hooks/useSquadPageData'
import { AvatarIcon } from './AvatarIcon'

type LiveActivityFeedProps = {
  activities: SquadFeedItem[]
}

export function LiveActivityFeed({ activities }: LiveActivityFeedProps) {
  const [expanded, setExpanded] = useState(false)

  if (activities.length === 0) return null

  const latest = activities[0]
  const hasRecentActivity = latest ? Date.now() - latest.occurredAtMs <= 3 * 60 * 60 * 1000 : false
  const defaultExpanded = hasRecentActivity && activities.length <= 3

  useEffect(() => {
    setExpanded(defaultExpanded)
  }, [defaultExpanded, latest?.id])

  const visible = useMemo(() => {
    if (!expanded) return latest ? [latest] : []
    return activities
  }, [activities, expanded, latest])

  return (
    <section className="squad-shell squad-feed-compact">
      <div className="squad-section-head">
        <strong>Activity</strong>
        <span>{latest ? latest.timestampLabel : 'No activity'}</span>
        {activities.length > 1 && (
          <button type="button" className="squad-inline-btn" onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Show less' : 'View all'}
          </button>
        )}
      </div>

      <div className="squad-feed-compact-list">
        <AnimatePresence initial={false}>
          {visible.map((activity, index) => (
            <motion.div
              key={activity.id}
              className="squad-feed-row"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, delay: index * 0.02 }}
            >
              <AvatarIcon username={activity.username || activity.displayName} size={22} />
              <div className="squad-feed-row-copy">
                <span><strong>{activity.displayName}</strong> {activity.action}</span>
                <small>{activity.timestampLabel}</small>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}
