import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { getDb } from '../firebase'
import type { StudySessionDoc, Subject } from '../types'

export function subscribeRecentSessions(
  uid: string,
  max: number,
  cb: (sessions: StudySessionDoc[]) => void,
) {
  const q = query(
    collection(getDb(), `users/${uid}/sessions`),
    orderBy('endedAt', 'desc'),
    limit(max),
  )
  return onSnapshot(
    q,
    (snap) => {
      const sessions: StudySessionDoc[] = []
      snap.forEach((d) => {
        const x = d.data() as Record<string, unknown>
        sessions.push({
          id: d.id,
          subject: x.subject as Subject,
          topic: String(x.topic ?? ''),
          durationSec: Number(x.durationSec) || 0,
          dayKey: String(x.dayKey ?? ''),
          endedAt: x.endedAt,
        })
      })
      cb(sessions)
    },
    () => cb([]),
  )
}
