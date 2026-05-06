import {
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  linkWithCredential,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from 'firebase/auth'
import type { User } from 'firebase/auth'
import { useState, type ComponentProps } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAuthErrorCode } from './authErrorUtils'
import { useAuth } from './AuthContext'
import { MIN_PASSWORD_LENGTH, hasDigitUppercaseOrSymbol, meetsMinLength, passwordsMatch } from './passwordPolicy'

type FormSubmitEvent = Parameters<NonNullable<ComponentProps<'form'>['onSubmit']>>[0]

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
/** Same collection path as notes SPA (`NotesApp`). */
const NOTES_API = '/api/notes'

function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

/** Deletes every note for this Firebase user on the API before Auth account deletion. */
async function purgeAllNotesOnServer(user: User): Promise<void> {
  const token = await user.getIdToken()
  const res = await fetch(apiUrl(NOTES_API), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    let msg = 'Could not delete your notes from the server. Try again.'
    try {
      const data: unknown = await res.json()
      if (
        data &&
        typeof data === 'object' &&
        'error' in data &&
        typeof (data as { error: unknown }).error === 'string'
      ) {
        msg = (data as { error: string }).error
      }
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
}

function isValidEmail(value: string): boolean {
  const t = value.trim()
  if (!t) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

function fieldClassName(errored: boolean): string {
  return [
    'mt-1 w-full border bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1',
    errored
      ? 'border-red-600 focus:border-red-700 focus:ring-red-700'
      : 'border-stone-300 focus:border-stone-800 focus:ring-stone-800',
  ].join(' ')
}

function passwordRevealToggleClassName(): string {
  return 'absolute right-2 top-1/2 -translate-y-1/2 text-xs text-stone-500 hover:text-stone-800'
}

function mapSensitiveUpdateError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'Current password is incorrect.'
    case 'auth/requires-recent-login':
      return 'Please sign in again before making this change.'
    case 'auth/email-already-in-use':
      return 'That email address is already in use.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/weak-password':
      return 'Password does not meet security requirements.'
    case 'auth/popup-closed-by-user':
      return 'Re-authentication was cancelled.'
    case 'auth/provider-already-linked':
      return 'Password sign-in is already enabled on this account.'
    case 'auth/operation-not-allowed':
      return 'Email change is not enabled in Firebase Auth settings.'
    default:
      return 'Could not save this change. Try again.'
  }
}

async function reauthenticateUser(user: NonNullable<ReturnType<typeof useAuth>['user']>, currentPassword: string) {
  const hasPasswordProvider = user.providerData.some((p) => p.providerId === 'password')
  if (hasPasswordProvider) {
    if (!user.email) {
      throw new Error('This account is missing an email address.')
    }
    if (!currentPassword) {
      throw new Error('Enter your current password to continue.')
    }
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    await reauthenticateWithCredential(user, credential)
    return
  }

  const providerId = user.providerData.find((p) => p.providerId !== 'firebase')?.providerId
  if (providerId === 'google.com') {
    await reauthenticateWithPopup(user, new GoogleAuthProvider())
    return
  }
  if (providerId === 'microsoft.com') {
    await reauthenticateWithPopup(user, new OAuthProvider('microsoft.com'))
    return
  }
  throw new Error('Please sign in again and retry this change.')
}

function splitDisplayName(displayName: string | null): { firstName: string; lastName: string } {
  const value = (displayName ?? '').trim()
  if (!value) return { firstName: '', lastName: '' }
  const parts = value.split(/\s+/)
  const [firstName, ...rest] = parts
  return {
    firstName: firstName ?? '',
    lastName: rest.join(' '),
  }
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOutUser } = useAuth()
  const [firstName, setFirstName] = useState(() => splitDisplayName(user?.displayName ?? null).firstName)
  const [lastName, setLastName] = useState(() => splitDisplayName(user?.displayName ?? null).lastName)
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('')
  const [nextEmail, setNextEmail] = useState(user?.email ?? '')
  const [currentPasswordForPassword, setCurrentPasswordForPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [nameMessage, setNameMessage] = useState<string | null>(null)
  const [emailMessage, setEmailMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordLinked, setPasswordLinked] = useState(false)
  /** Email address awaiting user confirmation in the dialog (normalized trim at submit time). */
  const [emailConfirmPending, setEmailConfirmPending] = useState<string | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [showEmailCurrentPassword, setShowEmailCurrentPassword] = useState(false)
  const [showChangePasswordCurrent, setShowChangePasswordCurrent] = useState(false)
  const [showChangePasswordNew, setShowChangePasswordNew] = useState(false)
  const [showChangePasswordConfirm, setShowChangePasswordConfirm] = useState(false)
  const [showAddPasswordNew, setShowAddPasswordNew] = useState(false)
  const [showAddPasswordConfirm, setShowAddPasswordConfirm] = useState(false)
  const [showDeletePassword, setShowDeletePassword] = useState(false)

  if (!user) return null
  const currentUser = user

  const hasPasswordProvider = passwordLinked || currentUser.providerData.some((p) => p.providerId === 'password')
  const passwordRulesMet = meetsMinLength(newPassword) && hasDigitUppercaseOrSymbol(newPassword)
  const passwordsAreMatching = passwordsMatch(newPassword, confirmPassword)

  async function handleNameSubmit(e: FormSubmitEvent) {
    e.preventDefault()
    setNameError(null)
    setNameMessage(null)
    setSavingName(true)
    try {
      const trimmedFirstName = firstName.trim()
      const trimmedLastName = lastName.trim()
      if (!trimmedFirstName || !trimmedLastName) {
        setNameError('First and last name are required.')
        return
      }
      const trimmedDisplayName = `${trimmedFirstName} ${trimmedLastName}`
      await updateProfile(currentUser, { displayName: trimmedDisplayName })
      setNameMessage('Name updated.')
    } catch {
      setNameError('Could not update your name right now.')
    } finally {
      setSavingName(false)
    }
  }

  function handleEmailSubmit(e: FormSubmitEvent) {
    e.preventDefault()
    setEmailError(null)
    setEmailMessage(null)
    const trimmedEmail = nextEmail.trim()
    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Enter a valid email address.')
      return
    }
    const currentNormalized = (currentUser.email ?? '').trim().toLowerCase()
    if (trimmedEmail.toLowerCase() === currentNormalized) {
      setEmailError('This is already your account email. Enter a different address to change it.')
      return
    }
    setEmailConfirmPending(trimmedEmail)
  }

  async function confirmEmailChange() {
    const trimmedEmail = emailConfirmPending
    if (!trimmedEmail) return
    setEmailError(null)
    setEmailMessage(null)
    setSavingEmail(true)
    try {
      await reauthenticateUser(currentUser, currentPasswordForEmail)
      await verifyBeforeUpdateEmail(currentUser, trimmedEmail)
      setCurrentPasswordForEmail('')
      setNextEmail(trimmedEmail)
      setEmailConfirmPending(null)
      setEmailMessage('Verification sent. Confirm the link in your new inbox to finish changing your email.')
    } catch (error: unknown) {
      setEmailConfirmPending(null)
      if (error instanceof Error && error.message.startsWith('Enter your current password')) {
        setEmailError(error.message)
      } else if (error instanceof Error && error.message.startsWith('Please sign in again')) {
        setEmailError(error.message)
      } else {
        setEmailError(mapSensitiveUpdateError(getAuthErrorCode(error)))
      }
    } finally {
      setSavingEmail(false)
    }
  }

  async function handlePasswordSubmit(e: FormSubmitEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)
    setSavingPassword(true)
    try {
      if (!passwordRulesMet) {
        setPasswordError(
          `New password must be at least ${MIN_PASSWORD_LENGTH} characters and include a number, uppercase letter, or symbol.`,
        )
        return
      }
      if (!passwordsAreMatching) {
        setPasswordError('New passwords do not match.')
        return
      }
      await reauthenticateUser(currentUser, currentPasswordForPassword)
      await updatePassword(currentUser, newPassword)
      setCurrentPasswordForPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage('Password updated.')
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith('Enter your current password')) {
        setPasswordError(error.message)
      } else if (error instanceof Error && error.message.startsWith('Please sign in again')) {
        setPasswordError(error.message)
      } else {
        setPasswordError(mapSensitiveUpdateError(getAuthErrorCode(error)))
      }
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleAddPasswordSubmit(e: FormSubmitEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordMessage(null)
    setSavingPassword(true)
    try {
      if (!currentUser.email) {
        setPasswordError('This account does not have an email address to attach password sign-in to.')
        return
      }
      if (!passwordRulesMet) {
        setPasswordError(
          `New password must be at least ${MIN_PASSWORD_LENGTH} characters and include a number, uppercase letter, or symbol.`,
        )
        return
      }
      if (!passwordsAreMatching) {
        setPasswordError('New passwords do not match.')
        return
      }
      await reauthenticateUser(currentUser, '')
      await linkWithCredential(currentUser, EmailAuthProvider.credential(currentUser.email, newPassword))
      await currentUser.reload()
      setPasswordLinked(true)
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage('Password added. You can now sign in with email and password.')
    } catch (error: unknown) {
      if (error instanceof Error && error.message.startsWith('Please sign in again')) {
        setPasswordError(error.message)
      } else {
        setPasswordError(mapSensitiveUpdateError(getAuthErrorCode(error)))
      }
    } finally {
      setSavingPassword(false)
    }
  }

  function requestDeleteAccount() {
    setDeleteError(null)
    if (hasPasswordProvider) {
      if (!deletePassword) {
        setDeleteError('Enter your password to confirm account deletion.')
        return
      }
    }
    setDeleteModalOpen(true)
  }

  async function executeDeleteAccount() {
    setDeletingAccount(true)
    setDeleteError(null)
    try {
      await reauthenticateUser(currentUser, deletePassword)
      await purgeAllNotesOnServer(currentUser)
      await deleteUser(currentUser)
      await signOutUser()
      navigate('/', { replace: true })
    } catch (error: unknown) {
      setDeleteModalOpen(false)
      if (error instanceof Error && error.message.startsWith('Enter your current password')) {
        setDeleteError(error.message)
      } else if (error instanceof Error && error.message.startsWith('Please sign in again')) {
        setDeleteError(error.message)
      } else if (getAuthErrorCode(error)) {
        setDeleteError(mapSensitiveUpdateError(getAuthErrorCode(error)))
      } else if (error instanceof Error && error.message) {
        setDeleteError(error.message)
      } else {
        setDeleteError('Could not delete account. Try again.')
      }
    } finally {
      setDeletingAccount(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {emailConfirmPending ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/35 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (!savingEmail) setEmailConfirmPending(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-email-title"
            className="w-full max-w-sm border border-stone-200 bg-white px-6 py-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-email-title" className="text-sm font-medium text-stone-800 tracking-wide uppercase">
              Change email address?
            </h2>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              We will send a verification link to{' '}
              <span className="font-medium text-stone-800 break-all">{emailConfirmPending}</span>. Your sign-in email
              updates only after that link is confirmed.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={savingEmail}
                onClick={() => setEmailConfirmPending(null)}
                className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                           hover:bg-stone-100 transition-all duration-200 tracking-wide
                           disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingEmail}
                onClick={() => {
                  void confirmEmailChange()
                }}
                className="text-xs font-medium text-white bg-stone-800 border border-stone-800 px-4 py-2
                           hover:bg-stone-950 hover:border-stone-950 transition-all duration-200 tracking-wide
                           disabled:opacity-50"
              >
                {savingEmail ? 'Updating…' : 'Yes, change email'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-stone-900/35 backdrop-blur-[2px]"
          role="presentation"
          onClick={() => {
            if (!deletingAccount) setDeleteModalOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            className="w-full max-w-sm border border-red-200 bg-white px-6 py-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-account-title" className="text-sm font-medium text-red-900 tracking-wide uppercase">
              Delete account?
            </h2>
            <p className="mt-3 text-sm text-stone-600 leading-relaxed">
              All notes saved on our servers for this account will be removed, then your Firebase account for{' '}
              <span className="font-medium text-stone-800 break-all">{currentUser.email ?? 'this account'}</span> will be
              deleted. You will be signed out immediately. This cannot be undone from here.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => setDeleteModalOpen(false)}
                className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                           hover:bg-stone-100 transition-all duration-200 tracking-wide
                           disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => {
                  void executeDeleteAccount()
                }}
                className="text-xs font-medium text-white bg-red-700 border border-red-700 px-4 py-2
                           hover:bg-red-800 hover:border-red-800 transition-all duration-200 tracking-wide
                           disabled:opacity-50"
              >
                {deletingAccount ? 'Deleting…' : 'Yes, delete my account'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-block text-lg font-bold text-stone-800 tracking-[0.2em] uppercase hover:text-stone-600 transition-colors"
          >
            Writ
          </Link>
          <Link to="/notes" className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800">
            Back to notes
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-6 py-10 w-full space-y-8">
        <section className="border border-stone-200 bg-white p-5">
          <h1 className="text-sm font-medium text-stone-800 tracking-wide uppercase">Profile settings</h1>
          <p className="mt-2 text-sm text-stone-600">Manage your account details securely through Firebase Auth.</p>
        </section>

        <section className="border border-stone-200 bg-white p-5">
          <h2 className="text-xs font-medium text-stone-500 tracking-wide uppercase">Change name</h2>
          <form onSubmit={handleNameSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-first-name" className="block text-xs font-medium text-stone-500 uppercase tracking-wide">
                  First name
                </label>
                <input
                  id="profile-first-name"
                  type="text"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    setNameError(null)
                    setNameMessage(null)
                  }}
                  className={fieldClassName(Boolean(nameError))}
                />
              </div>
              <div>
                <label htmlFor="profile-last-name" className="block text-xs font-medium text-stone-500 uppercase tracking-wide">
                  Last name
                </label>
                <input
                  id="profile-last-name"
                  type="text"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    setNameError(null)
                    setNameMessage(null)
                  }}
                  className={fieldClassName(Boolean(nameError))}
                />
              </div>
            </div>
            {nameError ? <p className="text-sm text-red-700">{nameError}</p> : null}
            {nameMessage ? <p className="text-sm text-stone-600">{nameMessage}</p> : null}
            <button
              type="submit"
              disabled={savingName}
              className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                         hover:bg-stone-800 hover:text-white hover:border-stone-800
                         transition-all duration-200 tracking-wide disabled:opacity-50"
            >
              {savingName ? 'Saving…' : 'Save name'}
            </button>
          </form>
        </section>

        {hasPasswordProvider ? (
          <section className="border border-stone-200 bg-white p-5">
            <h2 className="text-xs font-medium text-stone-500 tracking-wide uppercase">Change email</h2>
            <p className="mt-2 text-sm text-stone-600">
              Sensitive updates require recent sign-in. For password users, enter your current password.
            </p>
            <form onSubmit={handleEmailSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor="profile-email" className="block text-xs font-medium text-stone-500 uppercase tracking-wide">
                  New email
                </label>
                <input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  value={nextEmail}
                  onChange={(e) => {
                    setNextEmail(e.target.value)
                    setEmailError(null)
                    setEmailMessage(null)
                  }}
                  className={fieldClassName(Boolean(emailError))}
                />
              </div>
              <div>
                <label
                  htmlFor="profile-email-current-password"
                  className="block text-xs font-medium text-stone-500 uppercase tracking-wide"
                >
                  Current password
                </label>
                <div className="relative">
                  <input
                    id="profile-email-current-password"
                    type={showEmailCurrentPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPasswordForEmail}
                    onChange={(e) => {
                      setCurrentPasswordForEmail(e.target.value)
                      setEmailError(null)
                      setEmailMessage(null)
                    }}
                    className={`${fieldClassName(Boolean(emailError))} pr-20`}
                  />
                  <button
                    type="button"
                    className={passwordRevealToggleClassName()}
                    aria-label={showEmailCurrentPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowEmailCurrentPassword((v) => !v)}
                  >
                    {showEmailCurrentPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {emailError ? <p className="text-sm text-red-700">{emailError}</p> : null}
              {emailMessage ? <p className="text-sm text-stone-600">{emailMessage}</p> : null}
              <button
                type="submit"
                disabled={savingEmail || Boolean(emailConfirmPending)}
                className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                           hover:bg-stone-800 hover:text-white hover:border-stone-800
                           transition-all duration-200 tracking-wide disabled:opacity-50"
              >
                {savingEmail ? 'Saving…' : 'Save email'}
              </button>
            </form>
          </section>
        ) : null}

        {hasPasswordProvider ? (
          <section className="border border-stone-200 bg-white p-5">
            <h2 className="text-xs font-medium text-stone-500 tracking-wide uppercase">Change password</h2>
            <p className="mt-2 text-sm text-stone-600">
              New password must be at least {MIN_PASSWORD_LENGTH} characters and include a number, uppercase letter, or symbol.
            </p>
            <form onSubmit={handlePasswordSubmit} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="profile-password-current"
                  className="block text-xs font-medium text-stone-500 uppercase tracking-wide"
                >
                  Current password
                </label>
                <div className="relative">
                  <input
                    id="profile-password-current"
                    type={showChangePasswordCurrent ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={currentPasswordForPassword}
                    onChange={(e) => {
                      setCurrentPasswordForPassword(e.target.value)
                      setPasswordError(null)
                      setPasswordMessage(null)
                    }}
                    className={`${fieldClassName(Boolean(passwordError))} pr-20`}
                  />
                  <button
                    type="button"
                    className={passwordRevealToggleClassName()}
                    aria-label={showChangePasswordCurrent ? 'Hide password' : 'Show password'}
                    onClick={() => setShowChangePasswordCurrent((v) => !v)}
                  >
                    {showChangePasswordCurrent ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="profile-password-new"
                  className="block text-xs font-medium text-stone-500 uppercase tracking-wide"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="profile-password-new"
                    type={showChangePasswordNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setPasswordError(null)
                      setPasswordMessage(null)
                    }}
                    className={`${fieldClassName(Boolean(passwordError))} pr-20`}
                  />
                  <button
                    type="button"
                    className={passwordRevealToggleClassName()}
                    aria-label={showChangePasswordNew ? 'Hide password' : 'Show password'}
                    onClick={() => setShowChangePasswordNew((v) => !v)}
                  >
                    {showChangePasswordNew ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="profile-password-confirm"
                  className="block text-xs font-medium text-stone-500 uppercase tracking-wide"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="profile-password-confirm"
                    type={showChangePasswordConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setPasswordError(null)
                      setPasswordMessage(null)
                    }}
                    className={`${fieldClassName(Boolean(passwordError))} pr-20`}
                  />
                  <button
                    type="button"
                    className={passwordRevealToggleClassName()}
                    aria-label={showChangePasswordConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowChangePasswordConfirm((v) => !v)}
                  >
                    {showChangePasswordConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {passwordError ? <p className="text-sm text-red-700">{passwordError}</p> : null}
              {passwordMessage ? <p className="text-sm text-stone-600">{passwordMessage}</p> : null}
              <button
                type="submit"
                disabled={savingPassword}
                className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                           hover:bg-stone-800 hover:text-white hover:border-stone-800
                           transition-all duration-200 tracking-wide disabled:opacity-50"
              >
                {savingPassword ? 'Saving…' : 'Save password'}
              </button>
            </form>
          </section>
        ) : (
          <section className="border border-stone-200 bg-white p-5">
            <h2 className="text-xs font-medium text-stone-500 tracking-wide uppercase">Add password</h2>
            <p className="mt-2 text-sm text-stone-600">
              This account uses a social provider. Add a password if you also want email/password sign-in.
            </p>
            <form onSubmit={handleAddPasswordSubmit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide">Account email</label>
                <input
                  type="email"
                  value={currentUser.email ?? ''}
                  readOnly
                  className="mt-1 w-full border border-stone-200 bg-stone-100 px-3 py-2 text-sm text-stone-600"
                />
              </div>
              <div>
                <label
                  htmlFor="profile-add-password-new"
                  className="block text-xs font-medium text-stone-500 uppercase tracking-wide"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="profile-add-password-new"
                    type={showAddPasswordNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setPasswordError(null)
                      setPasswordMessage(null)
                    }}
                    className={`${fieldClassName(Boolean(passwordError))} pr-20`}
                  />
                  <button
                    type="button"
                    className={passwordRevealToggleClassName()}
                    aria-label={showAddPasswordNew ? 'Hide password' : 'Show password'}
                    onClick={() => setShowAddPasswordNew((v) => !v)}
                  >
                    {showAddPasswordNew ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="profile-add-password-confirm"
                  className="block text-xs font-medium text-stone-500 uppercase tracking-wide"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="profile-add-password-confirm"
                    type={showAddPasswordConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setPasswordError(null)
                      setPasswordMessage(null)
                    }}
                    className={`${fieldClassName(Boolean(passwordError))} pr-20`}
                  />
                  <button
                    type="button"
                    className={passwordRevealToggleClassName()}
                    aria-label={showAddPasswordConfirm ? 'Hide confirm password' : 'Show confirm password'}
                    onClick={() => setShowAddPasswordConfirm((v) => !v)}
                  >
                    {showAddPasswordConfirm ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {passwordError ? <p className="text-sm text-red-700">{passwordError}</p> : null}
              {passwordMessage ? <p className="text-sm text-stone-600">{passwordMessage}</p> : null}
              <button
                type="submit"
                disabled={savingPassword}
                className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                           hover:bg-stone-800 hover:text-white hover:border-stone-800
                           transition-all duration-200 tracking-wide disabled:opacity-50"
              >
                {savingPassword ? 'Saving…' : 'Add password'}
              </button>
            </form>
          </section>
        )}

        <section className="border border-red-200 bg-red-50/40 p-5">
          <h2 className="text-xs font-medium text-red-900 tracking-wide uppercase">Delete account</h2>
          <p className="mt-2 text-sm text-stone-700 leading-relaxed">
            Permanently remove your account. You will be asked to confirm again after entering your password.
          </p>
          {hasPasswordProvider ? (
            <div className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="profile-delete-password"
                  className="block text-xs font-medium text-stone-500 uppercase tracking-wide"
                >
                  Confirm with your password
                </label>
                <div className="relative">
                  <input
                    id="profile-delete-password"
                    type={showDeletePassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value)
                      setDeleteError(null)
                    }}
                    className={`${fieldClassName(Boolean(deleteError))} pr-20`}
                  />
                  <button
                    type="button"
                    className={passwordRevealToggleClassName()}
                    aria-label={showDeletePassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowDeletePassword((v) => !v)}
                  >
                    {showDeletePassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              {deleteError ? <p className="text-sm text-red-700">{deleteError}</p> : null}
              <button
                type="button"
                disabled={deletingAccount || savingEmail || savingPassword || savingName || Boolean(emailConfirmPending)}
                onClick={requestDeleteAccount}
                className="text-xs font-medium text-white bg-red-700 border border-red-700 px-4 py-2
                           hover:bg-red-800 hover:border-red-800 transition-all duration-200 tracking-wide
                           disabled:opacity-50"
              >
                Delete account…
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-stone-600">
                This account uses a social sign-in. On confirm you will sign in with your provider one more time, then
                the account will be deleted.
              </p>
              {deleteError ? <p className="text-sm text-red-700">{deleteError}</p> : null}
              <button
                type="button"
                disabled={deletingAccount || savingEmail || savingPassword || savingName || Boolean(emailConfirmPending)}
                onClick={() => {
                  setDeleteError(null)
                  setDeleteModalOpen(true)
                }}
                className="text-xs font-medium text-white bg-red-700 border border-red-700 px-4 py-2
                           hover:bg-red-800 hover:border-red-800 transition-all duration-200 tracking-wide
                           disabled:opacity-50"
              >
                Delete account…
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
