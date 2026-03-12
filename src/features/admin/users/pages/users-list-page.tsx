import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Input, Badge, Avatar,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { UserRole, UserStatus, USER_ROLE_LABELS } from '@/utils/constants'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Search, Plus, MoreHorizontal, UserCheck, UserX, Shield, Eye,
  Filter, Download, ChevronLeft, ChevronRight, Loader2, Trash2,
} from 'lucide-react'
import type { User } from '@/types/user.types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCurrentUser } from '@/stores/auth.store'
import { TablePagination } from '@/components/shared/table-pagination'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  verifyUser,
} from '@/services/users.service'

const statusBadgeVariant: Record<UserStatus, 'success' | 'warning' | 'danger'> = {
  [UserStatus.ACTIVE]: 'success',
  [UserStatus.PENDING]: 'warning',
  [UserStatus.SUSPENDED]: 'danger',
}

const statusLabels: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Aktif',
  [UserStatus.PENDING]: 'Onay Bekliyor',
  [UserStatus.SUSPENDED]: 'Askiya Alindi',
}

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

const USERS_QUERY_KEY = ['users'] as const

export function UsersListPage() {
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [editRoleOpen, setEditRoleOpen] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: UserRole.DIETITIAN as UserRole,
    gender: 'male' as 'male' | 'female',
  })
  const [roleToEdit, setRoleToEdit] = useState<UserRole>(UserRole.DIETITIAN)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: () => getUsers({ page: 1, limit: 500 }),
  })
  const users: User[] = Array.isArray(data?.users) ? data.users : []

  const verifyMutation = useMutation({
    mutationFn: verifyUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      setApprovalOpen(false)
      setSelectedUser(null)
      toast.success('Kullanıcı onaylandı')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Onay işlemi başarısız' }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      setApprovalOpen(false)
      setSelectedUser(null)
      setDeleteConfirmOpen(false)
      setUserToDelete(null)
      toast.success('Kullanıcı silindi')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Kullanıcı silinemedi' }))
    },
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      setNewUserOpen(false)
      resetNewUserForm()
      toast.success('Kullanıcı oluşturuldu')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Kullanıcı oluşturulamadı' }))
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) => updateUser(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      setEditRoleOpen(false)
      setSelectedUser(null)
      toast.success('Rol güncellendi')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Rol güncellenemedi' }))
    },
  })

  const pendingUsers = useMemo(
    () => users.filter((u) => u.status === UserStatus.PENDING),
    [users]
  )
  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const q = search.toLowerCase()
        const matchesSearch =
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
        const matchesRole = roleFilter === 'all' || u.role === roleFilter
        return matchesSearch && matchesRole
      }),
    [users, search, roleFilter]
  )

  const handleApprove = (user: User) => {
    setSelectedUser(user)
    setApprovalOpen(true)
  }

  const handleExportCsv = () => {
    const headers = ['Ad Soyad', 'E-posta', 'Telefon', 'Rol', 'Onay', 'Kayıt Tarihi']
    const rows = filteredUsers.map((u) => [
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.phone ?? '-',
      USER_ROLE_LABELS[u.role],
      u.isVerified === true ? 'Onaylı' : u.isVerified === false ? 'Beklemede' : '-',
      formatDate(u.createdAt),
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kullanicilar-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Kullanici listesi indirildi')
  }

  const resetNewUserForm = () => {
    setNewUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: UserRole.DIETITIAN,
      gender: 'male',
    })
  }

  const submitNewUser = () => {
    if (!newUserForm.firstName.trim() || !newUserForm.lastName.trim() || !newUserForm.phone.trim()) {
      toast.error('Ad, soyad ve telefon zorunludur')
      return
    }
    createMutation.mutate({
      firstName: newUserForm.firstName.trim(),
      lastName: newUserForm.lastName.trim(),
      email: newUserForm.email.trim() || undefined,
      phone: newUserForm.phone.trim(),
      role: newUserForm.role,
      gender: newUserForm.gender,
    })
  }

  const openRoleEditor = (user: User) => {
    setSelectedUser(user)
    setRoleToEdit(user.role)
    setEditRoleOpen(true)
  }

  const openProfile = (user: User) => {
    setProfileUser(user)
    setProfileOpen(true)
  }

  const submitRoleUpdate = () => {
    if (!selectedUser) return
    updateRoleMutation.mutate({ id: selectedUser.id, role: roleToEdit })
  }

  const handleApproveConfirm = () => {
    if (!selectedUser) return
    verifyMutation.mutate(selectedUser.id)
  }

  const handleRejectConfirm = () => {
    if (!selectedUser) return
    deleteMutation.mutate(selectedUser.id)
  }

  const handleDeleteOpen = (user: User) => {
    setUserToDelete(user)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!userToDelete) return
    deleteMutation.mutate(userToDelete.id)
  }

  const handleActivate = (_id: string) => {
    toast.error('Hesap tekrar aktif etme API tarafında henüz desteklenmiyor')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      {/* Pending Approval Banner */}
      {pendingUsers.length > 0 && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-100">
              <UserCheck className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {pendingUsers.length} kullanici onay bekliyor
              </p>
              <p className="text-xs text-amber-600">Kayit olan kullanicilari inceleyip onaylayin</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleApprove(pendingUsers[0])}>
            Incele
          </Button>
        </div>
      )}

      <Tabs defaultValue="all">
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
          <div className="panel">
            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <h3 className="text-[15px] font-semibold text-surface-900">Kullanıcılar</h3>
                  <p className="text-[12px] mt-0.5 text-surface-500">Kayıtlı kullanıcılar ({filteredUsers.length} kişi)</p>
                </div>
                <TabsList className="ml-0">
                  <TabsTrigger value="all">Tümü ({users.length})</TabsTrigger>
                  <TabsTrigger value="active">Aktif ({users.filter(u => u.status === UserStatus.ACTIVE).length})</TabsTrigger>
                  <TabsTrigger value="pending">Bekleyen ({pendingUsers.length})</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                  <input
                    type="text"
                    placeholder="Ad, e-posta ara..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="min-w-[10rem]">
                    <Filter className="h-3.5 w-3.5 mr-2 text-surface-400" />
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm roller</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                    <SelectItem value={UserRole.DIETITIAN}>Diyetisyen</SelectItem>
                    <SelectItem value={UserRole.LAB}>Laboratuvar</SelectItem>
                    <SelectItem value={UserRole.SPECIALIST}>Uzman</SelectItem>
                    <SelectItem value={UserRole.DANISAN}>Danışan</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleExportCsv}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="primary" size="sm" onClick={() => setNewUserOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Yeni Kullanıcı
                </Button>
              </div>
            </div>
            <TabsContent value="all">
              <UserTable
                users={filteredUsers}
                currentUserId={currentUser?.id}
                onApprove={handleApprove}
                onDelete={handleDeleteOpen}
                onActivate={handleActivate}
                onEditRole={openRoleEditor}
                onViewProfile={openProfile}
                isLoading={isLoading}
              />
            </TabsContent>
            <TabsContent value="active">
              <UserTable
                users={filteredUsers.filter(u => u.status === UserStatus.ACTIVE)}
                currentUserId={currentUser?.id}
                onApprove={handleApprove}
                onDelete={handleDeleteOpen}
                onActivate={handleActivate}
                onEditRole={openRoleEditor}
                onViewProfile={openProfile}
                isLoading={isLoading}
              />
            </TabsContent>
            <TabsContent value="pending">
              <UserTable
                users={filteredUsers.filter(u => u.status === UserStatus.PENDING)}
                currentUserId={currentUser?.id}
                onApprove={handleApprove}
                onDelete={handleDeleteOpen}
                onActivate={handleActivate}
                onEditRole={openRoleEditor}
                onViewProfile={openProfile}
                isLoading={isLoading}
              />
            </TabsContent>
          </div>
        </motion.div>
      </Tabs>

      {/* Approval Modal — carousel ile bekleyen kullanıcılar arasında gezinme */}
      <Modal open={approvalOpen} onOpenChange={setApprovalOpen}>
        <ModalContent>
          <ModalHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <ModalTitle>Kullanıcı Onay</ModalTitle>
                <ModalDescription>
                  {pendingUsers.length > 0
                    ? `${pendingUsers.length} kullanıcı onay bekliyor. İleri/geri ile inceleyin.`
                    : 'Bu kullanıcıyı aktif hale getirmek istiyor musunuz?'}
                </ModalDescription>
              </div>
              {pendingUsers.length > 1 && selectedUser && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const idx = pendingUsers.findIndex((u) => u.id === selectedUser.id)
                      if (idx > 0) setSelectedUser(pendingUsers[idx - 1])
                    }}
                    disabled={pendingUsers.findIndex((u) => u.id === selectedUser.id) <= 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-surface-600 tabular-nums">
                    {pendingUsers.findIndex((u) => u.id === selectedUser.id) + 1} / {pendingUsers.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const idx = pendingUsers.findIndex((u) => u.id === selectedUser.id)
                      if (idx >= 0 && idx < pendingUsers.length - 1) setSelectedUser(pendingUsers[idx + 1])
                    }}
                    disabled={
                      pendingUsers.findIndex((u) => u.id === selectedUser.id) >= pendingUsers.length - 1 ||
                      pendingUsers.findIndex((u) => u.id === selectedUser.id) < 0
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </ModalHeader>
          {selectedUser && (
            <ModalBody>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50">
                <Avatar name={`${selectedUser.firstName} ${selectedUser.lastName}`} size="lg" />
                <div>
                  <p className="font-semibold text-surface-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <p className="text-sm text-surface-500">{selectedUser.email}</p>
                  <Badge variant="info" className="mt-1">
                    {USER_ROLE_LABELS[selectedUser.role]}
                  </Badge>
                </div>
              </div>
            </ModalBody>
          )}
          <ModalFooter>
            <Button
              variant="outline"
              onClick={handleRejectConfirm}
              disabled={verifyMutation.isPending || deleteMutation.isPending}
            >
              <UserX className="h-4 w-4" />
              Reddet
            </Button>
            <Button
              variant="default"
              onClick={handleApproveConfirm}
              loading={verifyMutation.isPending}
              disabled={deleteMutation.isPending}
            >
              <UserCheck className="h-4 w-4" />
              Onayla
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Silme onay modalı */}
      <Modal open={deleteConfirmOpen} onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) setUserToDelete(null) }}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Kullanıcıyı Sil</ModalTitle>
            <ModalDescription>
              {userToDelete
                ? `${userToDelete.firstName} ${userToDelete.lastName} (${userToDelete.email}) kullanıcısını silmek istediğinize emin misiniz? Kullanıcının tüm verileri kalıcı olarak silinecektir. Bu işlem geri alınamaz.`
                : ''}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setUserToDelete(null) }}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={!userToDelete || deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleteMutation.isPending ? ' Siliniyor...' : ' Sil'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create User Modal */}
      <Modal open={newUserOpen} onOpenChange={setNewUserOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Yeni Kullanici Ekle</ModalTitle>
            <ModalDescription>Yeni kullaniciyi aktif olarak olusturun</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ad"
                value={newUserForm.firstName}
                onChange={(e) => setNewUserForm((s) => ({ ...s, firstName: e.target.value }))}
              />
              <Input
                label="Soyad"
                value={newUserForm.lastName}
                onChange={(e) => setNewUserForm((s) => ({ ...s, lastName: e.target.value }))}
              />
            </div>
            <Input
              label="E-posta"
              type="email"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm((s) => ({ ...s, email: e.target.value }))}
            />
            <Input
              label="Telefon"
              value={newUserForm.phone}
              onChange={(e) => setNewUserForm((s) => ({ ...s, phone: e.target.value }))}
              placeholder="05XX XXX XX XX"
            />
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-surface-700">Cinsiyet</label>
              <Select
                value={newUserForm.gender}
                onValueChange={(v) => setNewUserForm((s) => ({ ...s, gender: v as 'male' | 'female' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Erkek</SelectItem>
                  <SelectItem value="female">Kadın</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-surface-700">Rol</label>
              <Select
                value={newUserForm.role}
                onValueChange={(value) => setNewUserForm((s) => ({ ...s, role: value as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  <SelectItem value={UserRole.DIETITIAN}>Diyetisyen</SelectItem>
                  <SelectItem value={UserRole.LAB}>Laboratuvar</SelectItem>
                  <SelectItem value={UserRole.SPECIALIST}>Uzman</SelectItem>
                  <SelectItem value={UserRole.DANISAN}>Danışan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-surface-500">
              Şifre kullanıcıya SMS ile gönderilir.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setNewUserOpen(false); resetNewUserForm() }}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitNewUser} loading={createMutation.isPending}>
              Kullanıcı Oluştur
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Role Modal */}
      <Modal open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Rol Duzenle</ModalTitle>
            <ModalDescription>Kullanicinin rolunu guncelleyin</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            {selectedUser && (
              <div className="text-sm text-surface-600">
                {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})
              </div>
            )}
            <Select value={roleToEdit} onValueChange={(v) => setRoleToEdit(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                <SelectItem value={UserRole.DIETITIAN}>Diyetisyen</SelectItem>
                <SelectItem value={UserRole.LAB}>Laboratuvar</SelectItem>
                <SelectItem value={UserRole.SPECIALIST}>Uzman</SelectItem>
                <SelectItem value={UserRole.DANISAN}>Danisan</SelectItem>
              </SelectContent>
            </Select>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditRoleOpen(false)}>İptal</Button>
            <Button variant="primary" onClick={submitRoleUpdate}>Kaydet</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Kullanıcı detay modalı — API'deki tüm alanlar */}
      <Modal open={profileOpen} onOpenChange={setProfileOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Kullanıcı detayı</ModalTitle>
            <ModalDescription>Seçilen kullanıcının bilgileri</ModalDescription>
          </ModalHeader>
          {profileUser && (
            <ModalBody className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50">
                <Avatar name={`${profileUser.firstName} ${profileUser.lastName}`} size="lg" />
                <div>
                  <p className="font-semibold text-surface-900">
                    {profileUser.firstName} {profileUser.lastName}
                  </p>
                  <p className="text-sm text-surface-500">{profileUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">Ad</p>
                  <p className="font-medium text-surface-800">{profileUser.firstName}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">Soyad</p>
                  <p className="font-medium text-surface-800">{profileUser.lastName}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">Telefon</p>
                  <p className="font-medium text-surface-800">{profileUser.phone || '-'}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">E-posta</p>
                  <p className="font-medium text-surface-800">{profileUser.email}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">Rol</p>
                  <p className="font-medium text-surface-800">{USER_ROLE_LABELS[profileUser.role]}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">Onay</p>
                  <p className="font-medium text-surface-800">{profileUser.isVerified === true ? 'Onaylı' : profileUser.isVerified === false ? 'Beklemede' : '-'}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">Oluşturulma</p>
                  <p className="font-medium text-surface-800">{formatDate(profileUser.createdAt)}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">Güncellenme</p>
                  <p className="font-medium text-surface-800">{formatDate(profileUser.updatedAt)}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3 col-span-2">
                  <p className="text-surface-500 text-xs mb-1">Silinme (deletedAt)</p>
                  <p className="font-medium text-surface-800">{profileUser.deletedAt ? formatDate(profileUser.deletedAt) : '-'}</p>
                </div>
              </div>
            </ModalBody>
          )}
          <ModalFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>Kapat</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

function UserTable({
  users,
  currentUserId,
  onApprove,
  onDelete,
  onActivate,
  onEditRole,
  onViewProfile,
  isLoading,
}: {
  users: User[]
  currentUserId?: string
  onApprove: (u: User) => void
  onDelete: (u: User) => void
  onActivate: (id: string) => void
  onEditRole: (u: User) => void
  onViewProfile: (u: User) => void
  isLoading?: boolean
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const paginatedUsers = useMemo(
    () => users.slice((page - 1) * pageSize, page * pageSize),
    [users, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [users.length])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(users.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [users.length, page, pageSize])

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Ad Soyad</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">E-posta</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Telefon</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Rol</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Onay</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Kayıt Tarihi</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20 text-surface-500" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                  <p className="text-[12px] text-surface-500">Kullanıcı listesi yükleniyor...</p>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[12px] text-surface-500">
                  Filtreye uygun kullanıcı bulunamadı.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
                      <span className="text-[12px] text-surface-700">{user.firstName} {user.lastName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-surface-700">{user.email}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-surface-500">{user.phone || '—'}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-200 dark:bg-surface-300/50 text-surface-700">
                      {USER_ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        user.isVerified === true
                          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                          : user.isVerified === false
                            ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                            : 'bg-surface-200 dark:bg-surface-300/50 text-surface-500'
                      }`}
                    >
                      {user.isVerified === true ? 'Onaylı' : user.isVerified === false ? 'Beklemede' : statusLabels[user.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-surface-500">{formatDate(user.createdAt)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.status === UserStatus.PENDING && (
                          <>
                            <DropdownMenuItem onClick={() => onApprove(user)}>
                              <UserCheck className="h-4 w-4 mr-2" /> Onayla
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => onViewProfile(user)}>
                          <Eye className="h-4 w-4 mr-2" /> Profili Gör
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEditRole(user)}>
                          <Shield className="h-4 w-4 mr-2" /> Yetkileri Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === UserStatus.ACTIVE && (
                          <DropdownMenuItem
                            className="text-danger"
                            disabled={user.id === currentUserId}
                            onClick={() => {
                              if (user.id === currentUserId) {
                                toast.error('Kendi hesabınızı silemezsiniz')
                                return
                              }
                              onDelete(user)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Sil
                          </DropdownMenuItem>
                        )}
                        {user.status === UserStatus.SUSPENDED && (
                          <DropdownMenuItem
                            onClick={() => {
                              onActivate(user.id)
                              toast.success(`${user.firstName} ${user.lastName} yeniden aktif edildi`)
                            }}
                          >
                            <UserCheck className="h-4 w-4 mr-2" /> Aktif Et
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        totalItems={users.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next)
          setPage(1)
        }}
      />
    </>
  )
}
