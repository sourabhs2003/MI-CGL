import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore'
import { getDb } from '../firebase'
import { normalizeStoredStudySeconds } from '../lib/studyDuration'
import type { StudySessionDoc, Subject, TimeOfDay } from '../types'

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
          durationSec: normalizeStoredStudySeconds({
            durationSec: x.durationSec,
            duration: x.duration,
            startTime: x.startTime,
            endTime: x.endTime,
          }),
          dayKey: String(x.dayKey ?? ''),
          startTime: typeof x.startTime === 'string' ? x.startTime : undefined,
          endTime: typeof x.endTime === 'string' ? x.endTime : undefined,
          timeOfDay: x.timeOfDay as TimeOfDay | undefined,
          endedAt: x.endedAt,
        })
      })
      cb(sessions)
    },
    () => cb([]),
  )
}
