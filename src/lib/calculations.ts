import type { Subject } from '../types'

export const SUBJECTS: Subject[] = ['Maths', 'GS', 'English', 'Reasoning', 'Mock'] as const

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function timeToMinutes(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null
  return hh * 60 + mm
}

export function durationMinutes(start: string, end: string): number | null {
  const s = timeToMinutes(start)
  const e = timeToMinutes(end)
  if (s == null || e == null) return null
  if (e >= s) return e - s
  return 24 * 60 - s + e
}

export function minutesToSec(min: number): number {
  return Math.max(0, Math.round(min)) * 60
}
