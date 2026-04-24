import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { format } from 'date-fns'
import { getDb } from '../firebase'
import { xpFromStudySeconds } from '../lib/xp'
import { currentMonthKey, isFrozenProfile } from '../lib/activityStatus'
import { calculateStudyXP, isSessionSuspicious } from './xpCalculation'
import type { Subject, TimeOfDay } from '../types'

type StudySessionInput = {
  subject: Subject
  topic: string
  durationSec: number
  startTime?: string
  endTime?: string
  timeOfDay?: TimeOfDay
}

type QueuedStudySession = {
  id: string
  uid: string
  createdAt: number
  input: StudySessionInput
}

const QUEUE_KEY = 'study-session-queue'
let syncPromise: Promise<void> | null = null

function readQueue(): QueuedStudySession[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as QueuedStudySession[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedStudySession[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function enqueueSession(uid: string, input: StudySessionInput) {
  const queue = readQueue()
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    uid,
    createdAt: Date.now(),
    input,
  })
  writeQueue(queue)
}

async function persistStudySession(uid: string, input: StudySessionInput): Promise<void> {
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
    const wasFrozen = isFrozenProfile(prev)
    const monthKey = currentMonthKey()
    const currentMonthlyXp = prev.xpMonth === monthKey ? Number(prev.xp) || 0 : 0
    const eligibleXp = wasFrozen ? 0 : studyXp

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
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
      timeOfDay: input.timeOfDay ?? null,
      endedAt: serverTimestamp(),
    })

    tx.set(
      userRef,
      {
        xp: currentMonthlyXp + eligibleXp,
        lifetimeXp: increment(eligibleXp),
        xpMonth: monthKey,
        streak: newStreak,
        lastStudyDay: today,
        isFrozen: false,
        frozenAt: null,
        comebackAt: wasFrozen ? serverTimestamp() : (prev.comebackAt ?? null),
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

export async function syncQueuedStudySessions(): Promise<void> {
  if (syncPromise) return syncPromise

  syncPromise = (async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    const queue = readQueue()
    if (!queue.length) return

    const remaining: QueuedStudySession[] = []
    for (const item of queue) {
      try {
        await persistStudySession(item.uid, item.input)
      } catch {
        remaining.push(item)
      }
    }
    writeQueue(remaining)
  })().finally(() => {
    syncPromise = null
  })

  return syncPromise
}

export async function saveStudySession(
  uid: string,
  input: StudySessionInput,
): Promise<{ queued: boolean }> {
  if (input.durationSec <= 0) return { queued: false }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    enqueueSession(uid, input)
    return { queued: true }
  }

  try {
    await persistStudySession(uid, input)
    await syncQueuedStudySessions()
    return { queued: false }
  } catch (error) {
    enqueueSession(uid, input)
    return { queued: true }
  }
}

// ==================== START-STOP SESSION SYSTEM ====================

export type ActiveSession = {
  id: string
  userId: string
  subject: Subject
  startTime: number
  endTime: number | null
  duration: number
  isManual: boolean
  isSuspicious: boolean
  dateKey: string
}

/**
 * Start a new study session
 * Creates a session document with endTime: null (active)
 */
export async function startSession(uid: string, subject: Subject): Promise<string> {
  const db = getDb()
  const today = format(new Date(), 'yyyy-MM-dd')
  const sessionRef = doc(collection(db, `users/${uid}/sessions`))

  await setDoc(sessionRef, {
    subject,
    startTime: Date.now(),
    endTime: null,
    duration: 0,
    isManual: false,
    isSuspicious: false,
    dateKey: today,
    dayKey: today,
  })

  // Update user's current session reference
  await setDoc(doc(db, 'users', uid), { currentSessionId: sessionRef.id }, { merge: true })

  return sessionRef.id
}

/**
 * Stop an active session
 * Calculates duration, checks for suspicious activity, awards XP
 */
