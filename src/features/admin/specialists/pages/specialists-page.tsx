import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Input, Avatar,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
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
import { UserRole, UserStatus } from '@/utils/constants'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/api-error'
import { TablePagination } from '@/components/shared/table-pagination'
import {
  createUser,
  updateUser,
  deleteUser,
} from '@/services/users.service'
import { getExpertProfilesWithPagination } from '@/services/experts.service'
import { getExpertProfileById, type Expert, type ExpertProfileListItem } from '@/services/experts.service'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

const EXPERTS_QUERY_KEY = ['users', { role: 'expert' }] as const

const statusLabels: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'Aktif',
  [UserStatus.PENDING]: 'Onay Bekliyor',
  [UserStatus.SUSPENDED]: 'Askiya Alindi',
}

const expertTaskStatusLabels: Record<NonNullable<Expert['status']>, string> = {
  pending: 'Beklemede',
  in_progress: 'İnceleniyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

function SpecialistsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedRow, setSelectedRow] = useState<ExpertProfileListItem | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const trimmedSearch = useMemo(() => search.trim(), [search])

  const usersQuery = useQuery({
    queryKey: [...EXPERTS_QUERY_KEY, { page, pageSize, search: trimmedSearch }],
    queryFn: () =>
      getExpertProfilesWithPagination({
        page,
        limit: pageSize,
        search: trimmedSearch || undefined,
      }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const rows: ExpertProfileListItem[] = useMemo(() => usersQuery.data?.items ?? [], [usersQuery.data?.items])
  const totalItems = usersQuery.data?.totalItems ?? rows.length
  const totalPages = usersQuery.data?.totalPages ?? 1
  const effectivePage = useMemo(() => Math.min(Math.max(1, page), totalPages), [page, totalPages])

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    gender: 'male' as 'male' | 'female',
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

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPERTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Uzman başarıyla oluşturuldu')
      setNewOpen(false)
      resetForm()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Uzman oluşturulamadı' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateUser>[1] }) =>
      updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPERTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Uzman güncellendi')
      setEditOpen(false)
      setSelectedRow(null)
      resetForm()
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Güncelleme başarısız' }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPERTS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Uzman silindi')
      setDeleteOpen(false)
      setSelectedRow(null)
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Silme işlemi başarısız' }))
    },
  })

  const openView = (row: ExpertProfileListItem) => {
    setSelectedRow(row)
    setViewOpen(true)
  }
  const openEdit = (row: ExpertProfileListItem) => {
    setSelectedRow(row)
    setForm({
      firstName: row.user.firstName ?? '',
      lastName: row.user.lastName ?? '',
      companyName: row.user.companyName ?? '',
      email: row.user.email ?? '',
      phone: row.user.phone ?? '',
      gender: (row.user.gender as 'male' | 'female') ?? 'male',
    })
    setEditOpen(true)
  }
  const openDelete = (row: ExpertProfileListItem) => {
    setSelectedRow(row)
    setDeleteOpen(true)
  }

  const expertDetailQuery = useQuery({
    queryKey: ['experts', 'profile-detail', selectedRow?.expertProfileId],
    queryFn: () => getExpertProfileById(selectedRow?.expertProfileId ?? ''),
    enabled: viewOpen && selectedRow?.expertProfileId != null,
    retry: 1,
  })

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
      role: UserRole.SPECIALIST,
      gender: form.gender,
    })
  }

  const submitEdit = () => {
    if (!selectedRow) return
    updateMutation.mutate({
      id: selectedRow.user.id,
      payload: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim(),
        companyName: form.companyName.trim() || undefined,
      },
    })
  }

  const submitDelete = () => {
    if (!selectedRow) return
    deleteMutation.mutate(selectedRow.user.id)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
            <div>
              <h3 className="text-[15px] font-semibold text-surface-900">Uzmanlar</h3>
              <p className="text-[12px] mt-0.5 text-surface-500">
                {usersQuery.isLoading ? 'Yükleniyor...' : `Kayıtlı uzmanlar (${totalItems} adet)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Uzman ara..."
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
                Yeni Uzman
              </Button>
            </div>
          </div>

          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : usersQuery.isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-surface-700">Liste yüklenirken hata oluştu.</p>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: EXPERTS_QUERY_KEY })}>
                Tekrar Dene
              </Button>
            </div>
          ) : (
            <SpecialistsTable
              specialists={rows}
              totalItems={totalItems}
              page={effectivePage}
              pageSize={pageSize}
              onPageChange={(p) => setPage(Math.min(Math.max(1, p), totalPages))}
              onPageSizeChange={(next) => { setPageSize(next); setPage(1) }}
              onView={openView}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          )}
        </div>
      </motion.div>

      {/* Görüntüle */}
      <Modal
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open)
          if (!open) {
            setSelectedRow(null)
          }
        }}
      >
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Uzman Detayı</ModalTitle>
            <ModalDescription>
              {selectedRow ? `${selectedRow.user.firstName} ${selectedRow.user.lastName}` : ''}
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {selectedRow && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
                  <Avatar name={`${selectedRow.user.firstName} ${selectedRow.user.lastName}`} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-surface-900">
                      {selectedRow.user.firstName} {selectedRow.user.lastName}
                    </p>
                    <p className="text-sm text-surface-500 mt-0.5">{selectedRow.user.email || '-'}</p>
                    <Badge
                      variant={selectedRow.user.status === UserStatus.ACTIVE ? 'success' : selectedRow.user.status === UserStatus.PENDING ? 'warning' : 'danger'}
                      className="mt-2"
                    >
                      {statusLabels[selectedRow.user.status ?? UserStatus.ACTIVE]}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div className="rounded-lg border border-surface-200 p-3">
                    <p className="text-surface-500 text-[11px] mb-1">Telefon</p>
                    <p className="font-medium text-surface-800">{selectedRow.user.phone || '-'}</p>
                  </div>
                  <div className="rounded-lg border border-surface-200 p-3">
                    <p className="text-surface-500 text-[11px] mb-1">Kayıt tarihi</p>
                    <p className="font-medium text-surface-800">{formatDate(selectedRow.user.createdAt)}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-surface-200 p-3">
                  <p className="text-[12px] font-semibold text-surface-800 mb-2">Uzman İş (Expert) Detayı</p>
                  {expertDetailQuery.isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-surface-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Yükleniyor...
                    </div>
                  ) : expertDetailQuery.isError ? (
                    <div className="space-y-2">
                      <p className="text-sm text-surface-600">Detay yüklenemedi.</p>
                      <Button variant="outline" size="sm" onClick={() => expertDetailQuery.refetch()}>
                        Tekrar Dene
                      </Button>
                    </div>
                  ) : expertDetailQuery.data ? (
                    <div className="grid grid-cols-2 gap-3 text-[13px]">
                      <div className="rounded-lg border border-surface-200 p-3">
                        <p className="text-surface-500 text-[11px] mb-1">Barkod</p>
                        <p className="font-medium text-surface-800 font-mono">
                          {expertDetailQuery.data.expertTasks[0]?.kitBarcode ?? '-'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-surface-200 p-3">
                        <p className="text-surface-500 text-[11px] mb-1">Durum</p>
                        <p className="font-medium text-surface-800">
                          {expertDetailQuery.data.expertTasks[0]?.status
                            ? expertTaskStatusLabels[expertDetailQuery.data.expertTasks[0]!.status!]
                            : '-'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-surface-200 p-3 col-span-2">
                        <p className="text-surface-500 text-[11px] mb-1">Sonuç</p>
                        <p className="font-medium text-surface-800">
                          {expertDetailQuery.data.expertTasks[0]?.resultMediaUrl
                            ? expertDetailQuery.data.expertTasks[0]!.resultMediaUrl
                            : '-'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-surface-600">Bu uzmana atanmış expert işi bulunmuyor.</p>
                  )}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>Kapat</Button>
            {selectedRow && (
              <Button variant="primary" onClick={() => { setViewOpen(false); openEdit(selectedRow) }}>
                Düzenle
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Yeni Uzman */}
      <Modal open={newOpen} onOpenChange={setNewOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Yeni Uzman Ekle</ModalTitle>
            <ModalDescription>Yeni uzmanı aktif olarak oluşturun.</ModalDescription>
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
              Oluşturulan hesap uzman (expert) rolü ile kaydedilir.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setNewOpen(false); resetForm() }} disabled={createMutation.isPending}>
              İptal
            </Button>
            <Button variant="primary" onClick={submitNew} disabled={createMutation.isPending} loading={createMutation.isPending}>
              Uzman Oluştur
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Düzenle */}
      <Modal open={editOpen} onOpenChange={setEditOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Uzman Düzenle</ModalTitle>
            <ModalDescription>{selectedRow && `${selectedRow.user.firstName} ${selectedRow.user.lastName}`}</ModalDescription>
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
            <Input
              label="Kurum Adı"
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
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setSelectedRow(null) }} disabled={updateMutation.isPending}>
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
            <ModalTitle>Uzman Sil</ModalTitle>
            <ModalDescription>
              {selectedRow && `"${selectedRow.user.firstName} ${selectedRow.user.lastName}" kullanıcısını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
            </ModalDescription>
          </ModalHeader>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setDeleteOpen(false); setSelectedRow(null) }} disabled={deleteMutation.isPending}>
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

function SpecialistsTable({
  specialists,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
}: {
  specialists: ExpertProfileListItem[]
  totalItems: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onView: (row: ExpertProfileListItem) => void
  onEdit: (row: ExpertProfileListItem) => void
  onDelete: (row: ExpertProfileListItem) => void
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
            {specialists.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-[12px] text-surface-500">
                  Uzman bulunamadı.
                </td>
              </tr>
            ) : (
              specialists.map((row) => {
                const u = row.user
                return (
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
                      variant={u.status === UserStatus.ACTIVE ? 'success' : u.status === UserStatus.PENDING ? 'warning' : 'danger'}
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
                        <DropdownMenuItem onClick={() => onView(row)}>
                          <Eye className="h-4 w-4 mr-2" /> Görüntüle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(row)}>
                          <Edit className="h-4 w-4 mr-2" /> Düzenle
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-danger" onClick={() => onDelete(row)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Sil
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
                )
              })
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

export default SpecialistsPage
