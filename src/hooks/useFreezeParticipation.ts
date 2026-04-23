import { useEffect, useState } from 'react'

const FREEZE_STORAGE_KEY = 'squad_freeze'
const FREEZE_COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24 hours cooldown
const MAX_FREEZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days max

interface FreezeState {
  isFrozen: boolean
  frozenAt: number | null
  lastUnfreezeAt: number | null
}

export function useFreezeParticipation() {
  const storageKey = (() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return FREEZE_STORAGE_KEY
      const parsed = JSON.parse(raw) as { uid?: string }
      return parsed.uid ? `${FREEZE_STORAGE_KEY}:${parsed.uid}` : FREEZE_STORAGE_KEY
    } catch {
      return FREEZE_STORAGE_KEY
    }
  })()

  const [freezeState, setFreezeState] = useState<FreezeState>({
    isFrozen: false,
    frozenAt: null,
    lastUnfreezeAt: null,
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey) ?? localStorage.getItem(FREEZE_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as FreezeState
        // Check if freeze should auto-unfreeze (max duration)
        if (parsed.isFrozen && parsed.frozenAt) {
          const elapsed = Date.now() - parsed.frozenAt
          if (elapsed >= MAX_FREEZE_DURATION_MS) {
            // Auto-unfreeze after max duration
            const newState = { isFrozen: false, frozenAt: null, lastUnfreezeAt: Date.now() }
            localStorage.setItem(storageKey, JSON.stringify(newState))
            setFreezeState(newState)
          } else {
            setFreezeState(parsed)
          }
        } else {
          setFreezeState(parsed)
        }
      }
    } catch (error) {
      console.error('Failed to load freeze state:', error)
    }
  }, [storageKey])

  const canFreeze = () => {
    if (freezeState.isFrozen) return false
    if (!freezeState.lastUnfreezeAt) return true
    const elapsed = Date.now() - freezeState.lastUnfreezeAt
    return elapsed >= FREEZE_COOLDOWN_MS
  }

  const getCooldownRemaining = () => {
    if (!freezeState.lastUnfreezeAt) return 0
    const elapsed = Date.now() - freezeState.lastUnfreezeAt
    const remaining = FREEZE_COOLDOWN_MS - elapsed
    return Math.max(0, remaining)
  }

  const getFreezeRemaining = () => {
    if (!freezeState.isFrozen || !freezeState.frozenAt) return 0
    const elapsed = Date.now() - freezeState.frozenAt
    const remaining = MAX_FREEZE_DURATION_MS - elapsed
    return Math.max(0, remaining)
  }

  const freeze = () => {
    if (!canFreeze()) return false
    const newState = {
      isFrozen: true,
      frozenAt: Date.now(),
      lastUnfreezeAt: null,
    }
    localStorage.setItem(storageKey, JSON.stringify(newState))
    setFreezeState(newState)
    return true
  }

  const unfreeze = () => {
    const newState = {
      isFrozen: false,
      frozenAt: null,
      lastUnfreezeAt: Date.now(),
    }
    localStorage.setItem(storageKey, JSON.stringify(newState))
    setFreezeState(newState)
  }

  const autoUnfreezeOnNewSession = () => {
    if (freezeState.isFrozen) {
      unfreeze()
    }
  }

  return {
    isFrozen: freezeState.isFrozen,
    frozenAt: freezeState.frozenAt,
    canFreeze: canFreeze(),
    freeze,
    unfreeze,
    autoUnfreezeOnNewSession,
    getCooldownRemaining,
    getFreezeRemaining,
  }
}
