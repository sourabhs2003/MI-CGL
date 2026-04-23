import { useEffect, useMemo, useState } from 'react'
import { LiveActivityFeed } from '../components/LiveActivityFeed'
import { MemberProfileDrillDown } from '../components/MemberProfileDrillDown'
import { MonthlySquadReport } from '../components/MonthlySquadReport'
import { RiskAlertBar } from '../components/RiskAlertBar'
import { SquadIntelligenceBlock } from '../components/SquadIntelligenceBlock'
import { SquadLeaderboard } from '../components/SquadLeaderboard'
import { SquadMission } from '../components/SquadMission'
import { useFreezeParticipation } from '../hooks/useFreezeParticipation'
import { useSquadPageData } from '../hooks/useSquadPageData'

export function SquadPage() {
  const { isFrozen, frozenAt, freeze, unfreeze } = useFreezeParticipation()
  const [selectedMemberUid, setSelectedMemberUid] = useState<string | null>(null)
  const meUid = useMemo(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return null
      const parsed = JSON.parse(raw) as { uid?: string }
      return parsed.uid ?? null
    } catch {
      return null
    }
  }, [])

  const squad = useSquadPageData({ meUid, isFrozen, frozenAt })
  const selectedMember = selectedMemberUid ? squad.membersById[selectedMemberUid] ?? null : null
  const leaderName = squad.roles.find((role) => role.role === 'Leader')?.displayName ?? squad.leaderboard.find((member) => !member.frozen)?.displayName ?? null
  const atRiskName = squad.roles.find((role) => role.role === 'At Risk')?.displayName ?? squad.leaderboard.find((member) => member.role === 'At Risk')?.displayName ?? null

  useEffect(() => {
    const handler = () => unfreeze()
    window.addEventListener('squad:auto-unfreeze', handler)
    return () => window.removeEventListener('squad:auto-unfreeze', handler)
  }, [unfreeze])

  if (squad.loading) {
    return (
      <main className="squad-page-redesign">
        <div className="card">
          <p className="muted">Loading squad...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="squad-page-redesign squad-page-v3">
      <SquadMission
        title="Squad"
        goalHours={squad.mission.goalHours}
        currentHours={squad.mission.currentHours}
        remainingHours={squad.mission.remainingHours}
        activeMembers={squad.mission.activeMembers}
        totalMembers={squad.mission.totalMembers}
        contributors={squad.mission.contributors}
      />

      <RiskAlertBar alerts={squad.alerts} />

      <LiveActivityFeed activities={squad.activity} />

      <SquadLeaderboard
        members={squad.leaderboard}
        onSelectMember={setSelectedMemberUid}
        onFreezeSelf={() => {
          freeze()
        }}
        onUnfreezeSelf={unfreeze}
      />

      <SquadIntelligenceBlock
        healthScore={squad.health.score}
        healthLabel={squad.health.label}
        weeklyTrend={squad.weeklyTrend}
        leaderName={leaderName}
        atRiskName={atRiskName}
      />

      <MonthlySquadReport members={squad.leaderboard} />

      <MemberProfileDrillDown
        member={selectedMember}
        isOpen={!!selectedMember}
        onClose={() => setSelectedMemberUid(null)}
      />
    </main>
  )
}
