/** Firebase Web SDK bootstrap: single default app + Auth instance for email/password flows. */
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

/**
 * `getAuth()` throws immediately when apiKey is empty (browser build). Omitting Firebase env would crash the SPA before
 * React mounts — so we skip Auth until a non-empty web API key is present.
 */
function createFirebaseAuth(): Auth | null {
   const apiKey = String(import.meta.env.VITE_FIREBASE_API_KEY ?? '').trim()
   if (!apiKey) return null

   const firebaseConfig = {
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
   }

   const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
   return getAuth(app)
}

export const auth: Auth | null = createFirebaseAuth()
