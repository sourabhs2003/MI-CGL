import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import {
  useMocks,
  useSessions,
} from '../hooks/useFirestoreData'
import { useUserProfile } from '../hooks/useUserProfile'
import { BADGE_DEFS, computeEarnedBadgeIds } from '../lib/badges'
import { lastNDaysKeys, todayKey } from '../lib/dates'
import { buildInsights } from '../lib/insights'
import { toMillis } from '../lib/firestoreTime'
import { levelProgress } from '../lib/xp'
import type { Subject } from '../types'

const PIE_COLORS = ['#5b8cff', '#7cffb2', '#ffb86b', '#ff7ab6']

export function DashboardPage() {
  const { user } = useAuth()
  const uid = user?.uid
  const { profile } = useUserProfile(uid)
  const sessions = useSessions(uid, 500)
  const mocks = useMocks(uid)
  const tk = todayKey()

  const prog = levelProgress(profile?.xp ?? 0)

  const weekBars = useMemo(() => {
    const keys = lastNDaysKeys(7)
    const map = new Map(keys.map((k) => [k, 0]))
    for (const s of sessions) {
      if (map.has(s.dayKey)) map.set(s.dayKey, (map.get(s.dayKey) ?? 0) + s.durationSec)
    }
    return keys.map((k) => ({
      day: k.slice(5),
      hours: Number(((map.get(k) ?? 0) / 3600).toFixed(2)),
    }))
  }, [sessions])

  const mockTrend = useMemo(() => {
    return [...mocks]
      .filter((m) => m.kind !== 'sectional')
      .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))
      .slice(-20)
      .map((m, i) => ({
        idx: i + 1,
        scorePct:
          m.maxScore > 0 ? Math.round((m.score / m.maxScore) * 1000) / 10 : 0,
        accuracy: m.accuracyPct,
      }))
  }, [mocks])

  const sectionalBySubject = useMemo(() => {
    const by: Record<string, { idx: number; score: number; acc: number }[]> = {}
    const sect = [...mocks]
      .filter((m) => m.kind === 'sectional')
      .sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt))
    for (const m of sect) {
      const key = m.subject
      by[key] ??= []
      by[key].push({
        idx: by[key]!.length + 1,
        score: m.score,
        acc: m.accuracyPct,
      })
    }
    return by
  }, [mocks])

  const subjectPie = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000
    const totals: Record<Subject, number> = {
      Maths: 0,
      English: 0,
      Reasoning: 0,
      GS: 0,
      Mixed: 0,
    }
    for (const s of sessions) {
      const t = new Date(s.dayKey + 'T12:00:00').getTime()
      if (t >= cutoff) totals[s.subject] += s.durationSec
    }
    return (Object.entries(totals) as [Subject, number][])
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value: Number((value / 3600).toFixed(2)),
      }))
  }, [sessions])

  const insights = useMemo(
    () =>
      buildInsights({
        sessions,
        mocks,
        todayKey: tk,
      }),
    [sessions, mocks, tk],
  )

  const earned = useMemo(() => {
    if (!profile) return new Set<string>()
    return computeEarnedBadgeIds({
      profile,
      sessions,
      mocks,
    })
  }, [profile, sessions, mocks])

  return (
    <>
      <header className="top-bar">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Dashboard</h1>
        </div>
        <div className="xp-block">
          <div className="xp-meta">
            <span className="label">Level {prog.level}</span>
            <span className="value">{profile?.xp ?? 0} XP</span>
          </div>
          <div className="xp-bar" aria-hidden>
            <div className="xp-fill" style={{ width: `${prog.pct}%` }} />
          </div>
          <p className="xp-hint">
            Streak {profile?.streak ?? 0} days · {prog.level >= 100 ? 'Max level' : `${prog.xpForNext} XP to next`}
          </p>
        </div>
      </header>

      <section className="card insights-block">
        <h2>Smart insights</h2>
        <ul className="insight-list">
          {insights.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <div className="chart-grid">
        <section className="card chart-card">
          <h2>Daily study (hours)</h2>
          <p className="card-sub">Rolling 7 days</p>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weekBars}>
                <XAxis dataKey="day" stroke="#8b95a8" fontSize={12} />
                <YAxis stroke="#8b95a8" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: '#1c2230',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                <Bar dataKey="hours" fill="#5b8cff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card chart-card">
          <h2>Subject mix (30d)</h2>
          <p className="card-sub">Hours by subject</p>
          <div className="chart-wrap">
            {subjectPie.length === 0 ? (
              <p className="muted">Log sessions to see distribution.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={subjectPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {subjectPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1c2230',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card chart-card wide">
          <h2>Mock trajectory</h2>
          <p className="card-sub">Score % and accuracy (chronological)</p>
          <div className="chart-wrap">
            {mockTrend.length === 0 ? (
              <p className="muted">Add mocks to see trends.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={mockTrend}>
                  <XAxis dataKey="idx" stroke="#8b95a8" fontSize={12} />
                  <YAxis stroke="#8b95a8" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: '#1c2230',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="scorePct"
                    stroke="#5b8cff"
                    strokeWidth={2}
                    dot={false}
                    name="Score %"
                  />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#7cffb2"
                    strokeWidth={2}
                    dot={false}
                    name="Accuracy %"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="card chart-card wide">
          <h2>Sectional mocks</h2>
          <p className="card-sub">Separate curves per subject</p>
          <div className="chart-wrap">
            {Object.keys(sectionalBySubject).length === 0 ? (
              <p className="muted">Add sectional mocks to see subject graphs.</p>
            ) : (
              <div className="sectional-grid">
                {Object.entries(sectionalBySubject).map(([sub, data]) => (
                  <div key={sub} className="sectional-card">
                    <div className="sectional-head">
                      <strong>{sub}</strong>
                      <span className="muted tiny">{data.length} mocks</span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={data}>
                        <XAxis dataKey="idx" stroke="#8b95a8" fontSize={12} />
                        <YAxis stroke="#8b95a8" fontSize={12} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{
                            background: '#1c2230',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#ffb86b"
                          strokeWidth={2}
                          dot={false}
                          name="Score"
                        />
                        <Line
                          type="monotone"
                          dataKey="acc"
                          stroke="#7cffb2"
                          strokeWidth={2}
                          dot={false}
                          name="Accuracy %"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="card badges-card">
        <h2>Badges</h2>
        <div className="badge-grid">
          {BADGE_DEFS.map((b) => (
            <div
              key={b.id}
              className={`badge-pill ${earned.has(b.id) ? 'earned' : ''}`}
            >
              <strong>{b.label}</strong>
              <span>{b.description}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
