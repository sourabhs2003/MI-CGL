import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDb } from '../firebase'
import type { UserProfile } from '../types'

export async function ensureUserProfile(uid: string): Promise<void> {
  const ref = doc(getDb(), 'users', uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  await setDoc(ref, {
    xp: 0,
    streak: 0,
    lastStudyDay: null,
    createdAt: serverTimestamp(),
  })
}

export function profileFromSnap(data: Record<string, unknown> | undefined): UserProfile {
  if (!data) {
    return { xp: 0, streak: 0, lastStudyDay: null }
  }
  return {
    xp: Number(data.xp) || 0,
    streak: Number(data.streak) || 0,
    lastStudyDay: (data.lastStudyDay as string) ?? null,
    displayName: data.displayName as string | undefined,
    createdAt: data.createdAt,
  }
}
