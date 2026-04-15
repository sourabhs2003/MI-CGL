import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCZMfIl46ea7C_1U_8XEmjpeImg4-so9tk',
  authDomain: 'sourabhzssc.firebaseapp.com',
  projectId: 'sourabhzssc',
  storageBucket: 'sourabhzssc.firebasestorage.app',
  messagingSenderId: '31742915782',
  appId: '1:31742915782:web:29fa2b94b6d146aea6d3c7',
}

let app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp {
  if (app) return app
  if (getApps().length) {
    app = getApps()[0]!
    return app
  }
  app = initializeApp(firebaseConfig)
  return app
}

export function getDb() {
  return getFirestore(getFirebaseApp())
}
