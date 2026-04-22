import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Filter, ChevronLeft, ChevronRight, Loader2, Trash2, Pencil,
} from 'lucide-react'
import type { User } from '@/types/user.types'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { useCurrentUser } from '@/stores/auth.store'
import { TablePagination } from '@/components/shared/table-pagination'
import {
  createUser,
  updateUser,
  deleteUser,
  verifyUser,
  getUsersWithPagination,
} from '@/services/users.service'

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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [editRoleOpen, setEditRoleOpen] = useState(false)
  const [roleChangeConfirmOpen, setRoleChangeConfirmOpen] = useState(false)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ id: string; from: UserRole; to: UserRole } | null>(null)
  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: UserRole.ADMIN as UserRole,
    gender: 'male' as 'male' | 'female',
  })
  const [roleToEdit, setRoleToEdit] = useState<UserRole>(UserRole.DIETITIAN)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [editUserOpen, setEditUserOpen] = useState(false)
  const [userBeingEdited, setUserBeingEdited] = useState<User | null>(null)
  const [editUserForm, setEditUserForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    identityNumber: '',
  })

  const trimmedSearch = useMemo(() => search.trim(), [search])
  const usersQuery = useQuery({
    queryKey: [...USERS_QUERY_KEY, { page, pageSize, role: roleFilter, search: trimmedSearch }],
    queryFn: () =>
      getUsersWithPagination({
        page,
        limit: pageSize,
        role: roleFilter !== 'all' ? (roleFilter as UserRole) : undefined,
        search: trimmedSearch || undefined,
      }),
    placeholderData: keepPreviousData,
  })
  const users: User[] = useMemo(() => usersQuery.data?.items ?? [], [usersQuery.data?.items])
  const totalItems = usersQuery.data?.totalItems ?? users.length
  const totalPages = useMemo(() => {
    const safeSize = Math.max(1, pageSize)
    return Math.max(1, Math.ceil(totalItems / safeSize))
  }, [totalItems, pageSize])
  const effectivePage = useMemo(() => Math.min(Math.max(1, page), totalPages), [page, totalPages])

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

  const updateUserDetailsMutation = useMutation({
    mutationFn: (args: {
      id: string
      firstName: string
      lastName: string
      phone: string
      email?: string
      identityNumber?: string
    }) =>
      updateUser(args.id, {
        firstName: args.firstName,
        lastName: args.lastName,
        phone: args.phone,
        email: args.email,
        identityNumber: args.identityNumber,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      setEditUserOpen(false)
      setUserBeingEdited(null)
      toast.success('Kullanıcı bilgileri güncellendi')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Bilgiler güncellenemedi' }))
    },
  })

  const pendingUsers = useMemo(
    () => users.filter((u) => u.status === UserStatus.PENDING),
    [users]
  )

  const handleApprove = (user: User) => {
    setSelectedUser(user)
    setApprovalOpen(true)
  }

  const resetNewUserForm = () => {
    setNewUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: UserRole.ADMIN,
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

  const openEditUser = (user: User) => {
    setUserBeingEdited(user)
    setEditUserForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      email: user.email ?? '',
      identityNumber: user.identityNumber ?? '',
    })
    setEditUserOpen(true)
  }

  const submitEditUser = () => {
    if (!userBeingEdited) return
    if (!editUserForm.firstName.trim() || !editUserForm.lastName.trim() || !editUserForm.phone.trim()) {
      toast.error('Ad, soyad ve telefon zorunludur')
      return
    }
    const idTrim = editUserForm.identityNumber.trim()
    updateUserDetailsMutation.mutate({
      id: userBeingEdited.id,
      firstName: editUserForm.firstName.trim(),
      lastName: editUserForm.lastName.trim(),
      phone: editUserForm.phone.trim(),
      email: editUserForm.email.trim() || undefined,
      ...(idTrim ? { identityNumber: idTrim } : {}),
    })
  }

  const submitRoleUpdate = () => {
    if (!selectedUser) return
    if (selectedUser.role !== roleToEdit) {
      setPendingRoleChange({ id: selectedUser.id, from: selectedUser.role, to: roleToEdit })
      setEditRoleOpen(false)
      setRoleChangeConfirmOpen(true)
      return
    }
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

  const handleActivate = () => {
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
                <p className="text-[12px] mt-0.5 text-surface-500">Kayıtlı kullanıcılar ({totalItems} kişi)</p>
                </div>
                <TabsList className="ml-0">
                <TabsTrigger value="all">Tümü</TabsTrigger>
                <TabsTrigger value="active">Aktif</TabsTrigger>
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
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                    className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
                  />
                </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => {
                  setRoleFilter(v)
                  setPage(1)
                }}
              >
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
<Button variant="primary" size="sm" onClick={() => setNewUserOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Yeni Admin Ekle
                  </Button>
              </div>
            </div>
            <TabsContent value="all">
              <UserTable
                users={users}
                totalItems={totalItems}
                page={effectivePage}
                pageSize={pageSize}
                onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
                onPageSizeChange={(next) => {
                  setPageSize(next)
                  setPage(1)
                }}
                currentUserId={currentUser?.id}
                onApprove={handleApprove}
                onDelete={handleDeleteOpen}
                onActivate={handleActivate}
                onEditRole={openRoleEditor}
                onEditUser={openEditUser}
                onViewProfile={openProfile}
                isLoading={usersQuery.isLoading}
              />
            </TabsContent>
            <TabsContent value="active">
              <UserTable
                users={users.filter(u => u.status === UserStatus.ACTIVE)}
                totalItems={totalItems}
                page={effectivePage}
                pageSize={pageSize}
                onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
                onPageSizeChange={(next) => {
                  setPageSize(next)
                  setPage(1)
                }}
                currentUserId={currentUser?.id}
                onApprove={handleApprove}
                onDelete={handleDeleteOpen}
                onActivate={handleActivate}
                onEditRole={openRoleEditor}
                onEditUser={openEditUser}
                onViewProfile={openProfile}
                isLoading={usersQuery.isLoading}
              />
            </TabsContent>
            <TabsContent value="pending">
              <UserTable
                users={users.filter(u => u.status === UserStatus.PENDING)}
                totalItems={totalItems}
                page={effectivePage}
                pageSize={pageSize}
                onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
                onPageSizeChange={(next) => {
                  setPageSize(next)
                  setPage(1)
                }}
                currentUserId={currentUser?.id}
                onApprove={handleApprove}
                onDelete={handleDeleteOpen}
                onActivate={handleActivate}
                onEditRole={openRoleEditor}
                onEditUser={openEditUser}
                onViewProfile={openProfile}
                isLoading={usersQuery.isLoading}
              />
            </TabsContent>
          </div>
        </motion.div>
      </Tabs>

      {/* Approval Modal — carousel ile bekleyen kullanıcılar arasında gezinme */}
      <Modal open={approvalOpen} onOpenChange={setApprovalOpen}>
        <ModalContent className="max-w-lg">
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
            <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
                <Avatar name={`${selectedUser.firstName} ${selectedUser.lastName}`} size="lg" />
                <div>
                  <p className="font-semibold text-surface-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                  <p className="text-[13px] text-surface-500">{selectedUser.email}</p>
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
              loading={deleteMutation.isPending}
            >
              <UserX className="h-4 w-4" />
              Reddet
            </Button>
            <Button
              variant="primary"
              onClick={handleApproveConfirm}
              disabled={verifyMutation.isPending || deleteMutation.isPending}
              loading={verifyMutation.isPending}
            >
              <UserCheck className="h-4 w-4" />
              Onayla
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Silme onay modalı */}
      <Modal open={deleteConfirmOpen} onOpenChange={(open) => { setDeleteConfirmOpen(open); if (!open) setUserToDelete(null) }}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Kullanıcıyı Sil</ModalTitle>
            <ModalDescription>
              {userToDelete
                ? `${userToDelete.firstName} ${userToDelete.lastName} (${userToDelete.email}) kullanıcısını silmek istediğinize emin misiniz? Kullanıcının tüm verileri kalıcı olarak silinecektir. Bu işlem geri alınamaz.`
                : ''}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setDeleteConfirmOpen(false); setUserToDelete(null) }} disabled={deleteMutation.isPending}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={!userToDelete || deleteMutation.isPending} loading={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4" />
              Sil
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create User Modal */}
      <Modal open={newUserOpen} onOpenChange={setNewUserOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Yeni Kullanıcı Ekle</ModalTitle>
            <ModalDescription>Yeni kullaniciyi aktif olarak olusturun</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="form-section-title">Kişisel Bilgiler</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ad *"
                value={newUserForm.firstName}
                onChange={(e) => setNewUserForm((s) => ({ ...s, firstName: e.target.value }))}
                placeholder="Ad"
              />
              <Input
                label="Soyad *"
                value={newUserForm.lastName}
                onChange={(e) => setNewUserForm((s) => ({ ...s, lastName: e.target.value }))}
                placeholder="Soyad"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Telefon *"
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm((s) => ({ ...s, phone: e.target.value }))}
                placeholder="05XX XXX XX XX"
              />
              <Input
                label="E-posta *"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="ornek@email.com"
              />
            </div>
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
            <p className="text-[11px] text-surface-500 pt-2">
              Şifre kullanıcıya SMS ile gönderilir.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setNewUserOpen(false); resetNewUserForm() }} disabled={createMutation.isPending}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitNewUser} disabled={createMutation.isPending} loading={createMutation.isPending}>
              Admin Ekle
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Kullanıcı bilgilerini düzenle — PUT /users/{id} */}
      <Modal
        open={editUserOpen}
        onOpenChange={(open) => {
          setEditUserOpen(open)
          if (!open) setUserBeingEdited(null)
        }}
      >
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Kullanıcı Bilgilerini Düzenle</ModalTitle>
            <ModalDescription>
              {userBeingEdited
                ? `${userBeingEdited.firstName} ${userBeingEdited.lastName} — ad, soyad, telefon ve iletişim bilgilerini güncelleyin`
                : ''}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="form-section-title">Kişisel Bilgiler</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ad *"
                value={editUserForm.firstName}
                onChange={(e) => setEditUserForm((s) => ({ ...s, firstName: e.target.value }))}
                placeholder="Ad"
              />
              <Input
                label="Soyad *"
                value={editUserForm.lastName}
                onChange={(e) => setEditUserForm((s) => ({ ...s, lastName: e.target.value }))}
                placeholder="Soyad"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Telefon *"
                value={editUserForm.phone}
                onChange={(e) => setEditUserForm((s) => ({ ...s, phone: e.target.value }))}
                placeholder="05XX XXX XX XX"
              />
              <Input
                label="E-posta"
                type="email"
                value={editUserForm.email}
                onChange={(e) => setEditUserForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="ornek@email.com"
              />
            </div>
            <Input
              label="T.C. Kimlik No"
              value={editUserForm.identityNumber}
              onChange={(e) => setEditUserForm((s) => ({ ...s, identityNumber: e.target.value }))}
              placeholder="Opsiyonel"
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditUserOpen(false)
                setUserBeingEdited(null)
              }}
              disabled={updateUserDetailsMutation.isPending}
            >
              İptal
            </Button>
            <Button
              variant="primary"
              onClick={submitEditUser}
              disabled={updateUserDetailsMutation.isPending || !userBeingEdited}
              loading={updateUserDetailsMutation.isPending}
            >
              Kaydet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Role Modal */}
      <Modal open={editRoleOpen} onOpenChange={setEditRoleOpen}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Rol Düzenle</ModalTitle>
            <ModalDescription>Kullanicinin rolunu guncelleyin</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedUser && (
              <div className="text-[13px] text-surface-600 p-3 rounded-lg bg-surface-50 border border-surface-200">
                {selectedUser.firstName} {selectedUser.lastName} ({selectedUser.email})
              </div>
            )}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-surface-700">Yeni Rol *</label>
              <Select value={roleToEdit} onValueChange={(v) => setRoleToEdit(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
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
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditRoleOpen(false)} disabled={updateRoleMutation.isPending}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitRoleUpdate} disabled={updateRoleMutation.isPending} loading={updateRoleMutation.isPending}>
              Kaydet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Rol değişimi onayı */}
      <Modal
        open={roleChangeConfirmOpen}
        onOpenChange={(open) => {
          setRoleChangeConfirmOpen(open)
          if (!open) setPendingRoleChange(null)
        }}
      >
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Rol değişikliği onayı</ModalTitle>
            <ModalDescription>
              Rol değişikliği, kullanıcının eski rolüne ait verilerin silinmesine neden olabilir (örn: diyetisyen → uzman).
              Devam etmek istiyor musunuz?
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            {selectedUser && pendingRoleChange && (
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-3 text-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-surface-500">Kullanıcı</span>
                  <span className="font-medium text-surface-800">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-surface-500">Mevcut rol</span>
                  <span className="font-medium text-surface-800">{USER_ROLE_LABELS[pendingRoleChange.from]}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-surface-500">Yeni rol</span>
                  <span className="font-medium text-surface-800">{USER_ROLE_LABELS[pendingRoleChange.to]}</span>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRoleChangeConfirmOpen(false)
                setPendingRoleChange(null)
                setEditRoleOpen(true)
              }}
              disabled={updateRoleMutation.isPending}
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!pendingRoleChange) return
                updateRoleMutation.mutate({ id: pendingRoleChange.id, role: pendingRoleChange.to })
                setRoleChangeConfirmOpen(false)
                setPendingRoleChange(null)
              }}
              disabled={!pendingRoleChange || updateRoleMutation.isPending}
              loading={updateRoleMutation.isPending}
            >
              Onayla ve değiştir
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Kullanıcı detay modalı — API'deki tüm alanlar */}
      <Modal open={profileOpen} onOpenChange={setProfileOpen}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Kullanıcı Detayı</ModalTitle>
            <ModalDescription>Seçilen kullanıcının bilgileri</ModalDescription>
          </ModalHeader>
          {profileUser && (
            <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
                <Avatar name={`${profileUser.firstName} ${profileUser.lastName}`} size="lg" />
                <div>
                  <p className="font-semibold text-surface-900">
                    {profileUser.firstName} {profileUser.lastName}
                  </p>
                  <p className="text-[13px] text-surface-500">{profileUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-[11px] mb-1">Ad</p>
                  <p className="font-medium text-surface-800">{profileUser.firstName}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-[11px] mb-1">Soyad</p>
                  <p className="font-medium text-surface-800">{profileUser.lastName}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-[11px] mb-1">Telefon</p>
                  <p className="font-medium text-surface-800">{profileUser.phone || '-'}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-[11px] mb-1">E-posta</p>
                  <p className="font-medium text-surface-800">{profileUser.email}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-[11px] mb-1">Rol</p>
                  <p className="font-medium text-surface-800">{USER_ROLE_LABELS[profileUser.role]}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-[11px] mb-1">Onay</p>
                  <p className="font-medium text-surface-800">{profileUser.isVerified === true ? 'Onaylı' : profileUser.isVerified === false ? 'Beklemede' : '-'}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-[11px] mb-1">Oluşturulma</p>
                  <p className="font-medium text-surface-800">{formatDate(profileUser.createdAt)}</p>
                </div>
                <div className="rounded-lg border border-surface-200 p-3">
                  <p className="text-surface-500 text-[11px] mb-1">Güncellenme</p>
                  <p className="font-medium text-surface-800">{formatDate(profileUser.updatedAt)}</p>
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
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  currentUserId,
  onApprove,
  onDelete,
  onActivate,
  onEditRole,
  onEditUser,
  onViewProfile,
  isLoading,
}: {
  users: User[]
  totalItems: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  currentUserId?: string
  onApprove: (u: User) => void
  onDelete: (u: User) => void
  onActivate: (id: string) => void
  onEditRole: (u: User) => void
  onEditUser: (u: User) => void
  onViewProfile: (u: User) => void
  isLoading?: boolean
}) {
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
              users.map((user) => (
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
                        <DropdownMenuItem onClick={() => onEditUser(user)}>
                          <Pencil className="h-4 w-4 mr-2" /> Bilgileri Düzenle
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
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  )
}
