import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Input, Avatar,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Badge,
} from '@/components/ui'
import { formatDate } from '@/lib/utils'
import {
  Search, Plus, MoreHorizontal, Edit, Trash2, Mail, Phone,
  Loader2, Eye,
} from 'lucide-react'
import { motion } from 'framer-motion'
import type { User } from '@/types/user.types'
import { UserRole, UserStatus } from '@/utils/constants'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { TablePagination } from '@/components/shared/table-pagination'
import { getUsersWithPagination, createUser, updateUser, deleteUser } from '@/services/users.service'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

const USERS_QUERY_KEY = ['users'] as const

const statusLabels: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Aktif',
  [UserStatus.PENDING]: 'Onay Bekliyor',
  [UserStatus.SUSPENDED]: 'Askiya Alindi',
}

function DietitiansPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [newOpen, setNewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selected, setSelected] = useState<User | null>(null)

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    gender: 'male' as 'male' | 'female',
  })

  const trimmedSearch = useMemo(() => search.trim(), [search])
  const dietitiansQuery = useQuery({
    queryKey: [...USERS_QUERY_KEY, 'dietitians', { page, pageSize, search: trimmedSearch }],
    queryFn: () =>
      getUsersWithPagination({
        page,
        limit: pageSize,
        role: UserRole.DIETITIAN,
        search: trimmedSearch || undefined,
        isVerified: true,
      }),
    retry: 1,
    placeholderData: keepPreviousData,
  })

  const dietitians = dietitiansQuery.data?.items ?? []
  const totalItems = dietitiansQuery.data?.totalItems ?? dietitians.length
  const isLoading = dietitiansQuery.isLoading
  const isError = dietitiansQuery.isError

  useEffect(() => {
    const safeSize = Math.max(1, pageSize)
    const totalPages = Math.max(1, Math.ceil(totalItems / safeSize))
    const next = Math.min(Math.max(1, page), totalPages)
    if (next !== page) setPage(next)
  }, [totalItems, page, pageSize])

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      toast.success('Diyetisyen başarıyla oluşturuldu')
      setNewOpen(false)
      resetForm()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Diyetisyen oluşturulamadı' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateUser>[1] }) =>
      updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      toast.success('Diyetisyen güncellendi')
      setEditOpen(false)
      setSelected(null)
      resetForm()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Güncelleme başarısız' }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      toast.success('Diyetisyen silindi')
      setDeleteOpen(false)
      setSelected(null)
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Silme işlemi başarısız' }))
    },
  })

  const resetForm = () => {
    setForm({
      firstName: '',
      lastName: '',
      companyName: '',
      email: '',
      phone: '',
      gender: 'male',
    })
  }

  const openView = (user: User) => {
    setSelected(user)
    setViewOpen(true)
  }
  const openEdit = (user: User) => {
    setSelected(user)
    setForm({
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      companyName: user.companyName ?? '',
      email: user.email ?? '',
      phone: user.phone ?? '',
      gender: (user.gender as 'male' | 'female') ?? 'male',
    })
    setEditOpen(true)
  }
  const openDelete = (user: User) => {
    setSelected(user)
    setDeleteOpen(true)
  }

  const submitNew = () => {
    if (!form.phone.trim() || !form.companyName.trim()) {
      toast.error('Kurum adı ve telefon zorunludur')
      return
    }
    createMutation.mutate({
      firstName: form.firstName.trim() || undefined,
      lastName: form.lastName.trim() || undefined,
      companyName: form.companyName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim(),
      role: UserRole.DIETITIAN,
      gender: form.gender,
    })
  }

  const submitEdit = () => {
    if (!selected) return
    updateMutation.mutate({
      id: selected.id,
      payload: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim(),
      },
    })
  }

  const submitDelete = () => {
    if (!selected) return
    deleteMutation.mutate(selected.id)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
            <div>
              <h3 className="text-[15px] font-semibold text-surface-900">Diyetisyenler</h3>
              <p className="text-[12px] mt-0.5 text-surface-500">
                {isLoading ? 'Yükleniyor...' : `Kayıtlı diyetisyenler (${totalItems} adet)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Diyetisyen ara..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
                />
              </div>
              <Button variant="primary" size="sm" onClick={() => { resetForm(); setNewOpen(true) }}>
                <Plus className="h-4 w-4" />
                Yeni Diyetisyen
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-surface-700">Liste yüklenirken hata oluştu.</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })}>
                Tekrar Dene
              </Button>
            </div>
          ) : (
            <DietitiansTable
              dietitians={dietitians}
              totalItems={totalItems}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next)
                setPage(1)
              }}
              onView={openView}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          )}
        </div>
      </motion.div>

      {/* Görüntüle */}
      <Modal open={viewOpen} onOpenChange={setViewOpen}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Diyetisyen Detayı</ModalTitle>
            <ModalDescription>
              {selected ? `${selected.firstName} ${selected.lastName}` : ''}
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
                  <Avatar
                    name={`${selected.firstName} ${selected.lastName}`}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-surface-900">
                      {selected.firstName} {selected.lastName}
                    </p>
                    <p className="text-sm text-surface-500 mt-0.5">{selected.email || '-'}</p>
                    <Badge
                      variant={selected.status === UserStatus.ACTIVE ? 'success' : selected.status === UserStatus.PENDING ? 'warning' : 'danger'}
                      className="mt-2"
                    >
                      {statusLabels[selected.status ?? UserStatus.ACTIVE]}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-surface-700">
                    <Phone className="h-4 w-4 text-surface-400 shrink-0" />
                    <span>{selected.phone || '-'}</span>
                  </div>
                  <p className="text-xs text-surface-500">
                    Kayıt tarihi: {formatDate(selected.createdAt)}
                  </p>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Kapat</Button>
            {selected && (
              <Button variant="primary" onClick={() => { setViewOpen(false); openEdit(selected) }}>
                Düzenle
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Yeni Diyetisyen */}
      <Modal open={newOpen} onOpenChange={setNewOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Yeni Diyetisyen Ekle</ModalTitle>
            <ModalDescription>Yeni diyetisyeni aktif olarak oluşturun.</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="form-section-title">Kişisel Bilgiler</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ad"
                value={form.firstName}
                onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
                placeholder="Ad"
              />
              <Input
                label="Soyad"
                value={form.lastName}
                onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
                placeholder="Soyad"
              />
            </div>
            <Input
              label="Kurum Adı *"
              value={form.companyName}
              onChange={(e) => setForm((s) => ({ ...s, companyName: e.target.value }))}
              placeholder="Kurum adı"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Telefon *"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                placeholder="05XX XXX XX XX"
              />
              <Input
                label="E-posta *"
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="ornek@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-surface-700">Cinsiyet</label>
              <Select value={form.gender} onValueChange={(v) => setForm((s) => ({ ...s, gender: v as 'male' | 'female' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Erkek</SelectItem>
                  <SelectItem value="female">Kadın</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-surface-500 pt-2">
              Oluşturulan hesap diyetisyen rolü ile kaydedilir.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setNewOpen(false); resetForm() }} disabled={createMutation.isPending}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitNew} disabled={createMutation.isPending} loading={createMutation.isPending}>
              Diyetisyen Oluştur
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Düzenle */}
      <Modal open={editOpen} onOpenChange={setEditOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Diyetisyen Düzenle</ModalTitle>
            <ModalDescription>{selected && `${selected.firstName} ${selected.lastName}`}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="form-section-title">Kişisel Bilgiler</p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ad *"
                value={form.firstName}
                onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))}
                placeholder="Ad"
              />
              <Input
                label="Soyad *"
                value={form.lastName}
                onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))}
                placeholder="Soyad"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Telefon *"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                placeholder="05XX XXX XX XX"
              />
              <Input
                label="E-posta *"
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="ornek@email.com"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setSelected(null) }} disabled={updateMutation.isPending}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitEdit} disabled={updateMutation.isPending} loading={updateMutation.isPending}>
              Kaydet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Sil */}
      <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Diyetisyen Sil</ModalTitle>
            <ModalDescription>
              {selected && `"${selected.firstName} ${selected.lastName}" kullanıcısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setSelected(null) }} disabled={deleteMutation.isPending}>
              İptal
            </Button>
            <Button variant="destructive" onClick={submitDelete} disabled={deleteMutation.isPending} loading={deleteMutation.isPending}>
              <Trash2 className="h-4 w-4" />
              Sil
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

