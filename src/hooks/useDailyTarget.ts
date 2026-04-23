import { useEffect, useMemo, useState } from 'react'
import { todayKey } from '../lib/dates'

type TargetState = {
  targetHours: number
  lastUpgradeDay: string | null
  highestTargetHours: number
}

const BASE_TARGET_HOURS = 4
const TARGET_STEP_HOURS = 0.5

function getStorageKey(uid: string) {
  return `daily-target:${uid}`
}

function readTargetState(uid: string): TargetState {
  if (typeof localStorage === 'undefined') {
    return { targetHours: BASE_TARGET_HOURS, lastUpgradeDay: null, highestTargetHours: BASE_TARGET_HOURS }
  }

  try {
    const raw = localStorage.getItem(getStorageKey(uid))
    if (!raw) return { targetHours: BASE_TARGET_HOURS, lastUpgradeDay: null, highestTargetHours: BASE_TARGET_HOURS }
    const parsed = JSON.parse(raw) as Partial<TargetState>
    const targetHours = Number(parsed.targetHours) || BASE_TARGET_HOURS
    const highestTargetHours = Math.max(Number(parsed.highestTargetHours) || BASE_TARGET_HOURS, targetHours)
    return {
      targetHours,
      highestTargetHours,
      lastUpgradeDay: typeof parsed.lastUpgradeDay === 'string' ? parsed.lastUpgradeDay : null,
    }
  } catch {
    return { targetHours: BASE_TARGET_HOURS, lastUpgradeDay: null, highestTargetHours: BASE_TARGET_HOURS }
  }
}

function writeTargetState(uid: string, state: TargetState) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(getStorageKey(uid), JSON.stringify(state))
}

export function useDailyTarget(uid: string, todaySec: number) {
  const today = todayKey()
  const [state, setState] = useState<TargetState>(() => readTargetState(uid))

  useEffect(() => {
    setState(readTargetState(uid))
  }, [uid])

  useEffect(() => {
    if (todaySec < state.targetHours * 3600 || state.lastUpgradeDay === today) return
    const nextTarget = Number((state.targetHours + TARGET_STEP_HOURS).toFixed(1))
    const nextState = {
      targetHours: nextTarget,
      lastUpgradeDay: today,
      highestTargetHours: Math.max(state.highestTargetHours, nextTarget),
    }
    writeTargetState(uid, nextState)
    setState(nextState)
  }, [state, today, todaySec, uid])

  return useMemo(
    () => ({
      targetHours: state.targetHours,
      targetSec: state.targetHours * 3600,
      upgradedToday: state.lastUpgradeDay === today,
      highestTargetHours: state.highestTargetHours,
      baseTargetHours: BASE_TARGET_HOURS,
    }),
    [state, today],
  )
}
