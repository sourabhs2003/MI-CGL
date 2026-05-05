import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { getToken, onMessage } from 'firebase/messaging'
import { getDb, getFcmMessaging } from '../firebase'
import { ALLOWED_UIDS } from '../lib/auth'
import { todayKey } from '../lib/dates'
import { prepareFirestoreData } from '../lib/firestoreSanitize'
import type {
  AppNotificationDoc,
  MockDoc,
  NotificationSettings,
  NotificationType,
  TaskDoc,
  UserProfile,
} from '../types'

const MAX_NOTIFICATIONS_PER_DAY = 4
const SQUAD_COOLDOWN_MS = 45 * 60 * 1000
const MOTIVATION_COOLDOWN_MS = 8 * 60 * 60 * 1000

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  squadAlerts: true,
  motivationAlerts: true,
}

function toMillis(value: unknown): number | null {
  if (!value) return null
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis()
  }
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function settingsFromProfile(data: Record<string, unknown> | undefined): NotificationSettings {
  const settings = data?.notificationSettings as Partial<NotificationSettings> | undefined
  return {
    enabled: settings?.enabled ?? DEFAULT_SETTINGS.enabled,
    squadAlerts: settings?.squadAlerts ?? DEFAULT_SETTINGS.squadAlerts,
    motivationAlerts: settings?.motivationAlerts ?? DEFAULT_SETTINGS.motivationAlerts,
  }
}

function isAllowedBySettings(type: NotificationType, settings: NotificationSettings): boolean {
  if (!settings.enabled) return false
  if (type === 'squad_session_started') return settings.squadAlerts
  return settings.motivationAlerts
}

function notificationCooldown(type: NotificationType): number {
  return type === 'squad_session_started' ? SQUAD_COOLDOWN_MS : MOTIVATION_COOLDOWN_MS
}

async function hashToken(token: string): Promise<string> {
  const input = new TextEncoder().encode(token)
  const buffer = await crypto.subtle.digest('SHA-256', input)
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function subscribeNotifications(uid: string, cb: (rows: AppNotificationDoc[]) => void) {
  const q = query(collection(getDb(), `users/${uid}/notifications`), orderBy('createdAt', 'desc'), limit(30))
  return onSnapshot(
    q,
    (snap) => {
      cb(
        snap.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<AppNotificationDoc, 'id'>),
        })),
      )
    },
    () => cb([]),
  )
}

export async function updateNotificationSettings(uid: string, settings: NotificationSettings): Promise<void> {
  await setDoc(doc(getDb(), 'users', uid), prepareFirestoreData({ notificationSettings: settings }), { merge: true })
}

export async function markNotificationRead(uid: string, notificationId: string, read: boolean): Promise<void> {
  await updateDoc(doc(getDb(), `users/${uid}/notifications`, notificationId), { read })
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snap = await getDocs(query(collection(getDb(), `users/${uid}/notifications`), where('read', '==', false), limit(30)))
  const batch = writeBatch(getDb())
  snap.docs.forEach((item) => batch.update(item.ref, { read: true }))
  await batch.commit()
}

async function createNotification(
  recipientId: string,
  input: {
    type: NotificationType
    title: string
    body: string
    senderId?: string | null
    senderName?: string | null
    actionUrl?: string | null
    cooldownMs?: number
  },
): Promise<boolean> {
  const db = getDb()
  const userRef = doc(db, 'users', recipientId)
  const notificationRef = doc(collection(db, `users/${recipientId}/notifications`))
  const outboxRef = doc(collection(db, 'notificationOutbox'))
  const today = todayKey()

  return runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef)
    const userData = userSnap.data() as Record<string, unknown> | undefined
    const settings = settingsFromProfile(userData)
    if (!isAllowedBySettings(input.type, settings)) return false

    const stats = (userData?.notificationStats ?? {}) as Record<string, unknown>
    const sentToday = stats.dayKey === today ? Number(stats.sentToday) || 0 : 0
    if (sentToday >= MAX_NOTIFICATIONS_PER_DAY) return false

    const lastByType = (stats.lastByType ?? {}) as Record<string, unknown>
    const lastSent = toMillis(lastByType[input.type])
    if (lastSent && Date.now() - lastSent < (input.cooldownMs ?? notificationCooldown(input.type))) return false

    const payload = prepareFirestoreData({
      type: input.type,
      title: input.title,
      body: input.body,
      read: false,
      senderId: input.senderId ?? null,
      senderName: input.senderName ?? null,
      actionUrl: input.actionUrl ?? null,
      dayKey: today,
      createdAt: serverTimestamp(),
    })

    tx.set(notificationRef, payload)
    tx.set(outboxRef, prepareFirestoreData({
      recipientId,
      notificationId: notificationRef.id,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? '/',
      status: 'pending',
      createdAt: serverTimestamp(),
    }))
    tx.set(userRef, prepareFirestoreData({
      notificationStats: {
        dayKey: today,
        sentToday: sentToday + 1,
        lastByType: {
          ...lastByType,
          [input.type]: serverTimestamp(),
        },
      },
    }), { merge: true })

    return true
  })
}