function DietitiansTable({
  dietitians,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
}: {
  dietitians: User[]
  totalItems: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onView: (u: User) => void
  onEdit: (u: User) => void
  onDelete: (u: User) => void
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Ad Soyad</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Kurum</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">E-posta</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Telefon</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Oluşturulma</th>
              <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20 text-surface-500" />
            </tr>
          </thead>
          <tbody>
            {dietitians.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[12px] text-surface-500">
                  Diyetisyen bulunamadı.
                </td>
              </tr>
            ) : (
              dietitians.map((u) => (
                <tr
                  key={u.id}
                  className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={`${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '-'} size="sm" className="shrink-0" />
                      <span className="text-[12px] font-medium text-surface-700">
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] text-surface-700 truncate max-w-[180px] block" title={u.companyName ?? ''}>
                      {u.companyName || '-'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-[12px] text-surface-700">
                      <Mail className="h-3.5 w-3.5 text-surface-400 shrink-0" />
                      <span className="truncate">{u.email || '-'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-[12px] text-surface-700">
                      <Phone className="h-3.5 w-3.5 text-surface-400 shrink-0" />
                      <span>{u.phone || '-'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge
                      variant={
                        u.status === UserStatus.ACTIVE ? 'success' :
                        u.status === UserStatus.PENDING ? 'warning' : 'danger'
                      }
                    >
                      {statusLabels[u.status ?? UserStatus.ACTIVE]}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-surface-500">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-5 py-3.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(u)}>
                          <Eye className="h-4 w-4 mr-2" /> Görüntüle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(u)}>
                          <Edit className="h-4 w-4 mr-2" /> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-danger" onClick={() => onDelete(u)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Sil
                        </DropdownMenuItem>
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

export default DietitiansPage
