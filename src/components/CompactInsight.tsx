import { useState } from 'react'
import { AlertTriangle, ChevronDown, Lightbulb } from 'lucide-react'
import type { StudySessionDoc } from '../types'
import { lastNDaysKeys, todayKey } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

export function CompactInsight({ sessions }: Props) {
  const [expanded, setExpanded] = useState(false)
  const monthKeys = new Set(lastNDaysKeys(30))
  const today = todayKey()

  const totals = new Map<string, number>()
  for (const session of sessions) {
    if (monthKeys.has(session.dayKey)) {
      const subject = session.subject === 'GS' ? 'GA' : session.subject
      totals.set(subject, (totals.get(subject) ?? 0) + session.durationSec)
    }
  }

  const todaySessions = sessions.filter((s) => s.dayKey === today)
  const todaySec = todaySessions.reduce((sum, s) => sum + s.durationSec, 0)
  const dailyTarget = 6 * 3600

  let insight = ''
  let action = ''
  let severity: 'critical' | 'weak' | 'good' = 'good'

  if (sessions.length === 0) {
    insight = 'No data yet. Start tracking.'
    action = 'Start your first focused study session.'
    severity = 'weak'
  } else if ((totals.get('GA') ?? 0) === 0) {
    insight = 'GA ignored -> score risk rising.'
    action = 'Fix now: add one GA block before more revision.'
    severity = 'critical'
  } else if (todaySec < dailyTarget * 0.5) {
    const hoursNeeded = ((dailyTarget - todaySec) / 3600).toFixed(1)
    insight = 'Slow day. Daily target is behind.'
    action = `Add ${hoursNeeded}h today to recover the plan.`
    severity = 'weak'
  } else if (totals.size > 1) {
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1])
    const strongest = sorted[0]?.[0] || 'None'
    const weakest = sorted.at(-1)?.[0] || 'None'
    const strongestHours = (sorted[0]?.[1] ?? 0) / 3600
    const weakestHours = (sorted.at(-1)?.[1] ?? 0) / 3600

    if (strongestHours > weakestHours * 3) {
      insight = `${weakest} neglected -> imbalance forming.`
      action = `Move 30-60 min from ${strongest} into ${weakest}.`
      severity = 'critical'
    } else {
      insight = 'Distribution is balanced.'
      action = 'Keep the split and push quality.'
    }
  } else {
    const subject = [...totals.keys()][0] ?? 'one subject'
    insight = `Only ${subject} has study data.`
    action = 'Add one weak subject today.'
    severity = 'weak'
  }

  return (
    <section className={`compact-insight severity-${severity}`}>
      <button type="button" className="insight-row" onClick={() => setExpanded((value) => !value)}>
        {severity === 'critical' ? <AlertTriangle size={16} className="insight-icon" /> : <Lightbulb size={16} className="insight-icon" />}
        <span className="insight-text">{insight}</span>
        <span className="insight-cta">Fix Now</span>
        <ChevronDown size={15} className={expanded ? 'open' : ''} />
      </button>
      {expanded ? (
        <div className="insight-action">
          <span className="action-text">{action}</span>
        </div>
      ) : null}
    </section>
  )
}
