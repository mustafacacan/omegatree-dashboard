import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Input,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Switch,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { Plus, Pencil, Search, Trash2, MoreHorizontal, Loader2, Package } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  getSalesKits,
  createSalesKit,
  updateSalesKit,
  deleteSalesKit,
  getSalesKitImageUrl,
  type SalesKit,
} from '@/services/sales-kits.service'
import { SalesKitImage } from '@/components/shared/sales-kit-image'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { TablePagination } from '@/components/shared/table-pagination'

const SALES_KITS_QUERY_KEY = ['sales-kits'] as const

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function PricingPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [createOpen, setCreateOpen] = useState(false)
  const [editKit, setEditKit] = useState<SalesKit | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formQuantity, setFormQuantity] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formFilePreview, setFormFilePreview] = useState<string | null>(null)
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set())

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteKit, setDeleteKit] = useState<SalesKit | null>(null)

  const { data: apiList = [], isLoading } = useQuery<SalesKit[]>({
    queryKey: SALES_KITS_QUERY_KEY,
    queryFn: getSalesKits,
  })

  const createMutation = useMutation<
    SalesKit,
    { response?: { data?: { message?: string } } },
    Parameters<typeof createSalesKit>[0]
  >({
    mutationFn: createSalesKit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_KITS_QUERY_KEY })
      setCreateOpen(false)
      resetForm()
      toast.success('Satış kiti oluşturuldu')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Oluşturulamadı' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof updateSalesKit>[1] }) =>
      updateSalesKit(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_KITS_QUERY_KEY })
      setEditKit(null)
      resetForm()
      toast.success('Satış kiti güncellendi')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Güncellenemedi' }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSalesKit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_KITS_QUERY_KEY })
      setDeleteOpen(false)
      setDeleteKit(null)
      toast.success('Satış kiti silindi')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Silinemedi' }))
    },
  })

  useEffect(() => {
    setFailedImageIds(new Set())
  }, [apiList])

  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return apiList
    return apiList.filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        (k.description?.toLowerCase().includes(q)) ||
        String(k.id).includes(q)
    )
  }, [apiList, searchQuery])

  const paginatedList = useMemo(
    () => filteredList.slice((page - 1) * pageSize, page * pageSize),
    [filteredList, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [filteredList.length])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredList.length, page, pageSize])

  function resetForm() {
    setFormName('')
    setFormDescription('')
    setFormQuantity('')
    setFormPrice('')
    setFormIsActive(true)
    setFormFile(null)
    setFormFilePreview(null)
  }

  const openCreate = () => {
    resetForm()
    setCreateOpen(true)
  }

  /** API response imageData.url veya filename üzerinden CDN adresi */
  const getDisplayImageUrl = (kit: SalesKit) =>
    getSalesKitImageUrl(kit.imageData?.url, kit.imageData?.file)

  const openEdit = (kit: SalesKit) => {
    setEditKit(kit)
    setFormName(kit.name)
    setFormDescription(kit.description ?? '')
    setFormQuantity(String(kit.quantity))
    setFormPrice(String(kit.price))
    setFormIsActive(kit.isActive ?? true)
    setFormFile(null)
    setFormFilePreview(getDisplayImageUrl(kit))
  }

  const openDelete = (kit: SalesKit) => {
    setDeleteKit(kit)
    setDeleteOpen(true)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormFile(file)
      setFormFilePreview(URL.createObjectURL(file))
    } else {
      setFormFile(null)
      setFormFilePreview(null)
    }
  }

  const handleCreate = () => {
    const name = formName.trim()
    const quantity = Math.floor(Number(formQuantity))
    const price = Number(formPrice)
    if (!name) {
      toast.error('Ad girin')
      return
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error('Geçerli miktar girin')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Geçerli fiyat girin')
      return
    }
    createMutation.mutate({
      name,
      description: formDescription.trim() || undefined,
      quantity,
      price,
      file: formFile ?? undefined,
    })
  }

  const handleUpdate = () => {
    if (!editKit) return
    const name = formName.trim()
    const quantity = Math.floor(Number(formQuantity))
    const price = Number(formPrice)
    if (!name) {
      toast.error('Ad girin')
      return
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error('Geçerli miktar girin')
      return
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error('Geçerli fiyat girin')
      return
    }
    updateMutation.mutate({
      id: editKit.id,
      payload: {
        name,
        description: formDescription.trim() || undefined,
        quantity,
        price,
        isActive: formIsActive,
        file: formFile ?? undefined,
      },
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
            <div>
              <h3 className="text-[15px] font-semibold text-surface-900">
                Fiyatlandırma — Satış kitleri
              </h3>
              <p className="text-[12px] mt-0.5 text-surface-500">
                Kayıtlı satış kitleri ({filteredList.length} adet)
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Ad veya açıklama ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
                />
              </div>
              <Button variant="primary" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Yeni satış kiti
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kit</TableHead>
                  <TableHead className="hidden md:table-cell">Miktar</TableHead>
                  <TableHead>Fiyat</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                      <p className="text-[12px] text-surface-500">
                        Satış kitleri yükleniyor...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : filteredList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-5 py-12 text-center text-[12px] text-surface-500">
                      {apiList.length === 0
                        ? 'Henüz satış kiti yok. "Yeni satış kiti" ile ekleyin.'
                        : 'Arama kriterine uygun kayıt bulunamadı.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedList.map((k) => {
                    const imageUrl = getDisplayImageUrl(k)
                    const showImg = imageUrl && !failedImageIds.has(k.id)
                    const isActive = k.isActive ?? true
                    return (
                      <TableRow key={k.id}>
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-0">
                            {showImg && imageUrl ? (
                              <div
                                className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-surface-200 bg-surface-100 shadow-sm dark:border-surface-600 dark:bg-surface-800/70"
                                title={k.name}
                              >
                                <SalesKitImage
                                  url={imageUrl}
                                  alt={k.name}
                                  className="h-full w-full object-cover object-center"
                                  onError={() =>
                                    setFailedImageIds((prev) => new Set(prev).add(k.id))
                                  }
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-surface-300 bg-surface-50 dark:border-surface-600 dark:bg-surface-800/40">
                                <Package className="h-4.5 w-4.5 text-primary-600" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium truncate text-surface-700" title={k.name}>
                                {k.name}
                              </p>
                              <p className="text-[11px] truncate text-surface-500" title={k.description || ''}>
                                {k.description || 'Açıklama yok'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-200 dark:bg-surface-300/50 text-surface-700">
                            {k.quantity} adet
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[12px] font-semibold tabular-nums text-surface-900">
                            {formatCurrency(k.price)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              isActive ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {isActive ? 'Aktif' : 'Pasif'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(k)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Düzenle
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-danger"
                                onClick={() => openDelete(k)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Sil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!isLoading && filteredList.length > 0 && (
            <TablePagination
              totalItems={filteredList.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(next) => {
                setPageSize(next)
                setPage(1)
              }}
            />
          )}
        </div>
      </motion.div>

      {/* Create Modal */}
      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Yeni Satış Kiti</ModalTitle>
            <ModalDescription>Ad, açıklama, miktar, fiyat ve isteğe bağlı görsel girin</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="form-section-title">Temel Bilgiler</p>
            <Input
              label="Ad *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Örn: Standart Paket"
            />
            <Input
              label="Açıklama / Avantajlar"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Kısa açıklama veya avantajlar (isteğe bağlı)"
            />
            
            <div className="panel-section">
              <p className="form-section-title">Fiyat ve Stok</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Miktar (stok adedi) *"
                  type="number"
                  min={0}
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="100"
                />
                <Input
                  label="Fiyat (₺) *"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="49.99"
                />
              </div>
            </div>

            <div className="panel-section">
              <label className="text-[13px] font-medium text-surface-700 block mb-2">Görsel (isteğe bağlı)</label>
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="block w-full text-sm text-surface-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-surface-100 file:text-surface-700"
              />
              {formFilePreview && (
                <div className="mt-2 flex items-center justify-center rounded-lg border border-surface-200 bg-surface-50 min-h-[200px] max-h-[320px] p-2">
                  <img
                    src={formFilePreview}
                    alt="Önizleme"
                    className="max-h-[280px] w-auto object-contain rounded"
                  />
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
              İptal
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={createMutation.isPending} loading={createMutation.isPending}>
              Oluştur
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteKit(null)
        }}
        title="Satış kitini sil"
        description={
          deleteKit
            ? `"${deleteKit.name}" satış kitini silmek istiyor musunuz? Bu işlem geri alınamaz.`
            : 'Bu satış kitini silmek istiyor musunuz?'
        }
        confirmLabel="Sil"
        cancelLabel="İptal"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteKit) return
          deleteMutation.mutate(deleteKit.id)
        }}
      />

      {/* Edit Modal */}
      <Modal open={!!editKit} onOpenChange={(open) => !open && setEditKit(null)}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>Satış Kitini Düzenle</ModalTitle>
            <ModalDescription>Ad, açıklama, miktar, fiyat ve isteğe bağlı yeni görsel</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="form-section-title">Temel Bilgiler</p>
            <Input
              label="Ad *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Örn: Standart Paket"
            />
            <Input
              label="Açıklama / Avantajlar"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Kısa açıklama (isteğe bağlı)"
            />
            
            <div className="panel-section">
              <p className="form-section-title">Durum</p>
              <div className="flex items-center justify-between rounded-xl border border-surface-200 bg-surface-50/50 px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-surface-800">Aktif</p>
                  <p className="text-[11px] text-surface-500">Pasif kitler listelerde gösterilmeyebilir.</p>
                </div>
                <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
              </div>
            </div>

            <div className="panel-section">
              <p className="form-section-title">Fiyat ve Stok</p>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Miktar (stok adedi) *"
                  type="number"
                  min={0}
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="100"
                />
                <Input
                  label="Fiyat (₺) *"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="49.99"
                />
              </div>
            </div>

            <div className="panel-section">
              <label className="text-[13px] font-medium text-surface-700 block mb-2">Görsel</label>
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="block w-full text-sm text-surface-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-surface-100 file:text-surface-700"
              />
              {formFilePreview && (
                <div className="mt-2 flex items-center justify-center rounded-lg border border-surface-200 bg-surface-50 min-h-[200px] max-h-[320px] p-2">
                  {formFilePreview.startsWith('blob:') ? (
                    <img
                      src={formFilePreview}
                      alt="Yeni görsel önizleme"
                      className="max-h-[280px] w-auto object-contain rounded"
                    />
                  ) : (
                    <SalesKitImage
                      url={formFilePreview}
                      alt={editKit?.name ?? 'Görsel'}
                      className="max-h-[280px] w-auto object-contain rounded"
                    />
                  )}
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditKit(null)} disabled={updateMutation.isPending}>
              İptal
            </Button>
            <Button variant="primary" onClick={handleUpdate} disabled={updateMutation.isPending} loading={updateMutation.isPending}>
              Kaydet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
