import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { StudySessionDoc } from '../types'
import { lastNDaysKeys } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

export function MinimizedHeatmap({ sessions }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  const heatmapData = useMemo(() => {
    const keys = lastNDaysKeys(14)
    const timeSlots = [
      { id: 'early-morning', label: '6–9 AM', start: 6, end: 9 },
      { id: 'late-morning', label: '9–12 PM', start: 9, end: 12 },
      { id: 'afternoon', label: '12–3 PM', start: 12, end: 15 },
      { id: 'late-afternoon', label: '3–6 PM', start: 15, end: 18 },
      { id: 'evening', label: '6–9 PM', start: 18, end: 21 },
      { id: 'night', label: '9–12 AM', start: 21, end: 24 },
    ]

    const slotTotals = new Map<string, number>()
    for (const slot of timeSlots) {
      slotTotals.set(slot.id, 0)
    }

    for (const session of sessions) {
      if (!keys.includes(session.dayKey)) continue
      const time = session.startTime ?? session.endTime ?? session.topic.slice(0, 5)
      const hour = Number(time.slice(0, 2))
      if (!Number.isNaN(hour)) {
        const slot = timeSlots.find((s) => hour >= s.start && hour < s.end)
        if (slot) {
          slotTotals.set(slot.id, (slotTotals.get(slot.id) ?? 0) + session.durationSec)
        }
      }
    }

    const peakSlot = [...slotTotals.entries()].sort((a, b) => b[1] - a[1])[0]
    const weakSlot = [...slotTotals.entries()].sort((a, b) => a[1] - b[1])[0]

    const peakLabel = timeSlots.find((s) => s.id === peakSlot[0])?.label || 'Unknown'
    const weakLabel = timeSlots.find((s) => s.id === weakSlot[0])?.label || 'Unknown'

    // Generate suggestion based on real data
    let suggestion = ''
    if (weakSlot[1] === 0) {
      suggestion = `Start studying in ${weakLabel}`
    } else if (peakSlot[1] > weakSlot[1] * 3) {
      suggestion = `Shift 1 session to ${weakLabel}`
    } else {
      suggestion = 'Your time distribution is balanced'
    }

    return {
      peak: { label: peakLabel, hours: (peakSlot[1] / 3600).toFixed(1) },
      weak: { label: weakLabel, hours: (weakSlot[1] / 3600).toFixed(1) },
      suggestion,
    }
  }, [sessions])

  if (sessions.length === 0) {
    return null
  }

  return (
    <section className="minimized-heatmap">
      <button
        type="button"
        className="heatmap-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="heatmap-title">Time Pattern</span>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {!isExpanded ? (
        <div className="heatmap-summary">
          <div className="summary-item">
            <span className="summary-label">Peak</span>
            <strong className="summary-value">{heatmapData.peak.label}</strong>
          </div>
          <div className="summary-item">
            <span className="summary-label">Weak</span>
            <strong className="summary-value">{heatmapData.weak.label}</strong>
          </div>
        </div>
      ) : (
        <div className="heatmap-expanded">
          <div className="expanded-item">
            <span className="expanded-label">🧠 Peak Time</span>
            <span className="expanded-value">{heatmapData.peak.label} ({heatmapData.peak.hours}h)</span>
          </div>
          <div className="expanded-item">
            <span className="expanded-label">⚠ Weak Zone</span>
            <span className="expanded-value">{heatmapData.weak.label} ({heatmapData.weak.hours}h)</span>
          </div>
          <div className="heatmap-recommendation">
            <span>👉 {heatmapData.suggestion}</span>
          </div>
        </div>
      )}
    </section>
  )
}
