const admin = require('firebase-admin')
const { logger } = require('firebase-functions')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')

admin.initializeApp()

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
])
const APP_BASE_URL = (process.env.APP_BASE_URL || 'https://sourabhzssc.web.app').replace(/\/$/, '')

function asText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizePath(value) {
  const path = asText(value, '/')
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return path.startsWith('/') ? path : `/${path}`
}

function toAbsoluteUrl(value) {
  const path = normalizePath(value)
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${APP_BASE_URL}${path}`
}

async function loadRecipientTokens(db, recipientId) {
  const tokenSnap = await db
    .collection('users')
    .doc(recipientId)
    .collection('deviceTokens')
    .where('enabled', '==', true)
    .get()

  const rows = tokenSnap.docs
    .map((doc) => ({ id: doc.id, ref: doc.ref, token: asText(doc.data().token) }))
    .filter((row) => row.token)

  if (rows.length) return rows

  const userSnap = await db.collection('users').doc(recipientId).get()
  const fcmTokens = userSnap.data()?.fcmTokens || {}
  return Object.entries(fcmTokens)
    .map(([id, value]) => ({
      id,
      ref: db.collection('users').doc(recipientId).collection('deviceTokens').doc(id),
      token: asText(value?.token),
    }))
    .filter((row) => row.token && valueEnabled(fcmTokens[row.id]))
}

function valueEnabled(value) {
  return value?.enabled !== false
}

exports.sendNotificationOutbox = onDocumentCreated('notificationOutbox/{notificationId}', async (event) => {
  const snap = event.data
  if (!snap) return

  const db = admin.firestore()
  const data = snap.data() || {}
  const recipientId = asText(data.recipientId)
  const title = asText(data.title, 'MI CGL')
  const body = asText(data.body)
  const actionUrl = normalizePath(data.actionUrl)
  const linkUrl = toAbsoluteUrl(actionUrl)

  if (!recipientId) {
    await snap.ref.set({
      status: 'failed',
      error: 'Missing recipientId',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
    return
  }

  const tokens = await loadRecipientTokens(db, recipientId)
  if (!tokens.length) {
    await snap.ref.set({
      status: 'no_tokens',
      sentCount: 0,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })
    return
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens: tokens.map((row) => row.token),
    notification: { title, body },
    data: {
      actionUrl,
      notificationId: snap.id,
      recipientId,
    },
    webpush: {
      notification: {
        icon: '/icon.png',
        badge: '/icon.png',
      },
      fcmOptions: {
        link: linkUrl,
      },
    },
  })

  const cleanupBatch = db.batch()
  response.responses.forEach((item, index) => {
    const tokenRow = tokens[index]
    if (!item.success && tokenRow && INVALID_TOKEN_CODES.has(item.error?.code)) {
      cleanupBatch.set(tokenRow.ref, {
        enabled: false,
        disabledAt: admin.firestore.FieldValue.serverTimestamp(),
        error: item.error.code,
      }, { merge: true })
    }
  })
  await cleanupBatch.commit()

  const firstError = response.responses.find((item) => !item.success)?.error
  await snap.ref.set({
    status: response.failureCount === tokens.length ? 'failed' : 'sent',
    sentCount: response.successCount,
    failedCount: response.failureCount,
    error: firstError ? `${firstError.code}: ${firstError.message}` : null,
    processedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true })

  logger.info('Notification outbox processed', {
    notificationId: snap.id,
    recipientId,
    sentCount: response.successCount,
    failedCount: response.failureCount,
  })
})
