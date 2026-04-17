import { getIdentity } from './identity'

const STORAGE_KEY = 'user'

export const USERS = [
  { username: 'gangleader', password: '162003', uid: 'user1' },
  { username: 'terrorist', password: '85903', uid: 'user2' },
  { username: 'Almighty', password: '94471', uid: 'user3' },
  { username: 'shadow', password: '88913', uid: 'user4' },
] as const

/** Stored session (password is never persisted). */
export type SessionUser = {
  username: string
  uid: string
  displayName?: string
  avatarIcon?: string
  avatarColor?: string
}

export function getUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionUser
    if (
      !parsed ||
      typeof parsed.uid !== 'string' ||
      typeof parsed.username !== 'string'
    ) {
      return null
    }
    if (!(ALLOWED_UIDS as readonly string[]).includes(parsed.uid)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export const ALLOWED_UIDS = ['user1', 'user2', 'user3', 'user4'] as const

export function login(username: string, password: string): SessionUser | null {
  const row = USERS.find(
    (u) => u.username === username && u.password === password,
  )
  if (!row) return null
  const identity = getIdentity(row.username)
  const session: SessionUser = {
    username: row.username,
    uid: row.uid,
    displayName: identity.displayName,
    avatarIcon: identity.avatar.icon,
    avatarColor: identity.avatar.color,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}

export function logout(): void {
  localStorage.removeItem(STORAGE_KEY)
}
