/** Email/password sign-in; maps Firebase errors to user-facing copy (generic failures avoid account probing). */
import {
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { useState, type ComponentProps } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAuthErrorCode } from './authErrorUtils'
import FirebaseWebConfigMissing from './FirebaseWebConfigMissing'
import { auth } from './firebase'
import { signInWithOAuthPopupEarlyCancel } from './providerOAuthPopup'

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0]

function isValidEmail(value: string): boolean {
  const t = value.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

function authFieldClassName(errored: boolean): string {
  return [
    'mt-1 w-full border bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1',
    errored
      ? 'border-red-600 focus:border-red-700 focus:ring-red-700'
      : 'border-stone-300 focus:border-stone-800 focus:ring-stone-800',
  ].join(' ')
}

/**
 * Firebase codes treated as “wrong email or password”: same banner and both fields highlighted.
 * Keeps unknown-email vs wrong-password indistinguishable in the UI.
 */
const GENERIC_CREDENTIAL_CODES = new Set([
  'auth/invalid-credential',
  'auth/invalid-login-credentials',
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/user-deleted',
  'auth/invalid-email',
  'auth/missing-email',
  'auth/missing-password',
])

function mapSignInError(code: string): string {
  if (GENERIC_CREDENTIAL_CODES.has(code)) {
    return 'Invalid email or password.'
  }
  switch (code) {
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this project.'
    default:
      return 'Could not sign in. Try again.'
  }
}

function mapProviderSignInError(code: string): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled.'
    case 'auth/cancelled-popup-request':
      return 'Another sign-in attempt is already in progress.'
    case 'auth/popup-blocked':
      return 'Popup blocked by browser. Allow popups and try again.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method.'
    case 'auth/operation-not-allowed':
      return 'This sign-in provider is not enabled for this project.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.'
    default:
      return 'Could not sign in with that provider. Try again.'
  }
}

function providerButtonClassName(): string {
  return [
    'h-11 w-11 rounded-full border border-stone-300 bg-white p-2',
    'hover:border-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-800',
    'disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200',
  ].join(' ')
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [providerSubmitting, setProviderSubmitting] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const [passwordResetFeedback, setPasswordResetFeedback] = useState<string | null>(null)
  const [passwordResetFeedbackIsError, setPasswordResetFeedbackIsError] = useState(false)

  if (!auth) {
    return <FirebaseWebConfigMissing heading="Sign in" />
  }

  const firebaseAuth = auth

  const credentialMisfire = Boolean(authErrorCode && GENERIC_CREDENTIAL_CODES.has(authErrorCode))
  const emailFieldErrored = Boolean(error && credentialMisfire) || passwordResetFeedbackIsError
  const passwordFieldErrored = Boolean(error && credentialMisfire)

  function clearSubmitErrors() {
    setError(null)
    setAuthErrorCode(null)
  }

  function navigateAfterAuth() {
    navigate('/notes', { replace: true })
  }

  async function handleProviderSignIn(provider: GoogleAuthProvider | OAuthProvider) {
    clearSubmitErrors()
    setProviderSubmitting(true)
    let earlyNotified = false
    try {
      const userCredential = await signInWithOAuthPopupEarlyCancel(firebaseAuth, provider, {
        onEarlyCancel: () => {
          earlyNotified = true
          setAuthErrorCode('auth/popup-closed-by-user')
          setError(mapProviderSignInError('auth/popup-closed-by-user'))
          setProviderSubmitting(false)
        },
      })
      if (!userCredential.user) return
      clearSubmitErrors()
      navigateAfterAuth()
    } catch (error: unknown) {
      const code = getAuthErrorCode(error)
      if (earlyNotified && code === 'auth/popup-closed-by-user') return
      setAuthErrorCode(code || null)
      setError(mapProviderSignInError(code))
    } finally {
      if (!earlyNotified) setProviderSubmitting(false)
    }
  }

  function handlePasswordReset() {
    const trimmedEmail = email.trim()
    if (!isValidEmail(trimmedEmail)) {
      setPasswordResetFeedback('Enter a valid email above to reset your password.')
      setPasswordResetFeedbackIsError(true)
      return
    }

    setPasswordResetFeedback(null)
    setPasswordResetFeedbackIsError(false)
    setResettingPassword(true)
    sendPasswordResetEmail(firebaseAuth, trimmedEmail)
      .then(() => {
        setPasswordResetFeedback('If an account exists for that email, a reset link has been sent.')
        setPasswordResetFeedbackIsError(false)
      })
      .catch(() => {
        setPasswordResetFeedback('Could not send reset email right now. Try again.')
        setPasswordResetFeedbackIsError(true)
      })
      .finally(() => {
        setResettingPassword(false)
      })
  }

  function handleSubmit(e: FormSubmitEvent) {
    e.preventDefault()
    setError(null)
    setAuthErrorCode(null)
    setSubmitting(true)

    signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
      .then((userCredential) => {
        const user = userCredential.user
        if (!user) return
        navigateAfterAuth()
      })
      .catch((error: unknown) => {
        const code = getAuthErrorCode(error)
        setAuthErrorCode(code || null)
        setError(mapSignInError(code))
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <Link
            to="/"
            className="inline-block text-lg font-bold text-stone-800 tracking-[0.2em] uppercase hover:text-stone-600 transition-colors"
          >
            Writ
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto px-6 py-12 w-full">
        <h1 className="text-sm font-medium text-stone-800 tracking-wide uppercase">Sign in</h1>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">Sign in with email and password.</p>

        {/* noValidate: rely on Firebase errors so wrong-email vs wrong-password messaging stays unified. */}
        <form noValidate onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-medium text-stone-500 uppercase tracking-wide">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearSubmitErrors()
                setPasswordResetFeedback(null)
                setPasswordResetFeedbackIsError(false)
              }}
              aria-invalid={emailFieldErrored}
              className={authFieldClassName(emailFieldErrored)}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-stone-500 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  clearSubmitErrors()
                }}
                aria-invalid={passwordFieldErrored}
                className={`${authFieldClassName(passwordFieldErrored)} pr-20`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-stone-800"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting || providerSubmitting}
              className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                         hover:bg-stone-800 hover:text-white hover:border-stone-800
                         transition-all duration-200 tracking-wide disabled:opacity-50"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            <Link to="/signup" className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800">
              Create an account
            </Link>
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={resettingPassword}
              className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800 disabled:opacity-50"
            >
              {resettingPassword ? 'Sending reset…' : 'Forgot password?'}
            </button>
          </div>
          {passwordResetFeedback ? (
            <p className={passwordResetFeedbackIsError ? 'text-sm text-red-700' : 'text-sm text-stone-600'}>
              {passwordResetFeedback}
            </p>
          ) : null}
        </form>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-wide text-stone-400">or continue with</p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={providerSubmitting || submitting}
              onClick={() => handleProviderSignIn(new GoogleAuthProvider())}
              className={providerButtonClassName()}
              aria-label="Continue with Google"
              title="Continue with Google"
            >
              <img src="/google_logo.svg" alt="" className="h-full w-full object-contain" />
            </button>
            <button
              type="button"
              disabled={providerSubmitting || submitting}
              onClick={() => handleProviderSignIn(new OAuthProvider('microsoft.com'))}
              className={providerButtonClassName()}
              aria-label="Continue with Microsoft"
              title="Continue with Microsoft"
            >
              <img src="/ms_logo.svg" alt="" className="h-full w-full object-contain" />
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
