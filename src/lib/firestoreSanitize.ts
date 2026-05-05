type PlainRecord = Record<string, unknown>

function isPlainRecord(value: unknown): value is PlainRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) return null as T

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForFirestore(item)) as T
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeForFirestore(item)]),
    ) as T
  }

  return value
}

export function assertNoUndefined(value: unknown, path = 'payload'): void {
  if (value === undefined) {
    throw new Error(`Firestore payload contains undefined at ${path}`)
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUndefined(item, `${path}[${index}]`))
    return
  }

  if (!isPlainRecord(value)) return

  for (const [key, item] of Object.entries(value)) {
    assertNoUndefined(item, `${path}.${key}`)
  }
}

export function prepareFirestoreData<T>(value: T): T {
  const sanitized = sanitizeForFirestore(value)
  assertNoUndefined(sanitized)
  return sanitized
}
