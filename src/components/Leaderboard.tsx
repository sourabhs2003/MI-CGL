import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { getDb } from '../firebase'
import { lastNDaysKeys } from '../lib/dates'
import { USERS } from '../lib/auth'
import { profileFromSnap } from '../services/userProfile'
import { motion } from 'framer-motion'

type Row = {
  username: string
  uid: string
  xp: number
  streak: number
  weekHours: number
  mockCount: number
  lastMock: string
}

function competitiveMessage(rows: Row[], meUid: string | null): string | null {
  if (!meUid) return null
  const sorted = rows.slice().sort((a, b) => b.weekHours - a.weekHours || b.xp - a.xp)
  const me = sorted.find((r) => r.uid === meUid)
  if (!me) return null
  const top = sorted[0]
  if (!top) return null
  if (top.uid === me.uid) {
    const second = sorted[1]
    if (!second) return 'You dominate. Stay ruthless.'
    const gap = Math.max(0, top.weekHours - second.weekHours)
    return gap < 0.6
      ? `They're close. Push 30 mins to lock #1.`
      : `You lead by ${gap.toFixed(1)}h. Don't slow down.`
  }
  const gap = Math.max(0, top.weekHours - me.weekHours)
  const mins = Math.ceil(gap * 60)
  if (mins <= 30) return `You're close. 30 mins to take #1.`
  if (mins <= 120) return `Pressure: ${top.username} is ahead by ${mins} min.`
  return `Behind by ${(mins / 60).toFixed(1)}h. Start now.`
}

export function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const meUid = useMemo(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return null
      const u = JSON.parse(raw) as { uid?: string }
      return typeof u.uid === 'string' ? u.uid : null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const db = getDb()
    const weekKeys = new Set(lastNDaysKeys(7))

    async function load() {
      setLoading(true)
      try {
      const out: Row[] = []
      for (const def of USERS) {
        let xp = 0
        let streak = 0
        try {
          const pref = await getDoc(doc(db, 'users', def.uid))
          const p = profileFromSnap(
            pref.data() as Record<string, unknown> | undefined,
          )
          xp = p.xp
          streak = p.streak
        } catch {
          /* empty profile */
        }

        let mockCount = 0
        let lastMock = '—'
        try {
          const mc = await getCountFromServer(
            collection(db, `users/${def.uid}/mocks`),
          )
          mockCount = mc.data().count
        } catch {
          /* */
        }
        try {
          const mq = query(
            collection(db, `users/${def.uid}/mocks`),
            orderBy('createdAt', 'desc'),
            limit(1),
          )
          const mqSnap = await getDocs(mq)
          if (!mqSnap.empty) {
            const m = mqSnap.docs[0].data() as Record<string, unknown>
            const score = Number(m.score) || 0
            const maxS = Number(m.maxScore) || 1
            const pct = Math.round((score / maxS) * 1000) / 10
            lastMock = `${pct}% · ${score}/${maxS}`
          }
        } catch {
          /* missing index */
        }

        let weekSec = 0
        try {
          const sq = query(
            collection(db, `users/${def.uid}/sessions`),
            orderBy('endedAt', 'desc'),
            limit(200),
          )
          const ss = await getDocs(sq)
          ss.forEach((d) => {
            const x = d.data() as Record<string, unknown>
            const dk = String(x.dayKey ?? '')
            if (weekKeys.has(dk)) weekSec += Number(x.durationSec) || 0
          })
        } catch {
          /* */
        }

        out.push({
          username: def.username,
          uid: def.uid,
          xp,
          streak,
          weekHours: Math.round((weekSec / 3600) * 10) / 10,
          mockCount,
          lastMock,
        })
      }
      if (!cancelled) setRows(out)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const msg = useMemo(() => competitiveMessage(rows, meUid), [rows, meUid])

  const getRankBadge = (idx: number) => {
    if (idx === 0) return '🥇'
    if (idx === 1) return '🥈'
    if (idx === 2) return '🥉'
    return `#${idx + 1}`
  }

  return (
    <section className="card leaderboard-card">
      <h2>Squad leaderboard</h2>
      <p className="card-sub">Stay ahead or fall behind.</p>
      {msg ? <p className="lb-msg">{msg}</p> : null}
      {loading ? (
        <p className="muted">Loading stats…</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>User</th>
                <th>XP</th>
                <th>Streak</th>
                <th>7d hrs</th>
                <th>Mocks</th>
                <th>Latest mock</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice()
                .sort((a, b) => b.weekHours - a.weekHours || b.xp - a.xp)
                .map((r, idx) => {
                  const top = idx === 0
                  const isMe = meUid === r.uid
                  return (
                    <motion.tr
                      key={r.uid}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ type: 'spring', stiffness: 520, damping: 42, delay: idx * 0.05 }}
                      className={top ? 'top-row' : isMe ? 'me-row' : ''}
                    >
                      <td>
                        <span className="lb-rank-badge">{getRankBadge(idx)}</span>
                      </td>
                      <td>
                        <div className="lb-user">
                          <div>
                            <strong>{r.username}</strong>
                          </div>
                        </div>
                      </td>
                      <td>{r.xp}</td>
                      <td>{r.streak}d</td>
                      <td>{r.weekHours}</td>
                      <td>{r.mockCount}</td>
                      <td>{r.lastMock}</td>
                    </motion.tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
