import { Clock, Sunrise } from 'lucide-react'
import { useMemo } from 'react'
import type { StudySessionDoc } from '../types'
import { lastNDaysKeys } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

function getHour(session: StudySessionDoc) {
  if (session.startTime && /^\d{2}:/.test(session.startTime)) return Number(session.startTime.slice(0, 2))
  if (session.timeOfDay === 'morning') return 9
  if (session.timeOfDay === 'afternoon') return 14
  if (session.timeOfDay === 'evening') return 18
  return 22
}

function getBucket(hour: number) {
  if (hour < 12) return 'Morning'
  if (hour < 17) return 'Afternoon'
  if (hour < 21) return 'Evening'
  return 'Night'
}

export function TimePattern({ sessions }: Props) {
  const pattern = useMemo(() => {
    const keys = new Set(lastNDaysKeys(30))
    const totals = new Map([
      ['Morning', 0],
      ['Afternoon', 0],
      ['Evening', 0],
      ['Night', 0],
    ])

    for (const session of sessions) {
      if (!keys.has(session.dayKey)) continue
      const bucket = getBucket(getHour(session))
      totals.set(bucket, (totals.get(bucket) ?? 0) + session.durationSec)
    }

    const rows = [...totals.entries()].map(([label, sec]) => ({ label, hours: Number((sec / 3600).toFixed(1)) }))
    const sorted = [...rows].sort((a, b) => b.hours - a.hours)
    return {
      rows,
      peak: sorted[0] ?? { label: '--', hours: 0 },
      weak: sorted.at(-1) ?? { label: '--', hours: 0 },
      max: Math.max(...rows.map((row) => row.hours), 1),
    }
  }, [sessions])

  return (
    <section className="time-pattern">
      <div className="time-pattern-block peak">
        <Sunrise size={15} />
        <span>Peak Time</span>
        <strong>{pattern.peak.label}</strong>
        <small>{pattern.peak.hours}h</small>
      </div>
      <div className="time-pattern-block weak">
        <Clock size={15} />
        <span>Weak Time</span>
        <strong>{pattern.weak.label}</strong>
        <small>{pattern.weak.hours}h</small>
      </div>
      <div className="time-pattern-heat">
        {pattern.rows.map((row) => (
          <span key={row.label} style={{ opacity: 0.25 + (row.hours / pattern.max) * 0.75 }} title={`${row.label}: ${row.hours}h`} />
        ))}
      </div>
    </section>
  )
}
