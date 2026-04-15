export function toMillis(v: unknown): number {
  if (!v || typeof v !== 'object') return 0
  const t = v as { toDate?: () => Date; seconds?: number }
  if (typeof t.toDate === 'function') return t.toDate().getTime()
  if (typeof t.seconds === 'number') return t.seconds * 1000
  return 0
}
