import {
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { format } from 'date-fns'
import { getDb } from '../firebase'
import { xpFromStudySeconds } from '../lib/xp'
import type { Subject } from '../types'

export async function saveStudySession(
  uid: string,
  input: {
    subject: Subject
    topic: string
    durationSec: number
  },
): Promise<void> {
  if (input.durationSec <= 0) return

  const db = getDb()
  const today = format(new Date(), 'yyyy-MM-dd')
  const studyXp = xpFromStudySeconds(input.durationSec)

  await runTransaction(db, async (tx) => {
    const userRef = doc(db, 'users', uid)
    const userSnap = await tx.get(userRef)
    const prev = userSnap.exists()
      ? (userSnap.data() as Record<string, unknown>)
      : { xp: 0, streak: 0, lastStudyDay: null }

    const lastDay = (prev.lastStudyDay as string | null) ?? null
    const curStreak = Number(prev.streak) || 0

    let newStreak = curStreak
    if (lastDay === today) {
      newStreak = curStreak
    } else if (lastDay == null) {
      newStreak = 1
    } else {
      const last = new Date(lastDay + 'T12:00:00')
      const t = new Date(today + 'T12:00:00')
      const diffMs = t.getTime() - last.getTime()
      const diffDays = Math.round(diffMs / (24 * 3600 * 1000))
      if (diffDays === 1) newStreak = curStreak + 1
      else newStreak = 1
    }

    const sessionRef = doc(collection(db, `users/${uid}/sessions`))
    tx.set(sessionRef, {
      subject: input.subject,
      topic: input.topic,
      durationSec: input.durationSec,
      dayKey: today,
      endedAt: serverTimestamp(),
    })

    tx.set(
      userRef,
      {
        xp: increment(studyXp),
        streak: newStreak,
        lastStudyDay: today,
      },
      { merge: true },
    )

    const dailyRef = doc(db, `users/${uid}/dailyStats`, today)
    tx.set(
      dailyRef,
      {
        totalSec: increment(input.durationSec),
        sessionCount: increment(1),
        [`subjects.${input.subject}`]: increment(input.durationSec),
      },
      { merge: true },
    )
  })
}
