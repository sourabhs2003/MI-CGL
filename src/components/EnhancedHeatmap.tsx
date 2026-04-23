import { useMemo } from 'react'
import type { StudySessionDoc } from '../types'
import { lastNDaysKeys } from '../lib/dates'

type Props = {
  sessions: StudySessionDoc[]
}

export function EnhancedHeatmap({ sessions }: Props) {
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

    const lookup = new Map<string, number>()
    for (const key of keys) {
      for (const slot of timeSlots) {
        lookup.set(`${key}-${slot.id}`, 0)
      }
    }

    for (const session of sessions) {
      if (!keys.includes(session.dayKey)) continue
      const time = session.startTime ?? session.endTime ?? session.topic.slice(0, 5)
      const hour = Number(time.slice(0, 2))
      if (!Number.isNaN(hour)) {
        const slot = timeSlots.find((s) => hour >= s.start && hour < s.end)
        if (slot) {
          const lookupKey = `${session.dayKey}-${slot.id}`
          lookup.set(lookupKey, (lookup.get(lookupKey) ?? 0) + session.durationSec)
        }
      }
    }

    // Calculate peak and weak slots
    const slotTotals = new Map<string, number>()
    for (const slot of timeSlots) {
      slotTotals.set(slot.id, 0)
    }
    for (const session of sessions) {
      if (keys.includes(session.dayKey)) {
        const time = session.startTime ?? session.endTime ?? session.topic.slice(0, 5)
        const hour = Number(time.slice(0, 2))
        if (!Number.isNaN(hour)) {
          const slot = timeSlots.find((s) => hour >= s.start && hour < s.end)
          if (slot) {
            slotTotals.set(slot.id, (slotTotals.get(slot.id) ?? 0) + session.durationSec)
          }
        }
      }
    }

    const peakSlot = [...slotTotals.entries()].sort((a, b) => b[1] - a[1])[0]
    const weakSlot = [...slotTotals.entries()].sort((a, b) => a[1] - b[1])[0]

    return {
      timeSlots,
      keys,
      lookup,
      peakSlot: peakSlot ? { id: peakSlot[0], hours: (peakSlot[1] / 3600).toFixed(1) } : null,
      weakSlot: weakSlot ? { id: weakSlot[0], hours: (weakSlot[1] / 3600).toFixed(1) } : null,
    }
  }, [sessions])

  const getIntensity = (hours: number) => {
    if (hours >= 3) return 4
    if (hours >= 2) return 3
    if (hours >= 1) return 2
    if (hours > 0) return 1
    return 0
  }

  const getSlotLabel = (slotId: string) => {
    return heatmapData.timeSlots.find((s) => s.id === slotId)?.label || slotId
  }

  if (heatmapData.keys.every((key) => 
    heatmapData.timeSlots.every((slot) => 
      (heatmapData.lookup.get(`${key}-${slot.id}`) ?? 0) === 0
    )
  )) {
    return (
      <section className="card heatmap-card">
        <div className="card-head">
          <h2>Time-of-Day Heatmap</h2>
        </div>
        <p className="muted">No study data yet. Start your first session!</p>
      </section>
    )
  }

  return (
    <section className="card heatmap-card">
      <div className="card-head">
        <h2>Time-of-Day Heatmap</h2>
      </div>
      
      <div className="heatmap-container">
        <div className="heatmap-legend">
          <span className="legend-label">Activity:</span>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color intensity-0" />
              <span>None</span>
            </div>
            <div className="legend-item">
              <div className="legend-color intensity-1" />
              <span>Low</span>
            </div>
            <div className="legend-item">
              <div className="legend-color intensity-2" />
              <span>Medium</span>
            </div>
            <div className="legend-item">
              <div className="legend-color intensity-3" />
              <span>High</span>
            </div>
            <div className="legend-item">
              <div className="legend-color intensity-4" />
              <span>Peak</span>
            </div>
          </div>
        </div>

        <div className="heatmap-grid">
          {heatmapData.timeSlots.map((slot) => (
            <div key={slot.id} className="heatmap-row">
              <span className="heatmap-row-label">{slot.label}</span>
              <div className="heatmap-cells">
                {heatmapData.keys.map((dayKey) => {
                  const hours = (heatmapData.lookup.get(`${dayKey}-${slot.id}`) ?? 0) / 3600
                  return (
                    <div
                      key={`${slot.id}-${dayKey}`}
                      className={`heatmap-cell intensity-${getIntensity(hours)}`}
                      title={`${slot.label} ${dayKey.slice(5)}: ${hours.toFixed(1)}h`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {(heatmapData.peakSlot || heatmapData.weakSlot) && (
          <div className="heatmap-insights">
            {heatmapData.peakSlot && (
              <div className="heatmap-insight">
                <span className="insight-label">🧠 Peak Time:</span>
                <span className="insight-value">{getSlotLabel(heatmapData.peakSlot.id)} ({heatmapData.peakSlot.hours}h)</span>
              </div>
            )}
            {heatmapData.weakSlot && (
              <div className="heatmap-insight">
                <span className="insight-label">⚠ Weak Zone:</span>
                <span className="insight-value">{getSlotLabel(heatmapData.weakSlot.id)} ({heatmapData.weakSlot.hours}h)</span>
              </div>
            )}
            <div className="heatmap-recommendation">
              <span className="recommendation-text">👉 Shift 1 study session to {getSlotLabel(heatmapData.weakSlot?.id || 'evening')}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
