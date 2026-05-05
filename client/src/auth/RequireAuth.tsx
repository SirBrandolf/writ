/** Guards children until Firebase reports a user; sends anonymous visitors to /login with return location in state. */
import type { Location } from 'react-router-dom'
import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'

type RedirectState = {
  from?: Location
}

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-sm text-stone-500">
        Loading…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location } satisfies RedirectState} replace />
  }

  return <>{children}</>
}
