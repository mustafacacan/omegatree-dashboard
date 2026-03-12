import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Input,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { TablePagination } from '@/components/shared/table-pagination'
import { formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { motion } from 'framer-motion'
import { Factory, Barcode, Package, Plus, Copy, Check, Pencil, Printer, Search, MoreHorizontal, Loader2 } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { toast } from 'sonner'
import {
  getKitsPaginated,
  createKit,
  updateKit,
  type Kit,
} from '@/services/kits.service'

const KITS_QUERY_KEY = ['kits'] as const

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function ProductionCenterPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const [createKitOpen, setCreateKitOpen] = useState(false)
  const [editKit, setEditKit] = useState<Kit | null>(null)
  const [newKitName, setNewKitName] = useState('')
  const [newKitActive, setNewKitActive] = useState(true)
  const [editKitName, setEditKitName] = useState('')
  const [editKitActive, setEditKitActive] = useState(true)

  const { data: kitsResult, isLoading: kitsLoading } = useQuery({
    queryKey: [...KITS_QUERY_KEY, page, pageSize],
    queryFn: () => getKitsPaginated({ page, limit: pageSize }),
  })
  const apiKits = kitsResult?.items ?? []
  const totalKitsFromApi = kitsResult?.totalItems ?? 0
  const createKitMutation = useMutation({
    mutationFn: (payload: { name: string; isActive: boolean }) => createKit(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KITS_QUERY_KEY })
      setCreateKitOpen(false)
      setNewKitName('')
      setNewKitActive(true)
      toast.success('Kit oluşturuldu')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Kit oluşturulamadı' }))
    },
  })
  const updateKitMutation = useMutation({
    mutationFn: ({ id, name, isActive }: { id: number; name: string; isActive: boolean }) =>
      updateKit(id, { name, isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KITS_QUERY_KEY })
      setEditKit(null)
      toast.success('Kit güncellendi')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Güncellenemedi' }))
    },
  })
  const filteredKits = useMemo(() => {
    let list = apiKits
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (k) =>
          k.name.toLowerCase().includes(q) ||
          (k.barcode && k.barcode.toLowerCase().includes(q)) ||
          String(k.id).includes(q)
      )
    }
    if (statusFilter === 'active') list = list.filter((k) => k.isActive)
    if (statusFilter === 'inactive') list = list.filter((k) => !k.isActive)
    const sorted = [...list].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })
    return sorted
  }, [apiKits, searchQuery, statusFilter, sortOrder])

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, sortOrder])

  const handleCopyBarcode = async (barcode: string, kitId: number) => {
    if (!barcode) return
    try {
      await navigator.clipboard.writeText(barcode)
      setCopiedId(kitId)
      setTimeout(() => setCopiedId(null), 2000)
      toast.success('Barkod kopyalandı')
    } catch {
      toast.error('Kopyalama başarısız')
    }
  }

  const handlePrintBarcode = (kit: Kit) => {
    const barcode = kit.barcode
    if (!barcode || !barcode.trim()) {
      toast.error('Bu kitin barkodu yok, yazdırılamaz')
      return
    }
    try {
      const canvas = document.createElement('canvas')
      JsBarcode(canvas, barcode.trim(), {
        format: 'CODE128',
        width: 2,
        height: 56,
        displayValue: false,
        margin: 4,
      })
      const dataUrl = canvas.toDataURL('image/png')
      const printWindow = window.open('', '_blank', 'width=400,height=280')
      if (!printWindow) {
        toast.error('Açılır pencere engellendi. Lütfen yazıcı izinlerini kontrol edin.')
        return
      }
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Barkod - ${kit.name}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: system-ui, sans-serif;
                padding: 16px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
              }
              .label {
                border: 1px solid #333;
                padding: 12px 16px;
                text-align: center;
                min-width: 280px;
              }
              .kit-name { font-size: 14px; font-weight: 600; margin-bottom: 8px; word-break: break-word; }
              .barcode-img { max-width: 100%; height: auto; }
              .barcode-num { font-size: 12px; font-family: monospace; letter-spacing: 1px; margin-top: 4px; }
              @media print {
                body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .label { border: 1px solid #000; }
              }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="kit-name">${kit.name}</div>
              <img class="barcode-img" src="${dataUrl}" alt="Barkod" />
              <div class="barcode-num">${barcode}</div>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.addEventListener('afterprint', () => printWindow.close())
      }, 250)
      toast.success('Yazdırma penceresi açıldı')
    } catch (err) {
      console.error(err)
      toast.error('Barkod yazdırılamadı')
    }
  }

  const openEditKit = (kit: Kit) => {
    setEditKit(kit)
    setEditKitName(kit.name)
    setEditKitActive(kit.isActive)
  }
  const handleCreateKit = () => {
    const name = newKitName.trim()
    if (!name) {
      toast.error('Kit adı girin')
      return
    }
    createKitMutation.mutate({ name, isActive: newKitActive })
  }
  const handleUpdateKit = () => {
    if (!editKit) return
    const name = editKitName.trim()
    if (!name) {
      toast.error('Kit adı girin')
      return
    }
    updateKitMutation.mutate({ id: editKit.id, name, isActive: editKitActive })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader />

      {/* Kitler tablosu */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
            <div>
              <h3 className="text-[15px] font-semibold text-surface-900">Kitler</h3>
              <p className="text-[12px] mt-0.5 text-surface-500">Üretim merkezi kit tanımları ({totalKitsFromApi} kit)</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Barkod, ad veya ID ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="min-w-[10rem]">
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'newest' | 'oldest')}>
                <SelectTrigger className="min-w-[10rem]">
                  <SelectValue placeholder="Sıra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">En yeni</SelectItem>
                  <SelectItem value="oldest">Eski</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="primary" size="sm" onClick={() => { setNewKitName(''); setNewKitActive(true); setCreateKitOpen(true) }}>
                <Plus className="h-4 w-4" />
                Yeni Kit
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">ID</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Barkod</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Ad</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Oluşturulma</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20 text-surface-500" />
                </tr>
              </thead>
              <tbody>
                {kitsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                      <p className="text-[12px] text-surface-500">Kit listesi yükleniyor...</p>
                    </td>
                  </tr>
                ) : filteredKits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[12px] text-surface-500">
                      {apiKits.length === 0 ? 'Henüz kit yok. Yeni Kit ile ekleyin.' : 'Arama veya filtreye uygun kit bulunamadı.'}
                    </td>
                  </tr>
                ) : (
                  filteredKits.map((k) => (
                    <tr
                      key={k.id}
                      className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40"
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] font-mono text-surface-700">{k.id}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <code className="text-[13px] font-mono font-bold text-surface-900">{k.barcode || '—'}</code>
                          {k.barcode && (
                            <button
                              type="button"
                              onClick={() => handleCopyBarcode(k.barcode, k.id)}
                              className="p-1 rounded transition-colors text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-300"
                            >
                              {copiedId === k.id ? <Check className="h-3.5 w-3.5 text-primary-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] text-surface-700">{k.name}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] text-surface-500">{formatDate(k.createdAt)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            k.isActive ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300' : 'bg-surface-200 dark:bg-surface-300/50 text-surface-500'
                          }`}
                        >
                          {k.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {k.barcode && (
                              <DropdownMenuItem onClick={() => handlePrintBarcode(k)}>
                                <Printer className="h-4 w-4 mr-2" /> Barkod yazdır
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEditKit(k)}>
                              <Pencil className="h-4 w-4 mr-2" /> Düzenle
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
            totalItems={totalKitsFromApi}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
          />
        </div>
      </motion.div>

      {/* Create Kit Modal */}
      <Modal open={createKitOpen} onOpenChange={setCreateKitOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Yeni Kit</ModalTitle>
            <ModalDescription>Yeni bir kit tanımı oluşturun</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Kit adı"
              value={newKitName}
              onChange={(e) => setNewKitName(e.target.value)}
              placeholder="Örn: Standart Omega-3 Kiti"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="newKitActive"
                checked={newKitActive}
                onChange={(e) => setNewKitActive(e.target.checked)}
                className="h-4 w-4 rounded border-surface-300"
              />
              <label htmlFor="newKitActive" className="text-sm text-surface-700">Aktif</label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setCreateKitOpen(false)}>İptal</Button>
            <Button variant="primary" onClick={handleCreateKit} disabled={createKitMutation.isPending}>
              Oluştur
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Kit Modal */}
      <Modal open={!!editKit} onOpenChange={(open) => !open && setEditKit(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Kiti Düzenle</ModalTitle>
            <ModalDescription>Kit adı ve durumunu güncelleyin</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Kit adı"
              value={editKitName}
              onChange={(e) => setEditKitName(e.target.value)}
              placeholder="Örn: Standart Omega-3 Kiti"
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editKitActive"
                checked={editKitActive}
                onChange={(e) => setEditKitActive(e.target.checked)}
                className="h-4 w-4 rounded border-surface-300"
              />
              <label htmlFor="editKitActive" className="text-sm text-surface-700">Aktif</label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditKit(null)}>İptal</Button>
            <Button variant="primary" onClick={handleUpdateKit} disabled={updateKitMutation.isPending}>
              Kaydet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
