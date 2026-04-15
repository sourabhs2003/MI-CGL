import {
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import { getDb } from '../firebase'
import { XP_MOCK_DONE } from '../lib/xp'
import { saveStudySession } from './studySession'
import type { MockDoc } from '../types'

export function subscribeMocks(uid: string, cb: (rows: MockDoc[]) => void) {
  const q = query(
    collection(getDb(), `users/${uid}/mocks`),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      const rows: MockDoc[] = []
      snap.forEach((d) => {
        const x = d.data() as Record<string, unknown>
        rows.push({
          id: d.id,
          label: String(x.label ?? ''),
          kind: (x.kind as MockDoc['kind']) ?? 'full_t1',
          subject: (x.subject as MockDoc['subject']) ?? 'Mixed',
          score: Number(x.score) || 0,
          maxScore: Number(x.maxScore) || 0,
          accuracyPct: Number(x.accuracyPct) || 0,
          durationMin: Number(x.durationMin) || 0,
          createdAt: x.createdAt,
        })
      })
      cb(rows)
    },
    () => cb([]),
  )
}

export async function addSectionalMock(
  uid: string,
  input: Omit<MockDoc, 'id' | 'createdAt' | 'kind' | 'label'>,
): Promise<void> {
  const db = getDb()
  await runTransaction(db, async (tx) => {
    const mockRef = doc(collection(db, `users/${uid}/sectionalMocks`))
    tx.set(mockRef, {
      ...input,
      kind: 'sectional',
      label: 'Sectional Mock',
      createdAt: serverTimestamp(),
    })
    const userRef = doc(db, 'users', uid)
    tx.set(userRef, { xp: increment(XP_MOCK_DONE) }, { merge: true })
  })

  // Sectional mock adds +15 min study time
  await saveStudySession(uid, {
    subject: input.subject,
    topic: 'Sectional Mock bonus',
    durationSec: 15 * 60,
  })
}

export async function addFullMock(
  uid: string,
  input: Omit<MockDoc, 'id' | 'createdAt' | 'label'>,
): Promise<void> {
  const db = getDb()
  await runTransaction(db, async (tx) => {
    const mockRef = doc(collection(db, `users/${uid}/fullMocks`))
    tx.set(mockRef, {
      ...input,
      label: `Full Mock (${input.kind === 'full_t1' ? 'T1' : 'T2'})`,
      createdAt: serverTimestamp(),
    })
    const userRef = doc(db, 'users', uid)
    tx.set(userRef, { xp: increment(XP_MOCK_DONE) }, { merge: true })
  })

  // Full mock adds study time bonus: T1 => +1h, T2 => +2h
  const bonusMin = input.kind === 'full_t2' ? 120 : 60
  await saveStudySession(uid, {
    subject: 'Mixed',
    topic: `Full Mock bonus (${input.kind})`,
    durationSec: bonusMin * 60,
  })
}

export async function addMock(
  uid: string,
  input: Omit<MockDoc, 'id' | 'createdAt'>,
): Promise<void> {
  const db = getDb()
  await runTransaction(db, async (tx) => {
    const mockRef = doc(collection(db, `users/${uid}/mocks`))
    tx.set(mockRef, {
      ...input,
      createdAt: serverTimestamp(),
    })
    const userRef = doc(db, 'users', uid)
    tx.set(userRef, { xp: increment(XP_MOCK_DONE) }, { merge: true })
  })

  // Study time bonus rules (PRD v2 premium): convert mocks into study time.
  // Sectional => +15m, Tier1 => +1h, Tier2 => +2h.
  const bonusMin =
    input.kind === 'sectional' ? 15 : input.kind === 'full_t2' ? 120 : 60
  await saveStudySession(uid, {
    subject: input.kind === 'sectional' ? input.subject : 'Mixed',
    topic: `Mock bonus (${input.kind})`,
    durationSec: bonusMin * 60,
  })
}

export async function deleteMock(uid: string, mockId: string): Promise<void> {
  await deleteDoc(doc(getDb(), `users/${uid}/mocks`, mockId))
}
