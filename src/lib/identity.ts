import type { UserAvatar } from '../types'

const STORAGE_KEY = 'mi-cgl-identities'
const ICONS = ['🐦‍🔥', '🦁', '🛰️', '🛡️', '⚔️', '🧠', '🚀', '🐺'] as const
const COLORS = ['#22c55e', '#38bdf8', '#f59e0b', '#ef4444', '#a78bfa', '#14b8a6', '#f97316', '#e879f9'] as const

type IdentityRecord = {
  displayName: string
  avatar: UserAvatar
  username: string
}

function readIdentities(): Record<string, IdentityRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, IdentityRecord>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeIdentities(value: Record<string, IdentityRecord>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function hashName(name: string) {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0
  }
  return hash
}

export function capitalizeName(name: string) {
  if (!name) return 'User'
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

export function getPngIconPath(username: string): string {
  const lowerUsername = username.trim().toLowerCase()
  const iconPath = `/${lowerUsername}.png`
  return iconPath
}

export function getIdentity(name: string): IdentityRecord {
  const key = name.trim().toLowerCase()
  const cache = readIdentities()
  const existing = cache[key]
  if (existing) return existing

  const hash = hashName(key)
  const created = {
    displayName: capitalizeName(name),
    username: key,
    avatar: {
      icon: ICONS[hash % ICONS.length]!,
      color: COLORS[hash % COLORS.length]!,
    },
  }
  cache[key] = created
  writeIdentities(cache)
  return created
}