export async function notifySquadStudyStarted(senderId: string, senderName: string): Promise<void> {
  const db = getDb()
  const senderRef = doc(db, 'users', senderId)
  const shouldSend = await runTransaction(db, async (tx) => {
    const senderSnap = await tx.get(senderRef)
    const senderData = senderSnap.data() as Record<string, unknown> | undefined
    const last = toMillis((senderData?.notificationMeta as Record<string, unknown> | undefined)?.lastSquadStudyAlertAt)
    if (last && Date.now() - last < SQUAD_COOLDOWN_MS) return false
    tx.set(senderRef, prepareFirestoreData({
      notificationMeta: {
        ...((senderData?.notificationMeta as Record<string, unknown> | undefined) ?? {}),
        lastSquadStudyAlertAt: serverTimestamp(),
      },
    }), { merge: true })
    return true
  })

  if (!shouldSend) return

  await Promise.all(
    ALLOWED_UIDS
      .filter((recipientId) => recipientId !== senderId)
      .map((recipientId) => createNotification(recipientId, {
        type: 'squad_session_started',
        title: 'Squad study alert',
        body: `${senderName} started studying - join now`,
        senderId,
        senderName,
        actionUrl: '/squad',
        cooldownMs: SQUAD_COOLDOWN_MS,
      })),
  )
}

function getMockAccuracy(mock: MockDoc): number {
  return Math.max(0, Math.min(100, Number(mock.overall.accuracy) || 0))
}

export async function evaluateMotivationNotification(
  uid: string,
  profile: UserProfile | null,
  tasks: TaskDoc[],
  mocks: MockDoc[],
): Promise<void> {
  if (!profile) return
  const today = todayKey()
  const todaysTasks = tasks.filter((task) => task.dateKey === today)
  const missedTarget = todaysTasks.some((task) => !task.completed && (task.priority === 'High' || task.type === 'target'))
  const sortedMocks = [...mocks].sort((a, b) => String(b.dayKey).localeCompare(String(a.dayKey)))
  const recent3 = sortedMocks.slice(0, 3).map(getMockAccuracy)
  const previous3 = sortedMocks.slice(3, 6).map(getMockAccuracy)
  const recentAvg = recent3.reduce((sum, value) => sum + value, 0) / Math.max(1, recent3.length)
  const previousAvg = previous3.reduce((sum, value) => sum + value, 0) / Math.max(1, previous3.length)

  if (profile.lastStudyDay !== today) {
    await createNotification(uid, {
      type: 'motivation_no_study_today',
      title: 'Start today',
      body: "You haven't studied today - start now",
      actionUrl: '/',
    })
    return
  }

  if (recent3.length === 3 && previous3.length === 3 && previousAvg - recentAvg >= 5) {
    await createNotification(uid, {
      type: 'motivation_falling_performance',
      title: 'Accuracy check',
      body: 'Your accuracy dropped last 3 mocks',
      actionUrl: '/mocks/analysis',
    })
    return
  }

  if (missedTarget) {
    await createNotification(uid, {
      type: 'motivation_missed_target',
      title: 'Target pending',
      body: 'A priority target is still open today',
      actionUrl: '/tasks',
    })
    return
  }

  if ((profile.streak ?? 0) > 0 && profile.streak < 3) {
    await createNotification(uid, {
      type: 'motivation_low_consistency',
      title: 'Build consistency',
      body: 'Your streak is fragile - protect it with one focused session',
      actionUrl: '/',
    })
  }
}

export async function registerFcmToken(uid: string): Promise<{ ok: boolean; reason?: string }> {
  if (!('Notification' in window)) return { ok: false, reason: 'Notifications are not supported in this browser.' }
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
  if (!vapidKey) return { ok: false, reason: 'Missing VITE_FIREBASE_VAPID_KEY.' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'Notification permission was not granted.' }

  const messaging = await getFcmMessaging()
  if (!messaging) return { ok: false, reason: 'Firebase Messaging is not supported in this browser.' }

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
  if (!token) return { ok: false, reason: 'FCM did not return a device token.' }

  const tokenHash = await hashToken(token)
  await setDoc(doc(getDb(), 'users', uid), prepareFirestoreData({
    fcmTokens: {
      [tokenHash]: {
        token,
        platform: navigator.userAgent,
        enabled: true,
        updatedAt: serverTimestamp(),
      },
    },
  }), { merge: true })
  await setDoc(doc(getDb(), `users/${uid}/deviceTokens`, tokenHash), prepareFirestoreData({
    token,
    platform: navigator.userAgent,
    enabled: true,
    updatedAt: serverTimestamp(),
  }), { merge: true })

  return { ok: true }
}

export async function listenForForegroundMessages(cb: (title: string, body: string) => void): Promise<() => void> {
  const messaging = await getFcmMessaging()
  if (!messaging) return () => {}
  return onMessage(messaging, (payload) => {
    cb(payload.notification?.title ?? 'Notification', payload.notification?.body ?? '')
  })
}
