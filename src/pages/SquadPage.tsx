import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Crown, Flame, Radar, Sparkles, TrendingUp, Users, X, Zap, Medal, Clock, Activity } from 'lucide-react'
import { AvatarIcon } from '../components/AvatarIcon'
import { ActivityHeatmap } from '../components/ActivityHeatmap'
import { useLeaderboard, type LeaderboardRow } from '../hooks/useLeaderboard'

function formatGap(current: number, previous: number) {
  return previous > current ? `${previous - current} XP gap` : 'Leader'
}

function getMentorLines(member: LeaderboardRow) {
  const lines: string[] = []
  lines.push(member.consistencyDays >= 20 ? 'Strong consistency, strong discipline.' : 'Consistency needs more daily hits.')
  lines.push(member.latestMockRawScore > 0 && member.averageAccuracy < 75 ? 'Strong study volume, weak mocks.' : 'Mocks are holding steady.')
  lines.push(member.eveningHours > member.morningHours ? 'Evening focused, low morning usage.' : 'Morning usage is carrying output.')
  return lines.slice(0, 2)
}

function getRankClass(index: number) {
  if (index === 0) return 'rank-1'
  if (index === 1) return 'rank-2'
  if (index === 2) return 'rank-3'
  return ''
}

export function SquadPage() {
  const { rows, loading, meUid } = useLeaderboard()
  const me = rows.find((row) => row.uid === meUid) ?? null
  const [selectedMember, setSelectedMember] = useState<LeaderboardRow | null>(null)
  const mostToday = [...rows].sort((a, b) => b.todayHours - a.todayHours)[0]
  const mostConsistent = [...rows].sort((a, b) => b.consistencyDays - a.consistencyDays || b.streak - a.streak)[0]
  const leastActive = [...rows].filter((row) => row.inactive).sort((a, b) => a.lastActivity.localeCompare(b.lastActivity))[0]
  const totalHours = rows.reduce((sum, row) => sum + row.totalHours, 0)
  const totalXp = rows.reduce((sum, row) => sum + row.xp, 0)
  const activeMembers = rows.filter((row) => !row.inactive).length
  const aheadOfMe = me ? rows.find((row) => row.uid !== me.uid && row.todayHours > me.todayHours) : null

  const insightLine =
    me && aheadOfMe
      ? `You are ${(aheadOfMe.todayHours - me.todayHours).toFixed(1)}h behind ${aheadOfMe.displayName}.`
      : mostConsistent
        ? `${mostConsistent.displayName} is dominating consistency.`
        : 'Squad race is still open.'

  return (
    <main className="squad-v2">
      <motion.header className="squad-v2-hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <div>
          <p className="eyebrow">Squad Page</p>
          <h1>Competitive Mode</h1>
        </div>
        <div className="squad-v2-badge">
          <Users size={16} />
          <span>{rows.length} members</span>
        </div>
      </motion.header>

      <section className="squad-leaderboard-v2">
        <div className="home-block-head">
          <h2>Leaderboard</h2>
          <Crown size={16} />
        </div>
        {loading ? (
          <div className="card">
            <p className="muted">Loading squad...</p>
          </div>
        ) : (
          <div className="squad-rank-stack">
            {rows.map((member, index) => (
              <motion.button
                key={member.uid}
                type="button"
                className={`card squad-rank-card selectable ${getRankClass(index)}`}
                onClick={() => setSelectedMember(member)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="squad-rank-head">
                  <div className="squad-rank-user">
                    <span className="squad-rank-number">#{index + 1}</span>
                    <div className="squad-user-info">
                      <AvatarIcon username={member.username || member.displayName} size={28} />
                      <strong style={{ color: member.avatarColor }}>
                        {member.displayName}
                        {member.uid === meUid ? ' • You' : ''}
                      </strong>
                    </div>
                  </div>
                  <div className="squad-rank-gap">
                    <strong>{member.xp} XP</strong>
                    <span>{index === 0 ? 'Top performer' : formatGap(member.xp, rows[index - 1]!.xp)}</span>
                  </div>
                </div>
                
                <div className="squad-rank-badges">
                  {member.streak > 0 && (
                    <span className="squad-badge-icon" title={`${member.streak} day streak`}>
                      <Flame size={12} />
                      {member.streak}
                    </span>
                  )}
                  {!member.inactive && member.todayHours > 0 && (
                    <span className="squad-badge-icon active" title="Active today">
                      <Zap size={12} />
                    </span>
                  )}
                  {member.inactive && (
                    <span className="squad-badge-icon inactive" title="Inactive">
                      <Activity size={12} />
                    </span>
                  )}
                </div>

                <div className="squad-rank-metrics leaderboard-main-grid">
                  <span>{member.totalHours}h</span>
                  <span>{member.todayHours}h today</span>
                  <span>{member.latestMockRawScore}/{member.latestMockTotal || 0}</span>
                </div>

                <div className="squad-micro-stats">
                  <span><Clock size={10} /> Today: {member.todayHours.toFixed(1)}h</span>
                  <span><Medal size={10} /> Best: {Math.max(...rows.map(r => r.todayHours), member.todayHours).toFixed(1)}h</span>
                  <span><Flame size={10} /> Streak: {member.streak} days</span>
                </div>

                <div className="squad-xp-progress">
                  <div className="squad-xp-bar">
                    <motion.div 
                      className="squad-xp-fill" 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (member.xp / (rows[0]?.xp || member.xp)) * 100)}%` }}
                      transition={{ duration: 0.5 }}
                      style={{ background: member.avatarColor }}
                    />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </section>

      <section className="squad-callout-grid">
        <article className="card squad-callout">
          <Flame size={18} />
          <span>Most Studied</span>
          <strong>{mostToday?.displayName ?? '-'}</strong>
        </article>
        <article className="card squad-callout">
          <Sparkles size={18} />
          <span>Most Consistent</span>
          <strong>{mostConsistent?.displayName ?? '-'}</strong>
        </article>
        <article className="card squad-callout">
          <Radar size={18} />
          <span>Least Active</span>
          <strong>{leastActive?.displayName ?? '-'}</strong>
        </article>
      </section>

      <section className="squad-callout-grid squad-header-grid">
        <article className="card squad-callout">
          <Users size={18} />
          <span>Total XP</span>
          <strong>{totalXp}</strong>
        </article>
        <article className="card squad-callout">
          <TrendingUp size={18} />
          <span>Total Study Hours</span>
          <strong>{totalHours}h</strong>
        </article>
        <article className="card squad-callout">
          <Zap size={18} />
          <span>Active Members</span>
          <strong>{activeMembers}</strong>
        </article>
      </section>

      <section className="card squad-ai-card">
        <div className="home-block-head">
          <h2>AI Insights</h2>
          <Sparkles size={16} />
        </div>
        <div className="squad-ai-lines">
          <strong>{insightLine}</strong>
        </div>
      </section>

      <AnimatePresence>
        {selectedMember ? (
          <motion.div className="squad-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMember(null)}>
            <motion.div className="squad-modal-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} onClick={(event) => event.stopPropagation()}>
              <div className="squad-modal-head">
                <div className="squad-modal-user">
                  <AvatarIcon username={selectedMember.username || selectedMember.displayName} size={40} />
                  <div>
                    <h2 style={{ color: selectedMember.avatarColor }}>{selectedMember.displayName}</h2>
                    <p className="muted">{selectedMember.uid === meUid ? 'You' : `XP ${selectedMember.xp}`}</p>
                  </div>
                </div>
                <button type="button" className="btn ghost sm" onClick={() => setSelectedMember(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="squad-badge-row">
                {selectedMember.badges.length ? selectedMember.badges.map((badge) => (
                  <span key={badge} className="squad-badge-pill">{badge}</span>
                )) : <span className="squad-badge-pill muted-pill">Still warming up</span>}
              </div>

              <div className="squad-member-stats modal">
                <div>
                  <span>XP</span>
                  <strong>{selectedMember.xp}</strong>
                </div>
                <div>
                  <span>Total Hours</span>
                  <strong>{selectedMember.totalHours}h</strong>
                </div>
                <div>
                  <span>Streak</span>
                  <strong>{selectedMember.streak}</strong>
                </div>
                <div>
                  <span>Mock Score</span>
                  <strong>{selectedMember.latestMockRawScore}/{selectedMember.latestMockTotal || 0}</strong>
                </div>
                <div>
                  <span>Daily Consistency</span>
                  <strong>{selectedMember.consistencyDays} days</strong>
                </div>
                <div>
                  <span>Morning vs Evening</span>
                  <strong>{selectedMember.morningHours}h / {selectedMember.eveningHours}h</strong>
                </div>
                <div>
                  <span>Subject Focus</span>
                  <strong>{selectedMember.topSubject}</strong>
                </div>
              </div>

              <div className="squad-member-heat">
                <span>Activity Grid</span>
                <ActivityHeatmap
                  data={selectedMember.heatmap.map((item) => ({
                    dayKey: item.dayKey,
                    value: Number((item.value / 3600).toFixed(1)),
                  }))}
                />
              </div>

              <div className="squad-ai-lines mentor">
                {getMentorLines(selectedMember).map((line) => (
                  <strong key={line}>{line}</strong>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  )
}
