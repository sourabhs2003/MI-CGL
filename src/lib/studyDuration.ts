export function normalizeStoredStudySeconds(input: {
  durationSec?: unknown
  duration?: unknown
  startTime?: unknown
  endTime?: unknown
  totalSec?: unknown
}): number {
  const explicitSeconds = Number(input.durationSec)
  if (Number.isFinite(explicitSeconds) && explicitSeconds > 0) {
    return explicitSeconds
  }

  const durationValue = Number(input.duration)
  const hasTimerShape = typeof input.startTime === 'number' || typeof input.endTime === 'number'
  if (Number.isFinite(durationValue) && durationValue > 0) {
    if (hasTimerShape) {
      return durationValue / 1000
    }
    if (durationValue >= 86400) {
      return durationValue / 1000
    }
    return durationValue
  }

  const totalValue = Number(input.totalSec)
  if (Number.isFinite(totalValue) && totalValue > 0) {
    if (totalValue >= 86400) {
      return totalValue / 1000
    }
    return totalValue
  }

  return 0
}
