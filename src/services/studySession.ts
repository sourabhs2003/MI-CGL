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
