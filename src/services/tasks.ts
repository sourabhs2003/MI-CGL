import {
  addDoc,
  arrayUnion,
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
import { format } from 'date-fns'
import { getDb } from '../firebase'
import { currentMonthKey, isFrozenProfile } from '../lib/activityStatus'
import { XP_TASK_DONE } from '../lib/xp'
import type { TaskDoc } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

function toMillis(value: unknown): number | null {
  if (!value) return null
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    const maybeTimestamp = value as { toMillis: () => number }
    return maybeTimestamp.toMillis()
  }
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function normalizeTask(uid: string, taskId: string, data: Record<string, unknown>, isGroupTask: boolean): TaskDoc {
  const completedBy = Array.isArray(data.completedBy)
    ? data.completedBy.filter((entry): entry is string => typeof entry === 'string')
    : []
  const completedAtBy = (data.completedAtBy as Record<string, unknown> | undefined) ?? {}
  const completedAt = isGroupTask ? completedAtBy[uid] : data.completedAt

  return {
    id: taskId,
    title: String(data.title ?? ''),
    subject: String(data.subject ?? 'Mixed'),
    type: (data.type as TaskDoc['type']) ?? 'study',
    targetType: data.targetType as TaskDoc['targetType'] | undefined,
    dateKey: typeof data.dateKey === 'string' ? data.dateKey : undefined,
    priority: data.priority as TaskDoc['priority'],
    value: data.value as number | undefined,
    duration: data.duration as number | undefined,
    notes: data.notes as string | undefined,
    completed: isGroupTask ? completedBy.includes(uid) : Boolean(data.completed),
    isGroupTask,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : undefined,
    createdAt: data.createdAt,
    completedAt,
    completedBy,
  }
}

function isExpiredForUser(task: TaskDoc): boolean {
  if (!task.completed) return false
  const completedAt = toMillis(task.completedAt)
  return completedAt !== null && Date.now() - completedAt > DAY_MS
}

export function subscribeTasks(uid: string, cb: (tasks: TaskDoc[]) => void) {
  const db = getDb()
  const personalQuery = query(collection(db, `users/${uid}/tasks`), orderBy('createdAt', 'desc'))
  const groupQuery = query(collection(db, 'groupTasks'), orderBy('createdAt', 'desc'))

  let personalTasks: TaskDoc[] = []
  let groupTasks: TaskDoc[] = []

  function emit() {
    const merged = [...personalTasks, ...groupTasks]
      .filter((task) => !isExpiredForUser(task))
      .sort((a, b) => (toMillis(b.createdAt) ?? 0) - (toMillis(a.createdAt) ?? 0))
    cb(merged)
  }

  const unsubPersonal = onSnapshot(
    personalQuery,
    (snap) => {
      personalTasks = snap.docs.map((d) => normalizeTask(uid, d.id, d.data() as Record<string, unknown>, false))
      emit()
    },
    () => {
      personalTasks = []
      emit()
    },
  )

  const unsubGroup = onSnapshot(
    groupQuery,
    (snap) => {
      groupTasks = snap.docs.map((d) => normalizeTask(uid, d.id, d.data() as Record<string, unknown>, true))
      emit()
    },
    () => {
      groupTasks = []
      emit()
    },
  )

  return () => {
    unsubPersonal()
    unsubGroup()
  }
}

export async function addTask(
  uid: string,
  input: {
    title: string
    subject: string
    type?: TaskDoc['type']
    targetType?: TaskDoc['targetType']
    priority?: TaskDoc['priority']
    dateKey?: string
    value?: number
    duration?: number
    notes?: string
    isGroupTask?: boolean
    createdBy?: string
  },
): Promise<void> {
  const today = input.dateKey ?? format(new Date(), 'yyyy-MM-dd')
  
  if (input.isGroupTask) {
    await addDoc(collection(getDb(), 'groupTasks'), {
      title: input.title,
      subject: input.subject,
      type: input.type ?? 'study',
      targetType: input.targetType ?? null,
      dateKey: today,
      priority: input.priority ?? null,
      completed: false,
      value: input.value ?? null,
      duration: input.duration ?? null,
      notes: input.notes ?? null,
      isGroupTask: true,
      createdBy: uid,
      createdAt: serverTimestamp(),
      completedBy: [],
      completedAtBy: {},
    })
    return
  }

  await addDoc(collection(getDb(), `users/${uid}/tasks`), {
    title: input.title,
    subject: input.subject,
    type: input.type ?? 'study',
    targetType: input.targetType ?? null,
    dateKey: today,
    priority: input.priority ?? null,
    completed: false,
    value: input.value ?? null,
    duration: input.duration ?? null,
    notes: input.notes ?? null,
    isGroupTask: false,
    createdBy: input.createdBy ?? null,
    createdAt: serverTimestamp(),
  })
}

export async function completeTask(uid: string, task: TaskDoc): Promise<void> {
  if (!task.id) return

  const db = getDb()
  if (task.isGroupTask) {
    const groupRef = doc(db, 'groupTasks', task.id)
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(groupRef)
      if (!snap.exists()) return
      const data = snap.data() as Record<string, unknown>
      const completedBy = Array.isArray(data.completedBy)
        ? data.completedBy.filter((entry): entry is string => typeof entry === 'string')
        : []
      if (completedBy.includes(uid)) return
      const userRef = doc(db, 'users', uid)
      const userSnap = await tx.get(userRef)
      const prev = userSnap.exists() ? (userSnap.data() as Record<string, unknown>) : {}
      const monthKey = currentMonthKey()
      const currentMonthlyXp = prev.xpMonth === monthKey ? Number(prev.xp) || 0 : 0
      const earnedXp = isFrozenProfile(prev) ? 0 : getTaskXp(task.priority)

      tx.update(groupRef, {
        completedBy: arrayUnion(uid),
        [`completedAtBy.${uid}`]: serverTimestamp(),
      })
      tx.set(userRef, { xp: currentMonthlyXp + earnedXp, lifetimeXp: increment(earnedXp), xpMonth: monthKey }, { merge: true })
    })
    return
  }

  const ref = doc(db, `users/${uid}/tasks`, task.id)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const data = snap.data() as Record<string, unknown>
    if (data.completed) return
    const userRef = doc(db, 'users', uid)
    const userSnap = await tx.get(userRef)
    const prev = userSnap.exists() ? (userSnap.data() as Record<string, unknown>) : {}
    const monthKey = currentMonthKey()
    const currentMonthlyXp = prev.xpMonth === monthKey ? Number(prev.xp) || 0 : 0
    const earnedXp = isFrozenProfile(prev) ? 0 : getTaskXp(task.priority)

    tx.update(ref, { completed: true, completedAt: serverTimestamp() })
    tx.set(userRef, { xp: currentMonthlyXp + earnedXp, lifetimeXp: increment(earnedXp), xpMonth: monthKey }, { merge: true })
  })
}

function getTaskXp(priority?: TaskDoc['priority']) {
  if (priority === 'High') return 15
  if (priority === 'Medium') return 10
  return XP_TASK_DONE
}

export async function deleteTask(uid: string, task: TaskDoc): Promise<void> {
  if (!task.id) return
  if (task.isGroupTask) {
    if (task.createdBy !== uid) return
    await deleteDoc(doc(getDb(), 'groupTasks', task.id))
    return
  }
  await deleteDoc(doc(getDb(), `users/${uid}/tasks`, task.id))
}
