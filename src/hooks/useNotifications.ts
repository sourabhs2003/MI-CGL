import { useEffect, useMemo, useState } from 'react'
import {
  evaluateMotivationNotification,
  listenForForegroundMessages,
  markAllNotificationsRead,
  markNotificationRead,
  registerFcmToken,
  subscribeNotifications,
  updateNotificationSettings,
} from '../services/notifications'
import type { AppNotificationDoc, MockDoc, NotificationSettings, TaskDoc, UserProfile } from '../types'

export function useNotifications(uid: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotificationDoc[]>([])

  useEffect(() => {
    if (!uid) {
      setNotifications([])
      return
    }
    return subscribeNotifications(uid, setNotifications)
  }, [uid])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  )

  return {
    notifications,
    unreadCount,
    markRead: (notificationId: string, read: boolean) => uid ? markNotificationRead(uid, notificationId, read) : Promise.resolve(),
    markAllRead: () => uid ? markAllNotificationsRead(uid) : Promise.resolve(),
  }
}

export function useForegroundNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let unsubscribe: (() => void) | undefined

    void listenForForegroundMessages((title, body) => {
      if (cancelled || !('Notification' in window) || Notification.permission !== 'granted') return
      void new Notification(title, { body, icon: '/icon.png' })
    }).then((nextUnsubscribe) => {
      unsubscribe = nextUnsubscribe
    })

    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [enabled])
}

export function useMotivationNotifications(
  uid: string | undefined,
  profile: UserProfile | null,
  tasks: TaskDoc[],
  mocks: MockDoc[],
) {
  useEffect(() => {
    if (!uid || !profile?.notificationSettings?.enabled || !profile.notificationSettings.motivationAlerts) return
    const timer = window.setTimeout(() => {
      void evaluateMotivationNotification(uid, profile, tasks, mocks)
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [uid, profile, tasks, mocks])
}

export async function saveNotificationSettings(uid: string, settings: NotificationSettings) {
  await updateNotificationSettings(uid, settings)
  if (settings.enabled) {
    const result = await registerFcmToken(uid)
    if (!result.ok) {
      throw new Error(result.reason ?? 'Could not enable browser notifications.')
    }
  }
}
