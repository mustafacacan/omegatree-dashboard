import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { StatCard } from '@/components/shared/stat-card'
import { TablePagination } from '@/components/shared/table-pagination'
import { formatDate } from '@/lib/utils'
import { Factory, Barcode, Package, Plus, Copy, Check, Pencil, Printer, Search, MoreHorizontal, Filter, ArrowDownUp } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import toast from 'react-hot-toast'
import {
  getKits,
  createKit,
  updateKit,
  type Kit,
} from '@/services/kits.service'

const KITS_QUERY_KEY = ['kits'] as const

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

  const { data: apiKits = [], isLoading: kitsLoading } = useQuery({
    queryKey: KITS_QUERY_KEY,
    queryFn: () => getKits({ page: 1, limit: 200 }),
  })
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
      toast.error(err?.response?.data?.message ?? 'Kit oluşturulamadı')
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
      toast.error(err?.response?.data?.message ?? 'Güncellenemedi')
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

  const paginatedKits = useMemo(
    () => filteredKits.slice((page - 1) * pageSize, page * pageSize),
    [filteredKits, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, sortOrder])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredKits.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredKits.length, page, pageSize])

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

  const kitsThisMonth = useMemo(
    () =>
      apiKits.filter((k) => new Date(k.createdAt).getMonth() === new Date().getMonth()).length,
    [apiKits]
  )

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
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Toplam Kit" value={String(apiKits.length)} icon={Package} color="primary" />
        <StatCard title="Aktif" value={String(apiKits.filter((k) => k.isActive).length)} icon={Barcode} color="sky" />
        <StatCard title="Pasif" value={String(apiKits.filter((k) => !k.isActive).length)} icon={Package} color="amber" />
        <StatCard title="Bu Ay Eklenen" value={String(kitsThisMonth)} icon={Factory} color="violet" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Kitler</CardTitle>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Barkod, ad veya ID ara..."
                leftIcon={<Search className="h-4 w-4" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44">
                  <Filter className="h-4 w-4 mr-2 text-surface-400" />
                  <SelectValue placeholder="Durum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Pasif</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'newest' | 'oldest')}>
                <SelectTrigger className="w-44">
                  <ArrowDownUp className="h-4 w-4 mr-2 text-surface-400" />
                  <SelectValue placeholder="Sıra" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">En yeni</SelectItem>
                  <SelectItem value="oldest">Eski</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="primary" onClick={() => { setNewKitName(''); setNewKitActive(true); setCreateKitOpen(true) }}>
                <Plus className="h-4 w-4" />
                Yeni Kit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Barkod</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Oluşturulma</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {kitsLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-surface-500">
                    Yükleniyor...
                  </TableCell>
                </TableRow>
              )}
              {!kitsLoading && filteredKits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-surface-500">
                    {apiKits.length === 0
                      ? 'Henüz kit yok. Yeni Kit ile ekleyin.'
                      : 'Arama veya filtreye uygun kit bulunamadı.'}
                  </TableCell>
                </TableRow>
              )}
              {!kitsLoading && paginatedKits.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-mono text-sm">{k.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-surface-800 bg-surface-50 px-2 py-1 rounded-lg">
                            {k.barcode || '—'}
                          </code>
                          {k.barcode && (
                            <button
                              onClick={() => handleCopyBarcode(k.barcode, k.id)}
                              className="p-1 rounded hover:bg-surface-100 transition-colors"
                            >
                              {copiedId === k.id ? (
                                <Check className="h-3.5 w-3.5 text-primary-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-surface-400" />
                              )}
                            </button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-surface-800">{k.name}</TableCell>
                      <TableCell className="text-sm text-surface-500">{formatDate(k.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={k.isActive ? 'success' : 'outline'} dot>
                          {k.isActive ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                totalItems={filteredKits.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                  setPageSize(next)
                  setPage(1)
                }}
              />
        </CardContent>
      </Card>

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
