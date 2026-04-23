import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { StudySessionDoc, Subject } from '../types'
import { lastNDaysKeys } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

function buildSubjectStudy(sessions: StudySessionDoc[]) {
  const monthKeys = new Set(lastNDaysKeys(30))
  const totals = new Map<Subject, number>([
    ['Maths', 0],
    ['GS', 0],
    ['English', 0],
    ['Reasoning', 0],
  ])
  for (const session of sessions) {
    if (monthKeys.has(session.dayKey) && totals.has(session.subject)) {
      totals.set(session.subject, (totals.get(session.subject) ?? 0) + session.durationSec)
    }
  }
  const max = Math.max(...[...totals.values()], 1)
  return [...totals.entries()]
    .map(([name, sec]) => {
      const hours = Number((sec / 3600).toFixed(1))
      const ratio = sec / max
      return {
        name: name === 'GS' ? 'GA' : name,
        hours,
        strength: ratio > 0.66 ? 'High' : ratio > 0.33 ? 'Medium' : 'Low',
        color: ratio > 0.66 ? '#00E6A8' : ratio > 0.33 ? '#4DA3FF' : '#FF4D4F',
      }
    })
    .sort((a, b) => b.hours - a.hours)
}

function SubjectTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number; color?: string }>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{payload[0]?.name}</strong>
      <div className="chart-tooltip-row">
        <span className="chart-tooltip-dot" style={{ backgroundColor: payload[0]?.color }} />
        <span>Hours</span>
        <strong>{payload[0]?.value}h</strong>
      </div>
    </div>
  )
}

export function SubjectGraph({ sessions }: Props) {
  const subjectData = useMemo(() => buildSubjectStudy(sessions), [sessions])

  if (subjectData.every((d) => d.hours === 0)) {
    return (
      <div className="graph-card empty-state">
        <p className="muted">No study data yet. Start your first session!</p>
      </div>
    )
  }

  return (
    <div className="graph-card">
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={subjectData} layout="vertical" barSize={20}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, Math.ceil(Math.max(...subjectData.map(d => d.hours), 1) / 1.5)]}
              tick={{ fill: "#9CA3AF", fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#FFFFFF", fontSize: 11 }}
              width={60}
            />
            <Tooltip content={<SubjectTooltip />} />
            <Bar
              dataKey="hours"
              radius={[0, 4, 4, 0]}
              fill="#00E6A8"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
