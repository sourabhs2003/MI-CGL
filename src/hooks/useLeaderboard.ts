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
import { USERS } from '../lib/auth'
import { lastNDaysKeys } from '../lib/dates'
import { profileFromSnap } from '../services/userProfile'

type Row = {
  username: string
  uid: string
  xp: number
  streak: number
  weekHours: number
  mockCount: number
  lastMock: string
  totalSessions: number
  lastActivity: string
}

const userNameByUid = Object.fromEntries(USERS.map((user) => [user.uid, user.username])) as Record<string, string>

export function useLeaderboard() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const meUid = useMemo(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return null
      const user = JSON.parse(raw) as { uid?: string }
      return typeof user.uid === 'string' ? user.uid : null
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const db = getDb()
        const usersSnap = await getDocs(collection(db, 'users'))
        const weekKeys = new Set(lastNDaysKeys(7))
        const nextRows: Row[] = []

        for (const userDoc of usersSnap.docs) {
          if (cancelled) return

          const profile = profileFromSnap(userDoc.data() as Record<string, unknown>)
          const uid = userDoc.id
          const sessionsRef = collection(db, `users/${uid}/sessions`)
          const mocksRef = collection(db, `users/${uid}/mocks`)

          const [sessionsSnap, sessionCountSnap, mocksSnap] = await Promise.all([
            getDocs(query(sessionsRef, orderBy('dayKey', 'desc'), limit(20))),
            getCountFromServer(sessionsRef),
            getDocs(mocksRef),
          ])

          const weekSec = sessionsSnap.docs.reduce((sum, sessionDoc) => {
            const data = sessionDoc.data() as { dayKey?: string; durationSec?: number }
            return weekKeys.has(data.dayKey ?? '') ? sum + (data.durationSec ?? 0) : sum
          }, 0)

          const latestSession = sessionsSnap.docs[0]?.data() as { dayKey?: string } | undefined
          const totalSessions = sessionCountSnap.data().count
          const mockCount = mocksSnap.size

          let lastMock = 'No mock'
          if (mockCount > 0) {
            const latestMock = await getDoc(
              doc(db, `users/${uid}/mocks`, mocksSnap.docs[mocksSnap.size - 1].id),
            )
            if (latestMock.exists()) {
              const data = latestMock.data() as { createdAt?: unknown }
              if (data.createdAt) {
                lastMock = new Date(data.createdAt as string).toLocaleDateString()
              }
            }
          }

          nextRows.push({
            uid,
            username: profile.displayName || userNameByUid[uid] || 'User',
            xp: profile.xp,
            streak: profile.streak,
            weekHours: Number((weekSec / 3600).toFixed(1)),
            mockCount,
            lastMock,
            totalSessions,
            lastActivity: latestSession?.dayKey ?? 'No activity',
          })
        }

        if (!cancelled) {
          setRows(nextRows)
        }
      } catch (error) {
        console.error('Failed to load leaderboard:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { rows, loading, meUid }
}
