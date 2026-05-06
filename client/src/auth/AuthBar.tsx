/** Compact header auth UI: sign out when signed in; links to login/sign up otherwise. */
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function AuthBar() {
  const navigate = useNavigate()
  const { user, loading, signOutUser } = useAuth()

  if (loading) {
    return <span className="text-xs text-stone-400">…</span>
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link to="/profile" className="text-xs text-stone-500 underline underline-offset-2 hover:text-stone-800">
          Profile
        </Link>
        <button
          type="button"
          onClick={() => {
            void signOutUser().then(() => navigate('/', { replace: true }))
          }}
          className="text-xs font-medium text-stone-500 border border-stone-300 px-4 py-2
                     hover:bg-stone-800 hover:text-white hover:border-stone-800
                     transition-all duration-200 tracking-wide"
        >
          Sign out
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <Link to="/login" className="text-stone-500 hover:text-stone-800">
        Sign in
      </Link>
      <Link
        to="/signup"
        className="text-stone-500 underline underline-offset-2 hover:text-stone-800"
      >
        Sign up
      </Link>
    </div>
  )
}
