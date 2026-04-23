import { useEffect, useState } from 'react'
import { listenToActiveSessions } from '../services/studySession'
import type { ActiveSession } from '../services/studySession'

export function useActiveSessions() {
  const [sessions, setSessions] = useState<ActiveSession[]>([])

  useEffect(() => {
    const unsubscribe = listenToActiveSessions((activeSessions) => {
      setSessions(activeSessions)
    })

    return () => unsubscribe()
  }, [])

  return sessions
}
