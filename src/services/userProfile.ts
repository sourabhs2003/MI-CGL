import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDb } from '../firebase'
import { getIdentity } from '../lib/identity'
import type { UserProfile } from '../types'

export async function ensureUserProfile(uid: string): Promise<void> {
  const ref = doc(getDb(), 'users', uid)
  const snap = await getDoc(ref)
  const sessionRaw = localStorage.getItem('user')
  const session = sessionRaw ? (JSON.parse(sessionRaw) as { uid?: string; username?: string }) : null
  const identity = session?.uid === uid && session.username ? getIdentity(session.username) : null
  const nextIdentity = {
    displayName: identity?.displayName ?? undefined,
    avatarIcon: identity?.avatar.icon ?? undefined,
    avatarColor: identity?.avatar.color ?? undefined,
  }

  if (snap.exists()) {
    const data = snap.data() as Record<string, unknown>
    const missingIdentity =
      (nextIdentity.displayName && typeof data.displayName !== 'string') ||
      (nextIdentity.avatarIcon && typeof data.avatarIcon !== 'string') ||
      (nextIdentity.avatarColor && typeof data.avatarColor !== 'string')

    if (!missingIdentity) return

    await setDoc(
      ref,
      {
        displayName: data.displayName ?? nextIdentity.displayName,
        avatarIcon: data.avatarIcon ?? nextIdentity.avatarIcon,
        avatarColor: data.avatarColor ?? nextIdentity.avatarColor,
      },
      { merge: true },
    )
    return
  }

  await setDoc(ref, {
    xp: 0,
    streak: 0,
    lastStudyDay: null,
    displayName: nextIdentity.displayName,
    avatarIcon: nextIdentity.avatarIcon,
    avatarColor: nextIdentity.avatarColor,
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
    avatarIcon: data.avatarIcon as string | undefined,
    avatarColor: data.avatarColor as string | undefined,
    createdAt: data.createdAt,
  }
}
