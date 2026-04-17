import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore'
import { getDb } from '../firebase'

/**
 * Reset all user progress data while preserving user identity.
 * This clears XP, study time, streak, mock data, tasks, and analytics.
 * Forces app reload after successful reset to prevent rehydration.
 */
export async function resetUserData(uid: string): Promise<void> {
  const db = getDb()

  try {
    console.log('[RESET] Starting user data reset for:', uid)

    // 1. Reset user profile (keep identity, reset progress)
    const userRef = doc(db, 'users', uid)
    await setDoc(
      userRef,
      {
        xp: 0,
        streak: 0,
        lastStudyDay: null,
      },
      { merge: true },
    )
    console.log('[RESET] User profile reset')

    // 2. Delete all personal tasks
    const tasksSnap = await getDocs(collection(db, `users/${uid}/tasks`))
    console.log('[RESET] Deleting', tasksSnap.size, 'tasks')
    for (const taskDoc of tasksSnap.docs) {
      await deleteDoc(doc(db, `users/${uid}/tasks`, taskDoc.id))
    }

    // 3. Delete all study sessions
    const sessionsSnap = await getDocs(collection(db, `users/${uid}/sessions`))
    console.log('[RESET] Deleting', sessionsSnap.size, 'sessions')
    for (const sessionDoc of sessionsSnap.docs) {
      await deleteDoc(doc(db, `users/${uid}/sessions`, sessionDoc.id))
    }

    // 4. Delete all daily stats
    const dailyStatsSnap = await getDocs(collection(db, `users/${uid}/dailyStats`))
    console.log('[RESET] Deleting', dailyStatsSnap.size, 'daily stats')
    for (const statDoc of dailyStatsSnap.docs) {
      await deleteDoc(doc(db, `users/${uid}/dailyStats`, statDoc.id))
    }

    // 5. Delete all mock results
    const mocksSnap = await getDocs(collection(db, `users/${uid}/mocks`))
    console.log('[RESET] Deleting', mocksSnap.size, 'mocks')
    for (const mockDoc of mocksSnap.docs) {
      await deleteDoc(doc(db, `users/${uid}/mocks`, mockDoc.id))
    }

    // 6. Clear offline queue (localStorage)
    localStorage.removeItem('study-session-queue')
    console.log('[RESET] Cleared offline queue')

    // 7. Force app reload to prevent rehydration from Firebase listeners
    console.log('[RESET] Reset complete, reloading app...')
    setTimeout(() => {
      window.location.reload()
    }, 500)

    // Note: We keep groupTasks as they are shared across users
    // We keep localStorage 'user' (session) and 'mi-cgl-identities' (identity cache)
  } catch (error) {
    console.error('[RESET] Failed to reset user data:', error)
    throw error
  }
}

/**
 * Reset all squad member data (for admin use).
 * This resets XP, hours, streak, and mock scores for all users.
 * Forces app reload after successful reset to prevent rehydration.
 */
export async function resetAllSquadData(): Promise<void> {
  const db = getDb()

  try {
    console.log('[RESET] Starting full squad reset')

    // Get all users
    const usersSnap = await getDocs(collection(db, 'users'))
    console.log('[RESET] Found', usersSnap.size, 'users to reset')

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id
      console.log('[RESET] Resetting user:', uid)

      // Reset user profile (keep identity)
      await setDoc(
        doc(db, 'users', uid),
        {
          xp: 0,
          streak: 0,
          lastStudyDay: null,
        },
        { merge: true },
      )

      // Delete all progress data
      const tasksSnap = await getDocs(collection(db, `users/${uid}/tasks`))
      console.log('[RESET] Deleting', tasksSnap.size, 'tasks for user', uid)
      for (const taskDoc of tasksSnap.docs) {
        await deleteDoc(doc(db, `users/${uid}/tasks`, taskDoc.id))
      }

      const sessionsSnap = await getDocs(collection(db, `users/${uid}/sessions`))
      console.log('[RESET] Deleting', sessionsSnap.size, 'sessions for user', uid)
      for (const sessionDoc of sessionsSnap.docs) {
        await deleteDoc(doc(db, `users/${uid}/sessions`, sessionDoc.id))
      }

      const dailyStatsSnap = await getDocs(collection(db, `users/${uid}/dailyStats`))
      console.log('[RESET] Deleting', dailyStatsSnap.size, 'daily stats for user', uid)
      for (const statDoc of dailyStatsSnap.docs) {
        await deleteDoc(doc(db, `users/${uid}/dailyStats`, statDoc.id))
      }

      const mocksSnap = await getDocs(collection(db, `users/${uid}/mocks`))
      console.log('[RESET] Deleting', mocksSnap.size, 'mocks for user', uid)
      for (const mockDoc of mocksSnap.docs) {
        await deleteDoc(doc(db, `users/${uid}/mocks`, mockDoc.id))
      }
    }

    // Clear offline queue
    localStorage.removeItem('study-session-queue')
    console.log('[RESET] Cleared offline queue')

    // Clear group tasks
    const groupTasksSnap = await getDocs(collection(db, 'groupTasks'))
    console.log('[RESET] Deleting', groupTasksSnap.size, 'group tasks')
    for (const groupTaskDoc of groupTasksSnap.docs) {
      await deleteDoc(doc(db, 'groupTasks', groupTaskDoc.id))
    }

    // Keep localStorage 'user' (session) and 'mi-cgl-identities' (identity cache)

    // Force app reload to prevent rehydration
    console.log('[RESET] Squad reset complete, reloading app...')
    setTimeout(() => {
      window.location.reload()
    }, 500)
  } catch (error) {
    console.error('[RESET] Failed to reset all squad data:', error)
    throw error
  }
}
