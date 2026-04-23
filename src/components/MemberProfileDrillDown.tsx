import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, BarChart3, Clock3, Snowflake, X } from 'lucide-react'
import type { MemberProfileData } from '../hooks/useSquadPageData'
import { AvatarIcon } from './AvatarIcon'
import { ActivityHeatmap } from './ActivityHeatmap'

type DrillDownProps = {
  member: MemberProfileData | null
  isOpen: boolean
  onClose: () => void
}

type Period = 'today' | '7d' | '30d'

export function MemberProfileDrillDown({ member, isOpen, onClose }: DrillDownProps) {
  const [period, setPeriod] = useState<Period>('today')

  const history = useMemo(() => {
    if (!member) return null
    if (period === 'today') return member.studyHistory.today
    if (period === '7d') return member.studyHistory.sevenDays
    return member.studyHistory.thirtyDays
  }, [member, period])

  if (!member || !isOpen || !history) return null

  return (
    <AnimatePresence>
      <motion.div
        className="squad-sheet-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="squad-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="squad-sheet-handle" />

          <div className="squad-sheet-head">
            <div className="squad-sheet-user">
              <AvatarIcon username={member.username || member.displayName} size={52} />
              <div>
                <p className="squad-kicker">Member Profile</p>
                <h2>{member.displayName}</h2>
                <div className="squad-sheet-tags">
                  {member.rank != null && <span>Rank #{member.rank}</span>}
                  {member.role && <span>{member.role}</span>}
                  <span>{member.status === 'Frozen' ? '❄️ Frozen' : member.status}</span>
                </div>
              </div>
            </div>

            <button type="button" className="squad-sheet-close" onClick={onClose} aria-label="Close profile">
              <X size={18} />
            </button>
          </div>

          <div className="squad-period-tabs">
            {(['today', '7d', '30d'] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={period === key ? 'active' : ''}
                onClick={() => setPeriod(key)}
              >
                {key === 'today' ? 'Today' : key}
              </button>
            ))}
          </div>

          <div className="squad-sheet-grid">
            <section className="squad-detail-card">
              <div className="squad-card-head">
                <div>
                  <p className="squad-kicker">Study History</p>
                  <h3>{history.totalHours.toFixed(1)}h logged</h3>
                </div>
                <Clock3 size={16} />
              </div>

              <div className="squad-detail-stats">
                <div>
                  <span>Total hours</span>
                  <strong>{history.totalHours.toFixed(1)}h</strong>
                </div>
                <div>
                  <span>Sessions</span>
                  <strong>{history.sessions}</strong>
                </div>
                <div>
                  <span>Avg session</span>
                  <strong>{history.avgSessionMinutes} min</strong>
                </div>
              </div>
            </section>

            <section className="squad-detail-card">
              <div className="squad-card-head">
                <div>
                  <p className="squad-kicker">Heatmap</p>
                  <h3>35-day study pattern</h3>
                </div>
                <BarChart3 size={16} />
              </div>
              {member.heatmap.some((item) => item.hours > 0) ? (
                <ActivityHeatmap data={member.heatmap.map((item) => ({ dayKey: item.dayKey, value: item.hours }))} />
              ) : (
                <p className="squad-empty-copy">No data available</p>
              )}
            </section>

            {member.mockPerformance && (
              <section className="squad-detail-card">
                <div className="squad-card-head">
                  <div>
                    <p className="squad-kicker">Mock Performance</p>
                    <h3>{member.mockPerformance.averageScore}% average</h3>
                  </div>
                </div>

                <div className="squad-detail-stats">
                  <div>
                    <span>Latest score</span>
                    <strong>{member.mockPerformance.latestScore}%</strong>
                  </div>
                  <div>
                    <span>Best score</span>
                    <strong>{member.mockPerformance.bestScore}%</strong>
                  </div>
                  <div>
                    <span>Accuracy</span>
                    <strong>{member.mockPerformance.accuracy}%</strong>
                  </div>
                </div>
              </section>
            )}

            {member.subjectAnalysis.length > 0 && (
              <section className="squad-detail-card">
                <div className="squad-card-head">
                  <div>
                    <p className="squad-kicker">Subject Analysis</p>
                    <h3>Strengths and weaknesses</h3>
                  </div>
                </div>

                <div className="squad-subject-list">
                  {member.subjectAnalysis.map((subject) => (
                    <div key={subject.subject} className="squad-subject-row">
                      <div className="squad-subject-copy">
                        <strong>{subject.subject}</strong>
                        <span>{subject.hours.toFixed(1)}h • {subject.emphasis}</span>
                      </div>
                      <div className="squad-progress-bar">
                        <div className="squad-progress-fill" style={{ width: `${subject.intensityPct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {member.comparison && (
              <section className="squad-detail-card">
                <div className="squad-card-head">
                  <div>
                    <p className="squad-kicker">Comparison Mode</p>
                    <h3>Against {member.comparison.againstName}</h3>
                  </div>
                </div>

                <div className="squad-comparison-grid">
                  <ComparisonCell label="Today hours" value={member.comparison.todayHoursDiff} unit="h" />
                  <ComparisonCell label="Weekly hours" value={member.comparison.weeklyHoursDiff} unit="h" />
                  {member.comparison.mockScoreDiff != null && (
                    <ComparisonCell label="Mock score" value={member.comparison.mockScoreDiff} unit="pts" />
                  )}
                </div>
              </section>
            )}

            {member.insights.length > 0 && (
              <section className="squad-detail-card">
                <div className="squad-card-head">
                  <div>
                    <p className="squad-kicker">AI Insights</p>
                    <h3>Data-backed reads</h3>
                  </div>
                </div>

                <div className="squad-insight-list">
                  {member.insights.map((insight) => (
                    <div key={insight} className="squad-insight-row">
                      {member.status === 'Frozen' ? <Snowflake size={14} /> : <BarChart3 size={14} />}
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function ComparisonCell(props: { label: string; value: number; unit: string }) {
  const positive = props.value >= 0
  return (
    <div className={`squad-compare-cell ${positive ? 'positive' : 'negative'}`}>
      <span>{props.label}</span>
      <strong>
        {positive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        {positive ? '+' : ''}{props.value.toFixed(1)} {props.unit}
      </strong>
    </div>
  )
}