export async function stopSession(uid: string, sessionId: string): Promise<void> {
  if (!uid || !sessionId) {
    console.error('stopSession called with invalid parameters:', { uid, sessionId })
    throw new Error('Invalid parameters: uid and sessionId are required')
  }

  const db = getDb()
  const sessionRef = doc(db, `users/${uid}/sessions`, sessionId)

  await runTransaction(db, async (tx) => {
    // Do all reads first
    const sessionSnap = await tx.get(sessionRef)
    if (!sessionSnap.exists()) {
      console.error('Session not found:', sessionId)
      throw new Error('Session not found')
    }

    const userRef = doc(db, 'users', uid)
    const userSnap = await tx.get(userRef)

    const session = sessionSnap.data() as { startTime: number; subject: Subject; dateKey: string }
    const endTime = Date.now()
    const durationMs = endTime - session.startTime
    const durationSec = Math.max(0, Math.round(durationMs / 1000))
    const isSuspicious = isSessionSuspicious(durationSec)

    console.log('Stopping session:', { sessionId, durationMs, durationSec, isSuspicious })

    const studyXp = calculateStudyXP(durationSec, false, isSuspicious)

    const prev = userSnap.exists()
      ? (userSnap.data() as Record<string, unknown>)
      : { xp: 0, streak: 0, lastStudyDay: null }
    const wasFrozen = isFrozenProfile(prev)
    const monthKey = currentMonthKey()
    const currentMonthlyXp = prev.xpMonth === monthKey ? Number(prev.xp) || 0 : 0
    const eligibleXp = wasFrozen ? 0 : studyXp

    const lastDay = (prev.lastStudyDay as string | null) ?? null
    const curStreak = Number(prev.streak) || 0

    let newStreak = curStreak
    if (lastDay === session.dateKey) {
      newStreak = curStreak
    } else if (lastDay == null) {
      newStreak = 1
    } else {
      const last = new Date(lastDay + 'T12:00:00')
      const t = new Date(session.dateKey + 'T12:00:00')
      const diffMs = t.getTime() - last.getTime()
      const diffDays = Math.round(diffMs / (24 * 3600 * 1000))
      if (diffDays === 1) newStreak = curStreak + 1
      else newStreak = 1
    }

    console.log('Updating user:', { studyXp, newStreak })

    // Do all writes after reads
    tx.update(sessionRef, {
      endTime,
      duration: durationMs,
      durationSec,
      isSuspicious,
      endedAt: serverTimestamp(),
    })

    tx.update(userRef, {
      xp: currentMonthlyXp + eligibleXp,
      lifetimeXp: increment(eligibleXp),
      xpMonth: monthKey,
      streak: newStreak,
      lastStudyDay: session.dateKey,
      isFrozen: false,
      frozenAt: null,
      comebackAt: wasFrozen ? serverTimestamp() : (prev.comebackAt ?? null),
      currentSessionId: null,
    })

    // Update daily stats
    const dailyRef = doc(db, `users/${uid}/dailyStats`, session.dateKey)
    tx.set(
      dailyRef,
      {
        totalSec: increment(durationSec),
        sessionCount: increment(1),
        [`subjects.${session.subject}`]: increment(durationSec),
      },
      { merge: true },
    )
  })
}

/**
 * Get current user's active session
 * Returns null if no active session
 */
export async function getActiveSession(uid: string): Promise<ActiveSession | null> {
  const db = getDb()
  const userRef = doc(db, 'users', uid)
  const userSnap = await getDoc(userRef)

  if (!userSnap.exists()) return null

  const userData = userSnap.data() as { currentSessionId: string | null }
  if (!userData.currentSessionId) return null

  const sessionRef = doc(db, `users/${uid}/sessions`, userData.currentSessionId)
  const sessionSnap = await getDoc(sessionRef)

  if (!sessionSnap.exists()) return null

  return { id: sessionSnap.id, ...sessionSnap.data() } as ActiveSession
}

/**
 * Listen to active sessions across all users for live squad status
 * Returns unsubscribe function
 */
export function listenToActiveSessions(callback: (sessions: ActiveSession[]) => void): () => void {
  const db = getDb()
  const q = query(
    collection(db, 'users'),
    where('currentSessionId', '!=', null),
  )

  // Note: This is a simplified version. In production, you'd need to query
  // the sessions collection directly with a composite index on endTime
  // For now, we'll query all users and filter
  const unsubscribe = onSnapshot(q, async (snapshot) => {
    const activeSessions: ActiveSession[] = []

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data() as { currentSessionId: string | null }
      if (!userData.currentSessionId) continue

      const sessionRef = doc(db, `users/${userDoc.id}/sessions`, userData.currentSessionId)
      const sessionSnap = await getDoc(sessionRef)

      if (sessionSnap.exists()) {
        const session = sessionSnap.data() as ActiveSession
        if (session.endTime === null) {
          activeSessions.push({ ...session, userId: userDoc.id })
        }
      }
    }

    callback(activeSessions)
  })

  return unsubscribe
}

