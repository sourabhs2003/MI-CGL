import { useState } from 'react'
import { DailyGraph } from './DailyGraph'
import { WeeklyGraph } from './WeeklyGraph'
import { MonthlyGraph } from './MonthlyGraph'
import { SubjectGraph } from './SubjectGraph'
import type { StudySessionDoc } from '../types'

type GraphTab = 'daily' | 'weekly' | 'monthly' | 'subjects'

type Props = {
  sessions: StudySessionDoc[]
}

const tabs: Array<{ key: GraphTab; label: string }> = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'subjects', label: 'Subjects' },
]

export function GraphHub({ sessions }: Props) {
  const [activeTab, setActiveTab] = useState<GraphTab>('daily')

  return (
    <section className="graph-hub">
      <div className="graph-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`graph-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="graph-content">
        {activeTab === 'daily' && <DailyGraph sessions={sessions} />}
        {activeTab === 'weekly' && <WeeklyGraph sessions={sessions} />}
        {activeTab === 'monthly' && <MonthlyGraph sessions={sessions} />}
        {activeTab === 'subjects' && <SubjectGraph sessions={sessions} />}
      </div>
    </section>
  )
}
