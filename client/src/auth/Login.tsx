/** Email/password sign-in; maps Firebase errors to user-facing copy (generic failures avoid account probing). */
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useState, type ComponentProps } from 'react'
import type { Location } from 'react-router-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getAuthErrorCode } from './authErrorUtils'
import { auth } from './firebase'

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0]

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

type LoginLocationState = {
  from?: Location
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const credentialMisfire = Boolean(authErrorCode && GENERIC_CREDENTIAL_CODES.has(authErrorCode))
  const emailFieldErrored = Boolean(error && credentialMisfire)
  const passwordFieldErrored = Boolean(error && credentialMisfire)

  function clearSubmitErrors() {
    setError(null)
    setAuthErrorCode(null)
  }

  function handleSubmit(e: FormSubmitEvent) {
    e.preventDefault()
    setError(null)
    setAuthErrorCode(null)
    setSubmitting(true)

    signInWithEmailAndPassword(auth, email.trim(), password)
      .then((userCredential) => {
        const user = userCredential.user
        if (!user) return
        const from = (location.state as LoginLocationState | null)?.from
        const to = from
          ? `${from.pathname}${from.search}${from.hash || ''}` || '/notes'
          : '/notes'
        navigate(to, { replace: true })
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
              }}
              aria-invalid={emailFieldErrored}
              className={authFieldClassName(emailFieldErrored)}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-xs font-medium text-stone-500 uppercase tracking-wide">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearSubmitErrors()
              }}
              aria-invalid={passwordFieldErrored}
              className={authFieldClassName(passwordFieldErrored)}
            />
          </div>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                         hover:bg-stone-800 hover:text-white hover:border-stone-800
                         transition-all duration-200 tracking-wide disabled:opacity-50"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
            <Link to="/signup" className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800">
              Create an account
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