/**
 * Delete a study session and update daily stats
 * This removes the session and deducts its time from daily stats
 */
export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  if (!uid || typeof uid !== 'string' || !uid.trim()) {
    console.error('deleteSession called with invalid uid:', { uid })
    throw new Error('Invalid uid')
  }
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    console.error('deleteSession called with invalid sessionId:', { sessionId })
    throw new Error('Invalid sessionId')
  }

  const db = getDb()
  const cleanUid = uid.trim()
  const cleanSessionId = sessionId.trim()

  console.log('deleteSession: Creating doc ref with path:', `users/${cleanUid}/sessions/${cleanSessionId}`)

  const sessionRef = doc(db, `users/${cleanUid}/sessions`, cleanSessionId)

  await runTransaction(db, async (tx) => {
    const sessionSnap = await tx.get(sessionRef)
    if (!sessionSnap.exists()) {
      console.error('Session not found:', sessionId)
      throw new Error('Session not found')
    }

    const session = sessionSnap.data() as Record<string, unknown>
    console.log('Session data:', session)

    const durationSec = typeof session.durationSec === 'number' ? session.durationSec : 0
    const subject = session.subject as Subject
    const dateKey = (session.dateKey || session.dayKey) as string | undefined

    if (!dateKey || typeof dateKey !== 'string' || !dateKey.trim()) {
      console.error('Session has no valid dateKey or dayKey:', sessionId, session)
      throw new Error('Session has no valid dateKey or dayKey')
    }

    // Delete the session
    tx.delete(sessionRef)

    // Update daily stats (deduct time)
    const cleanDateKey = dateKey.trim()
    console.log('Creating dailyRef with path:', `users/${cleanUid}/dailyStats/${cleanDateKey}`)
    const dailyRef = doc(db, `users/${cleanUid}/dailyStats`, cleanDateKey)
    tx.set(
      dailyRef,
      {
        totalSec: increment(-durationSec),
        sessionCount: increment(-1),
        [`subjects.${subject}`]: increment(-durationSec),
      },
      { merge: true },
    )
  })
}

/**
 * Update a study session's duration and subject
 * Updates the session and adjusts daily stats accordingly
 */
export async function updateSession(
  uid: string,
  sessionId: string,
  updates: { durationSec: number; subject: Subject },
): Promise<void> {
  if (!uid || typeof uid !== 'string' || !uid.trim()) {
    console.error('updateSession called with invalid uid:', { uid })
    throw new Error('Invalid uid')
  }
  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    console.error('updateSession called with invalid sessionId:', { sessionId })
    throw new Error('Invalid sessionId')
  }

  const db = getDb()
  const cleanUid = uid.trim()
  const cleanSessionId = sessionId.trim()
  const sessionRef = doc(db, `users/${cleanUid}/sessions`, cleanSessionId)

  await runTransaction(db, async (tx) => {
    const sessionSnap = await tx.get(sessionRef)
    if (!sessionSnap.exists()) {
      console.error('Session not found:', sessionId)
      throw new Error('Session not found')
    }

    const session = sessionSnap.data() as { durationSec: number; subject: Subject; dateKey?: string; dayKey?: string }
    const oldDurationSec = session.durationSec || 0
    const oldSubject = session.subject
    const newDurationSec = updates.durationSec
    const newSubject = updates.subject
    const dateKey = session.dateKey || session.dayKey

    if (!dateKey) {
      console.error('Session has no dateKey or dayKey:', sessionId, session)
      throw new Error('Session has no dateKey or dayKey')
    }

    // Update the session
    tx.update(sessionRef, {
      durationSec: newDurationSec,
      subject: newSubject,
    })

    // Update daily stats
    const dailyRef = doc(db, `users/${cleanUid}/dailyStats`, dateKey)
    const durationDiff = newDurationSec - oldDurationSec

    if (oldSubject === newSubject) {
      // Same subject, just update duration
      tx.set(
        dailyRef,
        {
          totalSec: increment(durationDiff),
          [`subjects.${newSubject}`]: increment(durationDiff),
        },
        { merge: true },
      )
    } else {
      // Different subject, deduct from old, add to new
      tx.set(
        dailyRef,
        {
          totalSec: increment(durationDiff),
          [`subjects.${oldSubject}`]: increment(-oldDurationSec),
          [`subjects.${newSubject}`]: increment(newDurationSec),
        },
        { merge: true },
      )
    }
  })
}
