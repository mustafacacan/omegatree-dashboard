import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search, Sparkles, UserCheck, UserX } from 'lucide-react'
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
} from '@/components/ui'
import { cn } from '@/lib/utils'
import { getUsers } from '@/services/users.service'
import type { SupportTicket, SupportTicketCategory } from '@/services/support-tickets.service'
import type { User } from '@/types/user.types'
import { UserRole, UserStatus, USER_ROLE_LABELS } from '@/utils/constants'

const ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.DIETITIAN,
  UserRole.LAB,
  UserRole.SPECIALIST,
]

const CATEGORY_ROLE_HINT: Partial<Record<SupportTicketCategory, UserRole>> = {
  diet: UserRole.DIETITIAN,
  expert: UserRole.SPECIALIST,
  laboratory: UserRole.LAB,
  technical: UserRole.ADMIN,
}

function personName(user?: User | { firstName?: string; lastName?: string } | null): string {
  if (!user) return '—'
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
  return name || '—'
}

function formatUserShort(user: User): string {
  const name = personName(user)
  const role = USER_ROLE_LABELS[user.role] ?? user.role
  return `${name} · ${role}`
}

function formatUserDetail(user: User): string {
  const email = user.email?.trim()
  return email ? `${formatUserShort(user)} (${email})` : formatUserShort(user)
}

type Props = {
  ticket: SupportTicket | undefined
  onAssign: (userId: number) => void
  onUnassign: () => void
  loading?: boolean
  disabled?: boolean
}

export function SupportTicketAssigneeSelect({
  ticket,
  onAssign,
  onUnassign,
  loading = false,
  disabled = false,
}: Props) {
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const usersQuery = useQuery({
    queryKey: ['support-ticket', 'assignable-users'],
    queryFn: async () => {
      const { users } = await getUsers({
        limit: 200,
        status: 'active',
        isVerified: true,
      })
      return users.filter(
        (u) =>
          ASSIGNABLE_ROLES.includes(u.role) &&
          u.status !== UserStatus.SUSPENDED &&
          !u.deletedAt,
      )
    },
    staleTime: 60_000,
  })

  useEffect(() => {
    if (ticket?.assignedToUserId) {
      setSelectedUserId(String(ticket.assignedToUserId))
    } else {
      setSelectedUserId('')
    }
  }, [ticket?.id, ticket?.assignedToUserId])

  const suggestedRole = ticket?.category ? CATEGORY_ROLE_HINT[ticket.category] : undefined

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = usersQuery.data ?? []

    if (q) {
      list = list.filter((u) => {
        const haystack = [
          u.firstName,
          u.lastName,
          u.email,
          u.phone,
          USER_ROLE_LABELS[u.role],
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }

    return [...list].sort((a, b) => {
      const aSuggested = suggestedRole && a.role === suggestedRole ? 0 : 1
      const bSuggested = suggestedRole && b.role === suggestedRole ? 0 : 1
      if (aSuggested !== bSuggested) return aSuggested - bSuggested

      const roleOrder = ASSIGNABLE_ROLES.indexOf(a.role) - ASSIGNABLE_ROLES.indexOf(b.role)
      if (roleOrder !== 0) return roleOrder

      return personName(a).localeCompare(personName(b), 'tr')
    })
  }, [usersQuery.data, search, suggestedRole])

  const selectedUser = useMemo(
    () =>
      filteredUsers.find((u) => u.id === selectedUserId) ??
      usersQuery.data?.find((u) => u.id === selectedUserId),
    [filteredUsers, selectedUserId, usersQuery.data],
  )

  const currentAssigneeId = ticket?.assignedToUserId ? String(ticket.assignedToUserId) : ''
  const canAssign =
    selectedUserId !== '' &&
    selectedUserId !== currentAssigneeId &&
    Number.isFinite(Number(selectedUserId))

  const handleAssign = () => {
    const id = Number(selectedUserId)
    if (!Number.isFinite(id) || id <= 0) return
    onAssign(id)
  }

  const assigneeRoleLabel = ticket?.assignee
    ? ticket.routedToRole
      ? USER_ROLE_LABELS[mapApiRole(ticket.routedToRole)] ?? ticket.routedToRole
      : undefined
    : undefined

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'rounded-xl border p-3.5',
          ticket?.assignee
            ? 'border-primary-200 bg-primary-50/40'
            : 'border-dashed border-surface-200 bg-surface-50/50',
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-surface-500">
          Mevcut atama
        </p>
        {ticket?.assignee ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700">
              {personName(ticket.assignee).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-surface-900">
                {personName(ticket.assignee)}
              </p>
              {assigneeRoleLabel && (
                <p className="text-xs text-surface-500">{assigneeRoleLabel}</p>
              )}
            </div>
            <Badge variant="primary" size="sm">
              Atanmış
            </Badge>
          </div>
        ) : (
          <p className="mt-2 text-sm text-surface-500">Henüz bir personele atanmadı.</p>
        )}
        {suggestedRole && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-primary-700">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Önerilen rol: {USER_ROLE_LABELS[suggestedRole]}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border border-surface-200 bg-white p-3.5">
        <Input
          placeholder="Ad, soyad, e-posta veya rol..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled || usersQuery.isLoading}
          leftIcon={<Search className="h-4 w-4" />}
        />

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-surface-600">Personel seç</label>
          {usersQuery.isLoading ? (
            <div className="flex items-center gap-2 rounded-xl border border-surface-200 px-3 py-2.5 text-sm text-surface-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Personel listesi yükleniyor...
            </div>
          ) : usersQuery.isError ? (
            <p className="text-sm text-red-600">Personel listesi yüklenemedi.</p>
          ) : (
            <Select
              value={selectedUserId || undefined}
              onValueChange={setSelectedUserId}
              disabled={disabled || filteredUsers.length === 0}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue
                  placeholder={filteredUsers.length ? 'Personel seçin...' : 'Sonuç bulunamadı'}
                />
              </SelectTrigger>
              <SelectContent className="max-h-[280px]">
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id} title={formatUserDetail(user)}>
                    <span className="flex items-center gap-2">
                      <span className="truncate">{formatUserShort(user)}</span>
                      {suggestedRole && user.role === suggestedRole ? (
                        <span className="text-amber-500">★</span>
                      ) : null}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedUser && selectedUserId !== currentAssigneeId && (
            <p className="truncate text-xs text-surface-500" title={formatUserDetail(selectedUser)}>
              Seçilen: {formatUserShort(selectedUser)}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            size="sm"
            className="sm:flex-1"
            loading={loading}
            disabled={disabled || !canAssign}
            onClick={handleAssign}
          >
            <UserCheck className="h-4 w-4" />
            Ata
          </Button>
          {ticket?.assignedToUserId ? (
            <Button
              variant="outline"
              size="sm"
              className="sm:flex-1"
              loading={loading}
              disabled={disabled}
              onClick={onUnassign}
            >
              <UserX className="h-4 w-4" />
              Atamayı Kaldır
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function mapApiRole(apiRole: string): UserRole {
  const map: Record<string, UserRole> = {
    admin: UserRole.ADMIN,
    dietician: UserRole.DIETITIAN,
    laboratory: UserRole.LAB,
    expert: UserRole.SPECIALIST,
    client: UserRole.DANISAN,
  }
  return map[apiRole.toLowerCase()] ?? UserRole.DANISAN
}
