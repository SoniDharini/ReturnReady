import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import type { UserRole } from '@/types'
import { roleHome } from '@/lib/paths'

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted text-sm text-ink-secondary">
      Loading...
    </div>
  )
}

export function RequireAuth() {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) return <AuthLoading />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export function RequireOwner() {
  const { user, isBootstrapping } = useAuth()

  if (isBootstrapping) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'OWNER') return <Navigate to={roleHome(user.role)} replace />

  return <Outlet />
}

export function RequireTenant() {
  const { user, isBootstrapping } = useAuth()

  if (isBootstrapping) return <AuthLoading />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'TENANT') return <Navigate to={roleHome(user.role)} replace />

  if (user.tenantAccess?.status === 'CLOSED' || user.tenantAccess?.status === 'REVOKED') {
    const q = new URLSearchParams({
      property: user.tenantAccess.propertyName,
      tenancyId: user.tenantAccess.tenancyId,
    })
    return <Navigate to={`/access-closed?${q.toString()}`} replace />
  }

  if (user.tenantAccess?.status !== 'ACTIVE') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function RoleRedirect({ role }: { role: UserRole }) {
  return <Navigate to={roleHome(role)} replace />
}
