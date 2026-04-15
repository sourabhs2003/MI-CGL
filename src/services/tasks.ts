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
import { USERS } from '../lib/auth'
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
    dateKey: typeof data.dateKey === 'string' ? data.dateKey : undefined,
    priority: data.priority as TaskDoc['priority'],
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

async function cleanupExpiredTasks(uid: string, tasks: TaskDoc[]) {
  const db = getDb()
  await Promise.all(
    tasks.map(async (task) => {
      if (!isExpiredForUser(task) || !task.id) return

      if (!task.isGroupTask) {
        await deleteDoc(doc(db, `users/${uid}/tasks`, task.id))
        return
      }

      const completedAtBy = task.completedBy ?? []
      const everyoneDone = USERS.every((user) => completedAtBy.includes(user.uid))
      if (everyoneDone) {
        await deleteDoc(doc(db, 'groupTasks', task.id))
      }
    }),
  )
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

  const offPersonal = onSnapshot(
    personalQuery,
    (snap) => {
      personalTasks = snap.docs.map((entry) =>
        normalizeTask(uid, entry.id, entry.data() as Record<string, unknown>, false),
      )
      void cleanupExpiredTasks(uid, personalTasks)
      emit()
    },
    () => {
      personalTasks = []
      emit()
    },
  )

  const offGroup = onSnapshot(
    groupQuery,
    (snap) => {
      groupTasks = snap.docs.map((entry) =>
        normalizeTask(uid, entry.id, entry.data() as Record<string, unknown>, true),
      )
      void cleanupExpiredTasks(uid, groupTasks)
      emit()
    },
    () => {
      groupTasks = []
      emit()
    },
  )

  return () => {
    offPersonal()
    offGroup()
  }
}

export async function addTask(
  uid: string,
  input: {
    title: string
    subject: string
    priority?: TaskDoc['priority']
    dateKey?: string
    isGroupTask?: boolean
  },
): Promise<void> {
  const today = input.dateKey ?? format(new Date(), 'yyyy-MM-dd')
  const payload = {
    title: input.title,
    subject: input.subject,
    dateKey: today,
    priority: input.priority ?? null,
    completed: false,
    createdAt: serverTimestamp(),
    createdBy: uid,
    isGroupTask: Boolean(input.isGroupTask),
  }

  if (input.isGroupTask) {
    await addDoc(collection(getDb(), 'groupTasks'), {
      ...payload,
      completedBy: [],
      completedAtBy: {},
    })
    return
  }

  await addDoc(collection(getDb(), `users/${uid}/tasks`), {
    ...payload,
    completedAt: null,
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

      tx.update(groupRef, {
        completedBy: arrayUnion(uid),
        [`completedAtBy.${uid}`]: serverTimestamp(),
      })
      tx.set(doc(db, 'users', uid), { xp: increment(getTaskXp(task.priority)) }, { merge: true })
    })
    return
  }

  const ref = doc(db, `users/${uid}/tasks`, task.id)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const data = snap.data() as Record<string, unknown>
    if (data.completed) return

    tx.update(ref, { completed: true, completedAt: serverTimestamp() })
    tx.set(doc(db, 'users', uid), { xp: increment(getTaskXp(task.priority)) }, { merge: true })
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
