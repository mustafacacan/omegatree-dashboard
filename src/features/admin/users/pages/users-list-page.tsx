import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent, Button, Input, Badge, Avatar,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { UserRole, UserStatus, USER_ROLE_LABELS } from '@/utils/constants'
import { formatDate } from '@/lib/utils'
import {
  Search, Plus, MoreHorizontal, UserCheck, UserX, Mail, Shield, Eye,
  Filter, Download, ChevronLeft, ChevronRight,
} from 'lucide-react'
import type { User } from '@/types/user.types'
import toast from 'react-hot-toast'
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

  const { data, isLoading } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: async () => {
      const res = await getUsers({ page: 1, limit: 500 })
      return res.users
    },
  })
  const users = data ?? []

  const verifyMutation = useMutation({
    mutationFn: verifyUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      setApprovalOpen(false)
      setSelectedUser(null)
      toast.success('Kullanıcı onaylandı')
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      toast.error(msg ?? 'Onay işlemi başarısız')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      setApprovalOpen(false)
      setSelectedUser(null)
      toast.success('Kullanıcı başvurusu reddedildi')
    },
    onError: (err: unknown) => {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      toast.error(msg ?? 'İşlem başarısız')
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
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      toast.error(msg ?? 'Kullanıcı oluşturulamadı')
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
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null
      toast.error(msg ?? 'Rol güncellenemedi')
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
    const headers = ['Ad Soyad', 'E-posta', 'Rol', 'Durum', 'Kayit Tarihi', 'Son Giris']
    const rows = filteredUsers.map((u) => [
      `${u.firstName} ${u.lastName}`,
      u.email,
      USER_ROLE_LABELS[u.role],
      statusLabels[u.status],
      formatDate(u.createdAt),
      u.lastLoginAt ? formatDate(u.lastLoginAt) : '-',
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

  const handleSuspend = (_id: string) => {
    toast.error('Hesap askıya alma API tarafında henüz desteklenmiyor')
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <CardTitle>Kullanicilar</CardTitle>
                <TabsList>
                  <TabsTrigger value="all">Tumunu ({users.length})</TabsTrigger>
                  <TabsTrigger value="active">Aktif ({users.filter(u => u.status === UserStatus.ACTIVE).length})</TabsTrigger>
                  <TabsTrigger value="pending">Bekleyen ({pendingUsers.length})</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Kullanici ara..."
                  leftIcon={<Search className="h-4 w-4" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64"
                />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-44">
                    <Filter className="h-4 w-4 mr-2 text-surface-400" />
                    <SelectValue placeholder="Rol Filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tum Roller</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                    <SelectItem value={UserRole.DIETITIAN}>Diyetisyen</SelectItem>
                    <SelectItem value={UserRole.LAB}>Laboratuvar</SelectItem>
                    <SelectItem value={UserRole.SPECIALIST}>Uzman</SelectItem>
                    <SelectItem value={UserRole.DANISAN}>Danisan</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={handleExportCsv}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="primary" onClick={() => setNewUserOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Yeni Kullanici
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <TabsContent value="all">
              <UserTable
                users={filteredUsers}
                currentUserId={currentUser?.id}
                onApprove={handleApprove}
                onSuspend={handleSuspend}
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
                onSuspend={handleSuspend}
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
                onSuspend={handleSuspend}
                onActivate={handleActivate}
                onEditRole={openRoleEditor}
                onViewProfile={openProfile}
                isLoading={isLoading}
              />
            </TabsContent>
          </CardContent>
        </Card>
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
            <Button onClick={submitNewUser} loading={createMutation.isPending}>
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
            <Button variant="outline" onClick={() => setEditRoleOpen(false)}>Iptal</Button>
            <Button onClick={submitRoleUpdate}>Kaydet</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Profile Detail Modal */}
      <Modal open={profileOpen} onOpenChange={setProfileOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Kullanici Profili</ModalTitle>
            <ModalDescription>Secilen kullanicinin detay bilgileri</ModalDescription>
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
                  <p className="text-surface-500 text-xs mb-1">Rol</p>
                  <p className="font-medium text-surface-800">{USER_ROLE_LABELS[profileUser.role]}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">Durum</p>
                  <Badge variant={statusBadgeVariant[profileUser.status]} dot>
                    {statusLabels[profileUser.status]}
                  </Badge>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">Telefon</p>
                  <p className="font-medium text-surface-800">{profileUser.phone || '-'}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-xs mb-1">Son Giris</p>
                  <p className="font-medium text-surface-800">{profileUser.lastLoginAt ? formatDate(profileUser.lastLoginAt) : '-'}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3 col-span-2">
                  <p className="text-surface-500 text-xs mb-1">Kayit Tarihi</p>
                  <p className="font-medium text-surface-800">{formatDate(profileUser.createdAt)}</p>
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
  onSuspend,
  onActivate,
  onEditRole,
  onViewProfile,
  isLoading,
}: {
  users: User[]
  currentUserId?: string
  onApprove: (u: User) => void
  onSuspend: (id: string) => void
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kullanici</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Durum</TableHead>
            <TableHead>Kayit Tarihi</TableHead>
            <TableHead>Son Giris</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-surface-500">
                Yükleniyor...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && users.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-sm text-surface-500">
                Filtreye uygun kullanıcı bulunamadı.
              </TableCell>
            </TableRow>
          )}
          {!isLoading && paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
                    <div>
                      <p className="font-medium text-surface-800">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-surface-400">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{USER_ROLE_LABELS[user.role]}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant[user.status]} dot pulse={user.status === UserStatus.PENDING}>
                    {statusLabels[user.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-surface-500">{formatDate(user.createdAt)}</TableCell>
                <TableCell className="text-sm text-surface-500">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : '-'}
                </TableCell>
                <TableCell>
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
                        <Eye className="h-4 w-4 mr-2" /> Profili Gor
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => toast.success(`${user.firstName} ${user.lastName} adresine e-posta gonderildi`)}>
                        <Mail className="h-4 w-4 mr-2" /> E-posta Gonder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditRole(user)}>
                        <Shield className="h-4 w-4 mr-2" /> Yetkileri Duzenle
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                        {user.status === UserStatus.ACTIVE && (
                          <DropdownMenuItem
                            className="text-danger"
                            disabled={user.id === currentUserId}
                            onClick={() => {
                              if (user.id === currentUserId) {
                                toast.error('Kendi hesabinizi askiya alamazsiniz')
                                return
                              }
                              onSuspend(user.id)
                              toast.success(`${user.firstName} ${user.lastName} askiya alindi`)
                            }}
                          >
                            <UserX className="h-4 w-4 mr-2" /> Askiya Al
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
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
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
