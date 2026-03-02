import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Badge,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Search, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  getSalesKits,
  createSalesKit,
  updateSalesKit,
  getSalesKitImageUrl,
  type SalesKit,
} from '@/services/sales-kits.service'

const SALES_KITS_QUERY_KEY = ['sales-kits'] as const

export function PricingPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')

  const [createOpen, setCreateOpen] = useState(false)
  const [editKit, setEditKit] = useState<SalesKit | null>(null)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formQuantity, setFormQuantity] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formFile, setFormFile] = useState<File | null>(null)
  const [formFilePreview, setFormFilePreview] = useState<string | null>(null)
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set())

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
      toast.error(err?.response?.data?.message ?? 'Oluşturulamadı')
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
      toast.error(err?.response?.data?.message ?? 'Güncellenemedi')
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

  function resetForm() {
    setFormName('')
    setFormDescription('')
    setFormQuantity('')
    setFormPrice('')
    setFormFile(null)
    setFormFilePreview(null)
  }

  const openCreate = () => {
    resetForm()
    setCreateOpen(true)
  }

  const openEdit = (kit: SalesKit) => {
    setEditKit(kit)
    setFormName(kit.name)
    setFormDescription(kit.description ?? '')
    setFormQuantity(String(kit.quantity))
    setFormPrice(String(kit.price))
    setFormFile(null)
    setFormFilePreview(getSalesKitImageUrl(kit.imageData?.url) ?? null)
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
        file: formFile ?? undefined,
      },
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Fiyatlandırma — Satış kitleri</CardTitle>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Ad veya açıklama ara..."
                leftIcon={<Search className="h-4 w-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Button variant="primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Yeni satış kiti
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="py-16 text-center text-sm text-surface-500">
              Yükleniyor...
            </div>
          )}
          {!isLoading && filteredList.length === 0 && (
            <div className="py-16 text-center text-sm text-surface-500 rounded-xl border border-dashed border-surface-200 bg-surface-50/50">
              {apiList.length === 0
                ? 'Henüz satış kiti yok. "Yeni satış kiti" ile ekleyin.'
                : 'Arama kriterine uygun kayıt yok.'}
            </div>
          )}
          {!isLoading && filteredList.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredList.map((k) => {
                const imageUrl = getSalesKitImageUrl(k.imageData?.url)
                const showImg = imageUrl && !failedImageIds.has(k.id)
                return (
                  <div
                    key={k.id}
                    className="rounded-xl border border-surface-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                  >
                    <div className="aspect-[4/3] bg-surface-100 relative overflow-hidden">
                      {showImg ? (
                        <img
                          src={imageUrl ?? ''}
                          alt={k.name}
                          className="w-full h-full object-cover"
                          onError={() => setFailedImageIds((prev) => new Set(prev).add(k.id))}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-14 w-14 text-surface-300" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant="outline" className="bg-white/90 backdrop-blur">
                          {k.quantity} adet
                        </Badge>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-surface-800 truncate" title={k.name}>
                        {k.name}
                      </h3>
                      <p className="text-sm text-surface-500 mt-1 line-clamp-2 min-h-[2.5rem]" title={k.description || ''}>
                        {k.description || 'Açıklama yok'}
                      </p>
                      <div className="mt-3 pt-3 border-t border-surface-100 flex items-center justify-between gap-2">
                        <span className="font-bold text-lg text-surface-800 tabular-nums">
                          {formatCurrency(k.price)}
                        </span>
                        <Button variant="outline" size="sm" onClick={() => openEdit(k)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Düzenle
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Yeni satış kiti</ModalTitle>
            <ModalDescription>Ad, açıklama, miktar, fiyat ve isteğe bağlı görsel girin</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Ad"
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
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Miktar (stok adedi)"
                type="number"
                min={0}
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                placeholder="100"
              />
              <Input
                label="Fiyat (₺)"
                type="number"
                min={0}
                step={0.01}
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="49.99"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-2">Görsel (isteğe bağlı)</label>
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="block w-full text-sm text-surface-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-surface-100 file:text-surface-700"
              />
              {formFilePreview && (
                <img
                  src={formFilePreview}
                  alt="Önizleme"
                  className="mt-2 h-24 rounded-lg object-cover border border-surface-200"
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>İptal</Button>
            <Button variant="primary" onClick={handleCreate} disabled={createMutation.isPending}>
              Oluştur
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editKit} onOpenChange={(open) => !open && setEditKit(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Satış kitini düzenle</ModalTitle>
            <ModalDescription>Ad, açıklama, miktar, fiyat ve isteğe bağlı yeni görsel</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Ad"
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
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Miktar (stok adedi)"
                type="number"
                min={0}
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                placeholder="100"
              />
              <Input
                label="Fiyat (₺)"
                type="number"
                min={0}
                step={0.01}
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="49.99"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-2">Görsel</label>
              <input
                type="file"
                accept="image/*"
                onChange={onFileChange}
                className="block w-full text-sm text-surface-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-surface-100 file:text-surface-700"
              />
              {formFilePreview && (
                <img
                  src={formFilePreview}
                  alt="Önizleme"
                  className="mt-2 h-24 rounded-lg object-cover border border-surface-200"
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditKit(null)}>İptal</Button>
            <Button variant="primary" onClick={handleUpdate} disabled={updateMutation.isPending}>
              Kaydet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
