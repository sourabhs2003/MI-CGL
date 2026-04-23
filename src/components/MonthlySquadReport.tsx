import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { SquadMemberCard } from '../hooks/useSquadPageData'

type Props = {
  members: SquadMemberCard[]
}

type ReportItem = {
  label: string
  badge: string
  name: string
  stat: string
}

type StoredReport = {
  month: string
  items: ReportItem[]
}

const STORAGE_KEY = 'monthly-squad-reports'

function bestBy<T>(rows: T[], score: (row: T) => number | null | undefined) {
  return [...rows]
    .map((row) => ({ row, value: score(row) ?? -Infinity }))
    .sort((a, b) => b.value - a.value)[0]
}

function currentReportMonth() {
  const now = new Date()
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(now)
}

export function MonthlySquadReport({ members }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(currentReportMonth())
  const [storedReports, setStoredReports] = useState<StoredReport[]>([])
  const activeMembers = useMemo(() => members.filter((member) => !member.frozen), [members])

  const report = useMemo<ReportItem[]>(() => {
    if (!activeMembers.length) return []
    const highestTime = bestBy(activeMembers, (member) => member.totalHours)
    const bestAccuracy = bestBy(activeMembers, (member) => member.mockAccuracy)
    const consistent = bestBy(activeMembers, (member) => member.streak)
    const improved = bestBy(activeMembers, (member) => member.rankMovement === 'up' ? 2 : member.rankMovement === 'same' ? 1 : 0)
    const leastActive = [...activeMembers].sort((a, b) => a.weekHours - b.weekHours)[0]

    return [
      {
        label: 'Highest Study Time',
        badge: 'Top Performer',
        name: highestTime?.row.displayName ?? '--',
        stat: highestTime ? `${highestTime.row.totalHours.toFixed(1)}h lifetime` : '--',
      },
      {
        label: 'Best Mock Accuracy',
        badge: 'Sharpest',
        name: bestAccuracy?.row.displayName ?? '--',
        stat: bestAccuracy?.row.mockAccuracy != null ? `${bestAccuracy.row.mockAccuracy.toFixed(1)}% accuracy` : 'No mocks',
      },
      {
        label: 'Most Consistent',
        badge: 'Consistent Beast',
        name: consistent?.row.displayName ?? '--',
        stat: consistent ? `${consistent.row.streak} day streak` : '--',
      },
      {
        label: 'Most Improved',
        badge: 'Climber',
        name: improved?.row.displayName ?? '--',
        stat: improved?.row.rankMovement === 'up' ? 'Rank moved up' : 'Holding position',
      },
      {
        label: 'Least Active',
        badge: 'Wake-up Call',
        name: leastActive?.displayName ?? '--',
        stat: leastActive ? `${leastActive.weekHours.toFixed(1)}h this week` : '--',
      },
    ]
  }, [activeMembers])
  const reportSignature = useMemo(
    () => JSON.stringify({ month: currentReportMonth(), items: report }),
    [report],
  )

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as StoredReport[]
      setStoredReports(Array.isArray(parsed) ? parsed : [])
    } catch {
      setStoredReports([])
    }
  }, [])

  useEffect(() => {
    if (!report.length) return
    const parsed = JSON.parse(reportSignature) as StoredReport
    setStoredReports((prev) => {
      const next = [parsed, ...prev.filter((item) => item.month !== parsed.month)].slice(0, 12)
      if (JSON.stringify(prev) === JSON.stringify(next)) return prev
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [report.length, reportSignature])

  const visibleReport = storedReports.find((item) => item.month === selectedMonth)?.items ?? report
  const months = storedReports.length ? storedReports.map((item) => item.month) : [currentReportMonth()]

  return (
    <section className="monthly-squad-report">
      <button type="button" className="monthly-report-head" onClick={() => setExpanded((value) => !value)}>
        <div>
          <span>Monthly Squad Report</span>
          <strong>{selectedMonth}</strong>
        </div>
        <ChevronDown size={16} className={expanded ? 'open' : ''} />
      </button>
      {expanded ? (
        <>
          <div className="monthly-report-months">
            {months.map((month) => (
              <button key={month} type="button" className={month === selectedMonth ? 'active' : ''} onClick={() => setSelectedMonth(month)}>
                {month}
              </button>
            ))}
          </div>
          <div className="monthly-report-grid">
            {visibleReport.map((item) => (
              <article key={item.label} className="monthly-report-item">
                <span>{item.label}</span>
                <strong>{item.name}</strong>
                <small>{item.stat}</small>
                <em>{item.badge}</em>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}
