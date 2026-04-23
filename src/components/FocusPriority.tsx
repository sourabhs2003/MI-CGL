import { useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import type { StudySessionDoc, MockDoc } from '../types'
import { lastNDaysKeys } from '../lib/dates'
import { splitMocks } from '../lib/mockAnalytics'

type Props = {
  sessions: StudySessionDoc[]
  mocks: MockDoc[]
}

type PriorityItem = {
  subject: string
  level: 'Critical' | 'Weak' | 'Moderate'
  reason: string
  progress: number
}

export function FocusPriority({ sessions, mocks }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const { tier1Mocks, tier2Mocks, sectionalMocks } = useMemo(() => splitMocks(mocks), [mocks])
  const allMocks = [...tier1Mocks, ...tier2Mocks, ...sectionalMocks]

  const priorities = useMemo(() => {
    const monthKeys = new Set(lastNDaysKeys(30))
    const subjectTime = new Map<string, number>()
    
    // Calculate study time per subject
    for (const session of sessions) {
      if (monthKeys.has(session.dayKey)) {
        const subject = session.subject === 'GS' ? 'GA' : session.subject
        subjectTime.set(subject, (subjectTime.get(subject) ?? 0) + session.durationSec)
      }
    }

    // Calculate sectional accuracy from mocks
    const sectionAccuracy = new Map<string, number>()
    for (const mock of allMocks) {
      if ('sections' in mock) {
        for (const section of mock.sections) {
          const existing = sectionAccuracy.get(section.name)
          const accuracy = (section.score / section.total) * 100
          if (existing === undefined) {
            sectionAccuracy.set(section.name, accuracy)
          } else {
            sectionAccuracy.set(section.name, (existing + accuracy) / 2)
          }
        }
      }
    }

    const priorities: PriorityItem[] = []

    // Generate priorities based on real data
    for (const subject of ['GA', 'English', 'Reasoning', 'Maths']) {
      const timeHours = (subjectTime.get(subject) ?? 0) / 3600
      const accuracy = sectionAccuracy.get(subject) ?? 0

      if (timeHours === 0 && accuracy === 0) {
        priorities.push({
          subject,
          level: 'Critical',
          reason: 'no study + no data',
          progress: 5,
        })
      } else if (accuracy < 50 && timeHours < 2) {
        priorities.push({
          subject,
          level: 'Critical',
          reason: 'low score + no study',
          progress: Math.max(8, Math.min(accuracy, 35)),
        })
      } else if (accuracy < 60) {
        priorities.push({
          subject,
          level: 'Weak',
          reason: 'low accuracy',
          progress: Math.max(20, Math.min(accuracy, 58)),
        })
      } else if (timeHours < 1) {
        priorities.push({
          subject,
          level: 'Weak',
          reason: 'no study time',
          progress: Math.min(45, Math.max(8, timeHours * 45)),
        })
      } else if (accuracy < 75) {
        priorities.push({
          subject,
          level: 'Moderate',
          reason: 'needs improvement',
          progress: Math.max(55, Math.min(accuracy, 74)),
        })
      }
    }

    // Sort by severity
    const levelOrder = { Critical: 0, Weak: 1, Moderate: 2 }
    return priorities.sort((a, b) => levelOrder[a.level] - levelOrder[b.level])
  }, [sessions, allMocks])

  if (priorities.length === 0) {
    return null
  }

  return (
    <section className="focus-priority">
      <div className="priority-header">
        <AlertTriangle size={16} className="priority-icon" />
        <span className="priority-title">🔥 Priority Focus</span>
      </div>
      <div className="priority-list">
        {priorities.slice(0, 3).map((item, index) => (
          <button
            key={index}
            type="button"
            className={`priority-item priority-${item.level.toLowerCase()} ${expandedIndex === index ? 'expanded' : ''}`}
            onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
          >
            <span className="priority-number">{index + 1}</span>
            <div className="priority-content">
              <span className="priority-line">
                <strong className="priority-subject">{item.subject}</strong>
                <span className="priority-reason">{item.reason}</span>
              </span>
              <span className="priority-progress">
                <span style={{ width: `${item.progress}%` }} />
              </span>
              {expandedIndex === index ? <span className="priority-detail">Fix this before adding low-value revision.</span> : null}
            </div>
            <span className={`priority-badge priority-${item.level.toLowerCase()}`}>
              {item.level}
            </span>
            <ChevronDown size={14} className={expandedIndex === index ? 'open' : ''} />
          </button>
        ))}
      </div>
    </section>
  )
}
