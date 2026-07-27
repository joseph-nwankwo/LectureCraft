import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/app/providers/AuthProvider'
import { hasPermission, type UserRole } from '@/types/roles.types'
import { ROUTES } from '@/constants/routes'

interface RoleGuardProps {
  requiredRole: UserRole
  exact?: boolean
}

export function RoleGuard({ requiredRole, exact = false }: RoleGuardProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null

  const allowed = exact
    ? user?.role === requiredRole
    : !!(user && hasPermission(user.role, requiredRole))

  if (!allowed) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }

  return <Outlet />
}
