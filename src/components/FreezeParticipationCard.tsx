import { motion } from 'framer-motion'
import { PauseCircle, PlayCircle, Snowflake } from 'lucide-react'

type Props = {
  isFrozen: boolean
  canFreeze: boolean
  freezeRemainingMs: number
  cooldownRemainingMs: number
  onFreeze: () => void
  onUnfreeze: () => void
}

function formatCountdown(ms: number) {
  const totalMinutes = Math.ceil(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

export function FreezeParticipationCard(props: Props) {
  const { isFrozen, canFreeze, freezeRemainingMs, cooldownRemainingMs, onFreeze, onUnfreeze } = props

  return (
    <motion.section
      className="squad-shell squad-freeze-card"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
    >
      <div className="squad-card-head">
        <div>
          <p className="squad-kicker">Freeze Participation</p>
          <h3>{isFrozen ? 'Participation paused' : 'Stay accountable'}</h3>
        </div>
        <Snowflake size={18} />
      </div>

      <p className="squad-freeze-copy">
        Frozen users are excluded from the squad mission, contribution percentages, and health score.
      </p>

      {isFrozen ? (
        <div className="squad-freeze-row">
          <span>Auto-unfreezes on a new study session or after the limit expires.</span>
          <strong>{formatCountdown(freezeRemainingMs)} remaining</strong>
        </div>
      ) : (
        <div className="squad-freeze-row">
          <span>{canFreeze ? 'Freeze is available now.' : 'Freeze is on cooldown.'}</span>
          {!canFreeze && <strong>{formatCountdown(cooldownRemainingMs)} cooldown</strong>}
        </div>
      )}

      <button
        type="button"
        className={`squad-action-btn ${isFrozen ? 'secondary' : 'primary'}`}
        onClick={isFrozen ? onUnfreeze : onFreeze}
        disabled={!isFrozen && !canFreeze}
      >
        {isFrozen ? <PlayCircle size={16} /> : <PauseCircle size={16} />}
        <span>{isFrozen ? 'Manual unfreeze' : 'Freeze participation'}</span>
      </button>
    </motion.section>
  )
}
