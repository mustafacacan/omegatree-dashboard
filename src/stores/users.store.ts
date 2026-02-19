import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'
import type { RegisterRequest, User } from '@/types/user.types'
import { UserRole, UserStatus } from '@/utils/constants'

type AuthFailureReason = 'INVALID_CREDENTIALS' | 'PENDING_APPROVAL' | 'SUSPENDED'

interface AuthSuccessResult {
  ok: true
  user: User
}

interface AuthFailureResult {
  ok: false
  reason: AuthFailureReason
}

type AuthResult = AuthSuccessResult | AuthFailureResult

interface SubmitRegistrationResult {
  ok: boolean
  message: string
}

interface AdminCreateUserPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  role: UserRole
  status?: UserStatus
}

interface UsersState {
  users: User[]
  credentials: Record<string, string>
  submitRegistration: (request: RegisterRequest) => SubmitRegistrationResult
  createUserByAdmin: (payload: AdminCreateUserPayload) => SubmitRegistrationResult
  updateUserRole: (userId: string, role: UserRole) => SubmitRegistrationResult
  approveUser: (userId: string) => void
  rejectUser: (userId: string) => void
  suspendUser: (userId: string) => void
  activateUser: (userId: string) => void
  authenticate: (email: string, password: string) => AuthResult
}

const seedUsers: User[] = [
  {
    id: 'u-admin-1',
    email: 'admin@omegatree.com',
    firstName: 'Admin',
    lastName: 'Kullanici',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    createdAt: '2025-01-01T09:00:00.000Z',
    updatedAt: '2025-01-01T09:00:00.000Z',
  },
  {
    id: 'u-dietitian-1',
    email: 'diyetisyen@omegatree.com',
    firstName: 'Ayse',
    lastName: 'Yilmaz',
    role: UserRole.DIETITIAN,
    status: UserStatus.ACTIVE,
    phone: '05321234567',
    createdAt: '2025-01-03T09:00:00.000Z',
    updatedAt: '2025-01-03T09:00:00.000Z',
  },
  {
    id: 'u-lab-1',
    email: 'lab@omegatree.com',
    firstName: 'Lab',
    lastName: 'Teknisyeni',
    role: UserRole.LAB,
    status: UserStatus.ACTIVE,
    createdAt: '2025-01-05T09:00:00.000Z',
    updatedAt: '2025-01-05T09:00:00.000Z',
  },
  {
    id: 'u-specialist-1',
    email: 'uzman@omegatree.com',
    firstName: 'Mehmet',
    lastName: 'Uzman',
    role: UserRole.SPECIALIST,
    status: UserStatus.ACTIVE,
    createdAt: '2025-01-06T09:00:00.000Z',
    updatedAt: '2025-01-06T09:00:00.000Z',
  },
  {
    id: 'u-danisan-1',
    email: 'danisan@omegatree.com',
    firstName: 'Ahmet',
    lastName: 'Yildiz',
    role: UserRole.DANISAN,
    status: UserStatus.ACTIVE,
    createdAt: '2025-01-07T09:00:00.000Z',
    updatedAt: '2025-01-07T09:00:00.000Z',
  },
  {
    id: 'u-dietitian-pending-1',
    email: 'bekleyen.dyt@omegatree.com',
    firstName: 'Elif',
    lastName: 'Kara',
    role: UserRole.DIETITIAN,
    status: UserStatus.PENDING,
    phone: '05323334444',
    createdAt: '2025-02-01T10:00:00.000Z',
    updatedAt: '2025-02-01T10:00:00.000Z',
  },
  {
    id: 'u-specialist-suspended-1',
    email: 'askida.uzman@omegatree.com',
    firstName: 'Can',
    lastName: 'Arslan',
    role: UserRole.SPECIALIST,
    status: UserStatus.SUSPENDED,
    createdAt: '2025-02-03T12:00:00.000Z',
    updatedAt: '2025-02-08T14:00:00.000Z',
  },
]

