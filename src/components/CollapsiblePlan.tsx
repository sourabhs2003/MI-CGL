import { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { StudySessionDoc } from '../types'
import { lastNDaysKeys } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

export function CollapsiblePlan({ sessions }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  const plan = useMemo(() => {
    if (sessions.length === 0) return null

    const monthKeys = new Set(lastNDaysKeys(30))
    const subjectTime = new Map<string, number>()
    
    for (const session of sessions) {
      if (monthKeys.has(session.dayKey)) {
        const subject = session.subject === 'GS' ? 'GA' : session.subject
        subjectTime.set(subject, (subjectTime.get(subject) ?? 0) + session.durationSec)
      }
    }

    // Sort subjects by time spent (reverse to prioritize weak areas)
    const sorted = [...subjectTime.entries()].sort((a, b) => a[1] - b[1])
    
    // Generate plan based on weak areas (less time spent = priority)
    const topWeak = sorted.slice(0, 3).map(([subject], index) => ({
      subject,
      duration: index === 0 ? '1h' : index === 1 ? '1h' : '30m',
    }))

    return topWeak
  }, [sessions])

  if (!plan) {
    return (
      <section className="collapsible-plan">
        <div className="plan-header">
          <span className="plan-title">Today's Plan</span>
        </div>
        <div className="plan-content">
          <p className="muted">No plan available. Start tracking to generate AI plan.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="collapsible-plan">
      <button
        type="button"
        className="plan-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="plan-title">{plan.length} tasks pending</span>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {isExpanded && (
        <div className="plan-content">
          {plan.map((item, index) => (
            <div key={index} className="plan-item">
              <span className="plan-number">{index + 1}</span>
              <span className="plan-subject">{item.subject}</span>
              <span className="plan-duration">{item.duration}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
