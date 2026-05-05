import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
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
import { todayKey } from '../lib/dates'
import { getAverageScore, getRecentMocks } from '../lib/mockAnalytics'

function DashboardSection({
  eyebrow,
  title,
  children,
  className = '',
}: {
  eyebrow: string
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <motion.section
      className={`dashboard-section ${className}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className="dashboard-section-head">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </motion.section>
  )
}

function DashboardAiCommand({ sessions, mocks }: { sessions: ReturnType<typeof useSessions>; mocks: ReturnType<typeof useMocks> }) {
  const command = useMemo(() => {
    const currentDayKey = todayKey()
    const todayMinutes = Math.round(
      sessions
        .filter((session) => session.dayKey === currentDayKey)
        .reduce((sum, session) => sum + session.durationSec, 0) / 60,
    )
    const recentMockAverage = getAverageScore(getRecentMocks(mocks, 5))

    if (todayMinutes < 30) return 'Start with a 30-minute focused session, then log one tiny win.'
    if (recentMockAverage > 0 && recentMockAverage < 60) return 'Use today for weak-section repair before taking another full mock.'
    if (recentMockAverage >= 70) return 'Momentum is good. Keep one timed mixed set and protect accuracy.'
    return 'Balance the day: one study block, one revision block, one quick analytics check.'
  }, [sessions, mocks])

  return (
    <div className="dashboard-ai-command">
      <span>AI command</span>
      <strong>{command}</strong>
    </div>
  )
}

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
    <main className="dashboard-grid dashboard-redesign">
      <MobileHeader />

      <div className="dashboard-shell">
        <div className="dashboard-main">
          <DashboardSection eyebrow="Today" title="Performance Summary" className="dashboard-row-1">
            <DashboardAiCommand sessions={sessions} mocks={mocks} />
            <MetricsStrip sessions={sessions} mocks={mocks} />
          </DashboardSection>

          <DashboardSection eyebrow="Trend" title="Study Analysis" className="dashboard-row-2">
            <GraphHub sessions={sessions} />
            <div className="analytics-insight-card card">
              <CompactInsight sessions={sessions} />
            </div>
          </DashboardSection>

          <DashboardSection eyebrow="Action" title="Priority Focus" className="dashboard-row-3">
            <FocusPriority sessions={sessions} mocks={mocks} />
          </DashboardSection>

          <DashboardSection eyebrow="Pattern" title="Sessions & Timing" className="dashboard-row-4">
            <TimePattern sessions={sessions} />
            <SessionHistory sessions={sessions} />
          </DashboardSection>

          <DashboardSection eyebrow="Plan" title="Next Tasks" className="dashboard-plan-section">
            <CollapsiblePlan sessions={sessions} />
          </DashboardSection>

          <DashboardSection eyebrow="Mocks" title="Mock Analytics" className="dashboard-mock-section">
            <div ref={mockRef}>
              {showMockAnalytics && <SwipeMockAnalytics mocks={mocks} />}
            </div>
          </DashboardSection>

          <DashboardSection eyebrow="Rhythm" title="Time Heatmap" className="dashboard-heatmap-section">
            <div ref={heatmapRef}>
              {showHeatmap && <MinimizedHeatmap sessions={sessions} />}
            </div>
          </DashboardSection>
        </div>
      </div>
    </main>
  )
}
