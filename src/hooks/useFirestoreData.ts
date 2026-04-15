import { useEffect, useState } from 'react'
import { subscribeMocks } from '../services/mocks'
import { subscribeRecentSessions } from '../services/sessionsQuery'
import { subscribeTasks } from '../services/tasks'
import type { MockDoc, StudySessionDoc, TaskDoc } from '../types'

export function useSessions(uid: string | undefined, limit: number) {
  const [sessions, setSessions] = useState<StudySessionDoc[]>([])
  useEffect(() => {
    if (!uid) {
      setSessions([])
      return
    }
    return subscribeRecentSessions(uid, limit, setSessions)
  }, [uid, limit])
  return sessions
}

export function useMocks(uid: string | undefined) {
  const [mocks, setMocks] = useState<MockDoc[]>([])
  useEffect(() => {
    if (!uid) {
      setMocks([])
      return
    }
    return subscribeMocks(uid, setMocks)
  }, [uid])
  return mocks
}

export function useTasks(uid: string | undefined) {
  const [tasks, setTasks] = useState<TaskDoc[]>([])
  useEffect(() => {
    if (!uid) {
      setTasks([])
      return
    }
    return subscribeTasks(uid, setTasks)
  }, [uid])
  return tasks
}
