import { useState, useEffect, useRef } from 'react'
import { MobileHeader } from '../components/MobileHeader'
import { MetricsStrip } from '../components/MetricsStrip'
import { GraphHub } from '../components/GraphHub'
import { CompactInsight } from '../components/CompactInsight'
import { CollapsiblePlan } from '../components/CollapsiblePlan'
import { FocusPriority } from '../components/FocusPriority'
import { TimePattern } from '../components/TimePattern'
import { SwipeMockAnalytics } from '../components/SwipeMockAnalytics'
import { MinimizedHeatmap } from '../components/MinimizedHeatmap'
import { SessionHistory } from '../components/SessionHistory'
import { useAuth } from '../context/AuthContext'
import { useMocks, useSessions } from '../hooks/useFirestoreData'

export function DashboardPage() {
  const { user } = useAuth()
  const sessions = useSessions(user?.uid, 800)
  const mocks = useMocks(user?.uid)

  const [showMockAnalytics, setShowMockAnalytics] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)

  const mockRef = useRef<HTMLDivElement>(null)
  const heatmapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mockObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShowMockAnalytics(true)
          mockObserver.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    const heatmapObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShowHeatmap(true)
          heatmapObserver.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    if (mockRef.current) mockObserver.observe(mockRef.current)
    if (heatmapRef.current) heatmapObserver.observe(heatmapRef.current)

    return () => {
      mockObserver.disconnect()
      heatmapObserver.disconnect()
    }
  }, [])

  return (
    <main className="mobile-analytics">
      <MobileHeader />
      <MetricsStrip sessions={sessions} mocks={mocks} />
      <GraphHub sessions={sessions} />
      <CompactInsight sessions={sessions} />
      <FocusPriority sessions={sessions} mocks={mocks} />
      <TimePattern sessions={sessions} />
      <SessionHistory sessions={sessions} />
      <CollapsiblePlan sessions={sessions} />
      <div ref={mockRef}>
        {showMockAnalytics && <SwipeMockAnalytics mocks={mocks} />}
      </div>
      <div ref={heatmapRef}>
        {showHeatmap && <MinimizedHeatmap sessions={sessions} />}
      </div>
    </main>
  )
}
