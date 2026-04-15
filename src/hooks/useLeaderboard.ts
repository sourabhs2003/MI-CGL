import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { getDb } from '../firebase'
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
}

export function useLeaderboard() {
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

    async function load() {
      setLoading(true)
      try {
        const db = getDb()
        const usersRef = collection(db, 'users')

        // Fetch all users
        const usersSnap = await getDocs(usersRef)
        const users = usersSnap.docs.map((d) => ({
          uid: d.id,
          ...(profileFromSnap(d.data() as Record<string, unknown>) as { username?: string; xp?: number; streak?: number }),
        }))

        // Fetch sessions for each user to calculate weekly hours
        const weekKeys = lastNDaysKeys(7)
        const rows: Row[] = []

        for (const user of users) {
          if (cancelled) return

          const sessionsRef = collection(db, `users/${user.uid}/sessions`)
          const sessionsQuery = query(sessionsRef, orderBy('dayKey', 'desc'), limit(7))
          const sessionsSnap = await getDocs(sessionsQuery)

          const weekSec = sessionsSnap.docs
            .filter((d) => weekKeys.includes(d.data().dayKey))
            .reduce((sum, d) => sum + (d.data().durationSec || 0), 0)

          const weekHours = weekSec / 3600

          // Fetch mock count
          const mocksRef = collection(db, `users/${user.uid}/mocks`)
          const mocksSnap = await getDocs(mocksRef)
          const mockCount = mocksSnap.size

          // Fetch last mock
          let lastMock = 'None'
          if (mockCount > 0) {
            const lastMockDoc = await getDoc(
              doc(db, `users/${user.uid}/mocks`, mocksSnap.docs[mocksSnap.size - 1].id)
            )
            if (lastMockDoc.exists()) {
              const data = lastMockDoc.data() as { createdAt?: unknown }
              if (data.createdAt) {
                const date = new Date(data.createdAt as string)
                lastMock = date.toLocaleDateString()
              }
            }
          }

          rows.push({
            username: user.username || 'User',
            uid: user.uid,
            xp: user.xp || 0,
            streak: user.streak || 0,
            weekHours,
            mockCount,
            lastMock,
          })
        }

        if (!cancelled) {
          setRows(rows)
        }
      } catch (err) {
        console.error('Failed to load leaderboard:', err)
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
