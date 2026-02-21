import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { UserRole, UserStatus } from '@/utils/constants'
interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

const ROLE_HOME_ROUTES: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/admin',
  [UserRole.DIETITIAN]: '/dietitian',
  [UserRole.LAB]: '/lab',
  [UserRole.SPECIALIST]: '/specialist',
  [UserRole.DANISAN]: '/danisan',
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.status === UserStatus.PENDING) {
    return <Navigate to="/pending-approval" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_HOME_ROUTES[user.role]} replace />
  }

  return <>{children}</>
}

export function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()

  if (isAuthenticated && user) {
    return <Navigate to={ROLE_HOME_ROUTES[user.role]} replace />
  }

  return <>{children}</>
}

export function PendingApprovalPage() {
  const { logout } = useAuthStore()

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="text-center max-w-md p-8">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-50">
          <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-surface-900 mb-2">Hesabiniz Onay Bekliyor</h2>
        <p className="text-surface-500 mb-8">
          Hesabiniz admin tarafindan incelenmektedir. Onaylandiginda size bildirim gonderilecektir.
        </p>
        <button
          onClick={logout}
          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          Cikis Yap
        </button>
      </div>
    </div>
  )
}
