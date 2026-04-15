import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { getDb } from '../firebase'
import { profileFromSnap } from '../services/userProfile'
import type { UserProfile } from '../types'

export function useUserProfile(uid: string | undefined) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!uid) {
      setProfile(null)
      return
    }
    const r = doc(getDb(), 'users', uid)
    return onSnapshot(
      r,
      (snap) => {
        setError(null)
        setProfile(profileFromSnap(snap.data() as Record<string, unknown> | undefined))
      },
      (e) => setError(e.message),
    )
  }, [uid])

  return { profile, error }
}
