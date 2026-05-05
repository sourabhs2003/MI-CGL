import { useMemo, useState } from 'react'
import { Bell, BellOff, CheckCheck, Circle, Settings, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { saveNotificationSettings, useNotifications } from '../hooks/useNotifications'
import type { NotificationSettings, UserProfile } from '../types'

type Props = {
  uid: string
  profile: UserProfile | null
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  squadAlerts: true,
  motivationAlerts: true,
}

function formatTime(value: unknown): string {
  if (!value) return ''
  const millis =
    typeof value === 'object' && value !== null && 'toMillis' in value
      ? (value as { toMillis: () => number }).toMillis()
      : typeof value === 'string'
        ? Date.parse(value)
        : 0
  if (!millis || !Number.isFinite(millis)) return ''
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(millis))
}

export function NotificationCenter({ uid, profile }: Props) {
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(uid)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const settings = useMemo(
    () => profile?.notificationSettings ?? DEFAULT_SETTINGS,
    [profile?.notificationSettings],
  )

  async function updateSetting(next: NotificationSettings) {
    setSaving(true)
    setStatus('')
    try {
      await saveNotificationSettings(uid, next)
      setStatus(next.enabled ? 'Squad alerts reach every member who keeps notifications on.' : 'Notifications are off for this account.')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not update notifications.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="notification-center">
      <button
        type="button"
        className={`notification-bell ${unreadCount ? 'has-unread' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unreadCount ? <span>{Math.min(unreadCount, 9)}</span> : null}
      </button>

      {open ? (
        <div className="notification-panel" role="dialog" aria-label="Notifications">
          <div className="notification-panel-head">
            <div>
              <strong>Notifications</strong>
              <p>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</p>
            </div>
            <div className="notification-head-actions">
              <button type="button" className="btn-icon sm" onClick={() => void markAllRead()} title="Mark all read">
                <CheckCheck size={15} />
              </button>
              <button type="button" className="btn-icon sm" onClick={() => setOpen(false)} title="Close">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="notification-settings">
            <div className="notification-settings-title">
              <Settings size={14} />
              <span>Control</span>
            </div>
            <label className="notification-toggle">
              <span>{settings.enabled ? 'Notifications on' : 'Notifications off'}</span>
              <input
                type="checkbox"
                checked={settings.enabled}
                disabled={saving}
                onChange={(event) => void updateSetting({ ...settings, enabled: event.target.checked })}
              />
            </label>
            <label className="notification-toggle">
              <span>Squad alerts</span>
              <input
                type="checkbox"
                checked={settings.squadAlerts}
                disabled={saving || !settings.enabled}
                onChange={(event) => void updateSetting({ ...settings, squadAlerts: event.target.checked })}
              />
            </label>
            <label className="notification-toggle">
              <span>Motivation alerts</span>
              <input
                type="checkbox"
                checked={settings.motivationAlerts}
                disabled={saving || !settings.enabled}
                onChange={(event) => void updateSetting({ ...settings, motivationAlerts: event.target.checked })}
              />
            </label>
            {status ? <p className="notification-status">{status}</p> : null}
          </div>

          <div className="notification-list">
            {notifications.length ? notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              >
                <Circle size={9} className="notification-dot" />
                <button
                  type="button"
                  className="notification-item-main"
                  onClick={() => {
                    void markRead(notification.id, true)
                    if (notification.actionUrl) {
                      setOpen(false)
                      navigate(notification.actionUrl)
                    }
                  }}
                >
                  <strong>{notification.title}</strong>
                  <small>{notification.body}</small>
                  <em>{formatTime(notification.createdAt)}</em>
                </button>
                <button
                  type="button"
                  className="notification-read-toggle"
                  title={notification.read ? 'Mark unread' : 'Mark read'}
                  onClick={(event) => {
                    event.stopPropagation()
                    void markRead(notification.id, !notification.read)
                  }}
                >
                  {notification.read ? <BellOff size={14} /> : <CheckCheck size={14} />}
                </button>
              </div>
            )) : (
              <div className="notification-empty">
                <Bell size={18} />
                <span>No notifications yet</span>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
