/**
 * Firebase often resolves `signInWithPopup` only after extra work once the OAuth popup closes,
 * so "cancelled" feedback feels late. When the opener loses focus (popup opens) and regains it
 * while auth is still pending, we treat that as the user leaving the flow and surface the same
 * messaging early (with a short delay so successful sign-in can win the race).
 */
import type { Auth, AuthProvider, UserCredential } from 'firebase/auth'
import { signInWithPopup } from 'firebase/auth'

/** Long enough for Firebase to finish token exchange after the popup closes (shorter values false-trigger on success). */
const DEFAULT_DELAY_MS = 520

export async function signInWithOAuthPopupEarlyCancel(
  auth: Auth,
  provider: AuthProvider,
  options: {
    onEarlyCancel: () => void
    /** Ms after focus returns before assuming cancel (successful flows usually settle faster). */
    delayMs?: number
  },
): Promise<UserCredential> {
  let settled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let sawBlur = false

  const clearTimer = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
  }

  const cleanup = () => {
    window.removeEventListener('blur', onBlur, true)
    window.removeEventListener('focus', onFocus, true)
    clearTimer()
  }

  const onBlur = () => {
    sawBlur = true
  }

  const onFocus = () => {
    if (!sawBlur || settled) return
    clearTimer()
    const delay = options.delayMs ?? DEFAULT_DELAY_MS
    timer = setTimeout(() => {
      if (settled) return
      options.onEarlyCancel()
    }, delay)
  }

  window.addEventListener('blur', onBlur, true)
  window.addEventListener('focus', onFocus, true)

  const promise = signInWithPopup(auth, provider)

  promise.finally(() => {
    settled = true
    cleanup()
  })

  return promise
}
