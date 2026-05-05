/** Registration form with client-side password rules stricter than Firebase’s minimum length. */
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAuthErrorCode } from './authErrorUtils'
import { auth } from './firebase'
import {
  allSignUpPasswordRequirementsMet,
  hasDigitUppercaseOrSymbol,
  meetsMinLength,
  MIN_PASSWORD_LENGTH,
  passwordsMatch,
} from './passwordPolicy'

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0]

function isValidEmail(value: string): boolean {
  const t = value.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email is already registered.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/weak-password':
      return 'Password did not meet security requirements. Adjust and try again.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this project.'
    default:
      return 'Could not create account. Try again.'
  }
}

function authFieldClassName(errored: boolean): string {
  return [
    'mt-1 w-full border bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1',
    errored
      ? 'border-red-600 focus:border-red-700 focus:ring-red-700'
      : 'border-stone-300 focus:border-stone-800 focus:ring-stone-800',
  ].join(' ')
}

function RequirementRow({ children, ok }: { children: ReactNode; ok: boolean }) {
  return (
    <li className="flex items-start gap-2">
      <span className={ok ? 'text-green-600' : 'text-stone-300'} aria-hidden>
        {ok ? '✓' : '○'}
      </span>
      <span className={ok ? 'text-stone-700' : 'text-stone-500'}>{children}</span>
    </li>
  )
}

export default function SignUp() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  /** Once the email field blurs with invalid input, keep showing the format error until the next focus (reset on focus). */
  const [emailBlurredSinceFocus, setEmailBlurredSinceFocus] = useState(false)

  const showEmailFormatError =
    emailBlurredSinceFocus && email.trim().length > 0 && !isValidEmail(email)

  const requirementsError = error === 'Please meet all password requirements below.'
  const emailFirebaseError =
    authErrorCode === 'auth/invalid-email' || authErrorCode === 'auth/email-already-in-use'
  const emailFieldErrored = showEmailFormatError || emailFirebaseError
  const passwordFieldErrored = requirementsError || authErrorCode === 'auth/weak-password'

  function clearSubmitErrors() {
    setError(null)
    setAuthErrorCode(null)
  }

  function handleSubmit(e: FormSubmitEvent) {
    e.preventDefault()
    setError(null)
    setAuthErrorCode(null)

    if (!isValidEmail(email.trim())) {
      setEmailBlurredSinceFocus(true)
      return
    }

    if (!allSignUpPasswordRequirementsMet(password, confirmPassword)) {
      setError('Please meet all password requirements below.')
      return
    }

    setSubmitting(true)

    createUserWithEmailAndPassword(auth, email.trim(), password)
      .then((userCredential) => {
        const user = userCredential.user
        if (user) {
          navigate('/notes', { replace: true, state: { accountCreated: true } })
        }
      })
      .catch((error: unknown) => {
        const code = getAuthErrorCode(error)
        setAuthErrorCode(code || null)
        setError(mapAuthError(code))
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  const canSubmit =
    isValidEmail(email.trim()) && allSignUpPasswordRequirementsMet(password, confirmPassword)

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
        <h1 className="text-sm font-medium text-stone-800 tracking-wide uppercase">Sign up</h1>
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">
          Create an account with email and password (Firebase Authentication).
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="signup-email" className="block text-xs font-medium text-stone-500 uppercase tracking-wide">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  clearSubmitErrors()
                }}
                onFocus={() => setEmailBlurredSinceFocus(false)}
                onBlur={() => setEmailBlurredSinceFocus(true)}
                aria-invalid={emailFieldErrored}
                aria-describedby={showEmailFormatError ? 'signup-email-error' : undefined}
                className={authFieldClassName(emailFieldErrored)}
              />
              {showEmailFormatError ? (
                <p id="signup-email-error" className="mt-1.5 text-sm text-red-700" role="alert">
                  Enter a valid email address.
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-xs font-medium text-stone-500 uppercase tracking-wide">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
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
            <div>
              <label htmlFor="signup-password-confirm" className="block text-xs font-medium text-stone-500 uppercase tracking-wide">
                Confirm password
              </label>
              <input
                id="signup-password-confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  clearSubmitErrors()
                }}
                aria-invalid={passwordFieldErrored}
                className={authFieldClassName(passwordFieldErrored)}
              />
            </div>

            <div className="border border-stone-200 bg-white px-3 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-stone-500">Password requirements</p>
              <ul className="mt-2 space-y-1.5 list-none pl-0" aria-live="polite">
                <RequirementRow ok={meetsMinLength(password)}>
                  At least {MIN_PASSWORD_LENGTH} characters
                </RequirementRow>
                <RequirementRow ok={hasDigitUppercaseOrSymbol(password)}>
                  Includes at least one number (0–9), uppercase letter (A–Z), or symbol (! &quot; # $ % … )
                </RequirementRow>
                <RequirementRow ok={passwordsMatch(password, confirmPassword)}>Passwords match</RequirementRow>
              </ul>
            </div>

            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                           hover:bg-stone-800 hover:text-white hover:border-stone-800
                           transition-all duration-200 tracking-wide disabled:opacity-50"
              >
                {submitting ? 'Creating…' : 'Create account'}
              </button>
              <Link to="/login" className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800">
                Already have an account?
              </Link>
            </div>
          </form>
      </main>
    </div>
  )
}