const seedCredentials: Record<string, string> = {
  'admin@omegatree.com': 'demo123',
  'diyetisyen@omegatree.com': 'demo123',
  'lab@omegatree.com': 'demo123',
  'uzman@omegatree.com': 'demo123',
  'danisan@omegatree.com': 'demo123',
  'bekleyen.dyt@omegatree.com': 'demo123',
  'askida.uzman@omegatree.com': 'demo123',
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      users: seedUsers,
      credentials: seedCredentials,

      submitRegistration: (request) => {
        const email = normalizeEmail(request.email)
        const exists = get().users.some((u) => normalizeEmail(u.email) === email)
        if (exists) {
          return { ok: false, message: 'Bu e-posta ile kayitli bir hesap zaten var.' }
        }

        const now = new Date().toISOString()
        const newUser: User = {
          id: generateId('u-'),
          email,
          firstName: request.firstName.trim(),
          lastName: request.lastName.trim(),
          phone: request.phone.trim(),
          role: request.role,
          status: UserStatus.PENDING,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          users: [newUser, ...state.users],
          credentials: { ...state.credentials, [email]: request.password },
        }))

        return { ok: true, message: 'Basvurunuz alindi. Admin onayindan sonra giris yapabilirsiniz.' }
      },

      createUserByAdmin: (payload) => {
        const email = normalizeEmail(payload.email)
        const password = payload.password.trim()
        const firstName = payload.firstName.trim()
        const lastName = payload.lastName.trim()

        if (!email || !password || !firstName || !lastName) {
          return { ok: false, message: 'Ad, soyad, e-posta ve sifre zorunludur.' }
        }

        const exists = get().users.some((u) => normalizeEmail(u.email) === email)
        if (exists) {
          return { ok: false, message: 'Bu e-posta ile kayitli bir hesap zaten var.' }
        }

        const now = new Date().toISOString()
        const newUser: User = {
          id: generateId('u-'),
          email,
          firstName,
          lastName,
          phone: payload.phone?.trim(),
          role: payload.role,
          status: payload.status || UserStatus.ACTIVE,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          users: [newUser, ...state.users],
          credentials: { ...state.credentials, [email]: password },
        }))

        return { ok: true, message: 'Kullanici basariyla olusturuldu.' }
      },

      updateUserRole: (userId, role) => {
        const target = get().users.find((u) => u.id === userId)
        if (!target) {
          return { ok: false, message: 'Kullanici bulunamadi.' }
        }

        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId ? { ...u, role, updatedAt: new Date().toISOString() } : u
          ),
        }))

        return { ok: true, message: 'Kullanici rolu guncellendi.' }
      },

      approveUser: (userId) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId
              ? { ...u, status: UserStatus.ACTIVE, updatedAt: new Date().toISOString() }
              : u
          ),
        }))
      },

      rejectUser: (userId) => {
        set((state) => {
          const target = state.users.find((u) => u.id === userId)
          if (!target) return state
          const email = normalizeEmail(target.email)
          const { [email]: _removed, ...restCredentials } = state.credentials
          return {
            users: state.users.filter((u) => u.id !== userId),
            credentials: restCredentials,
          }
        })
      },

      suspendUser: (userId) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId
              ? { ...u, status: UserStatus.SUSPENDED, updatedAt: new Date().toISOString() }
              : u
          ),
        }))
      },

      activateUser: (userId) => {
        set((state) => ({
          users: state.users.map((u) =>
            u.id === userId
              ? { ...u, status: UserStatus.ACTIVE, updatedAt: new Date().toISOString() }
              : u
          ),
        }))
      },

      authenticate: (email, password) => {
        const normalizedEmail = normalizeEmail(email)
        const { users, credentials } = get()
        const user = users.find((u) => normalizeEmail(u.email) === normalizedEmail)

        if (!user || credentials[normalizedEmail] !== password) {
          return { ok: false, reason: 'INVALID_CREDENTIALS' }
        }
        if (user.status === UserStatus.PENDING) {
          return { ok: false, reason: 'PENDING_APPROVAL' }
        }
        if (user.status === UserStatus.SUSPENDED) {
          return { ok: false, reason: 'SUSPENDED' }
        }

        const updatedUser = { ...user, lastLoginAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        set((state) => ({
          users: state.users.map((u) => (u.id === user.id ? updatedUser : u)),
        }))

        return { ok: true, user: updatedUser }
      },
    }),
    {
      name: 'omegatree-users',
      version: 2,
      migrate: () => ({
        users: seedUsers,
        credentials: seedCredentials,
      }),
      partialize: (state) => ({ users: state.users, credentials: state.credentials }),
    }
  )
)
