import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/utils/routes'
import type { UserRole } from '@/utils/constants'

export type AdminCreateUserLocationState = {
  openCreateUser?: boolean
  createRole?: UserRole
}

export function useNavigateToAdminCreateUser() {
  const navigate = useNavigate()
  return (role: UserRole) => {
    navigate(ROUTES.YONETICI_KULLANICILAR, {
      state: { openCreateUser: true, createRole: role } satisfies AdminCreateUserLocationState,
    })
  }
}
