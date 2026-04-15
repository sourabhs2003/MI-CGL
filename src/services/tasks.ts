import {
  addDoc,
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
import { XP_TASK_DONE } from '../lib/xp'
import type { TaskDoc } from '../types'

export function subscribeTasks(uid: string, cb: (tasks: TaskDoc[]) => void) {
  const q = query(
    collection(getDb(), `users/${uid}/tasks`),
    orderBy('createdAt', 'desc'),
  )
  return onSnapshot(
    q,
    (snap) => {
      const tasks: TaskDoc[] = []
      snap.forEach((d) => {
        const x = d.data() as Record<string, unknown>
        tasks.push({
          id: d.id,
          title: String(x.title ?? ''),
          subject: String(x.subject ?? 'Mixed'),
          dateKey: (x.dateKey as string) ?? undefined,
          priority: x.priority as TaskDoc['priority'],
          completed: Boolean(x.completed),
        })
      })
      cb(tasks)
    },
    () => cb([]),
  )
}

export async function addTask(
  uid: string,
  input: {
    title: string
    subject: string
    priority?: TaskDoc['priority']
    dateKey?: string
  },
): Promise<void> {
  const today = input.dateKey ?? format(new Date(), 'yyyy-MM-dd')
  await addDoc(collection(getDb(), `users/${uid}/tasks`), {
    title: input.title,
    subject: input.subject,
    dateKey: today,
    priority: input.priority ?? null,
    completed: false,
    createdAt: serverTimestamp(),
  })
}

export async function completeTask(uid: string, taskId: string): Promise<void> {
  const db = getDb()
  const ref = doc(db, `users/${uid}/tasks`, taskId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists()) return
    const data = snap.data() as Record<string, unknown>
    if (data.completed) return
    tx.update(ref, { completed: true })
    const userRef = doc(db, 'users', uid)
    
    let xpBonus = XP_TASK_DONE // 5
    if (data.priority === 'High') xpBonus = 15
    if (data.priority === 'Medium') xpBonus = 10
    
    tx.set(userRef, { xp: increment(xpBonus) }, { merge: true })
  })
}

export async function deleteTask(uid: string, taskId: string): Promise<void> {
  await deleteDoc(doc(getDb(), `users/${uid}/tasks`, taskId))
}
