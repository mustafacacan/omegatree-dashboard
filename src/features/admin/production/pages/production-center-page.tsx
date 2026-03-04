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
import { Factory, Barcode, Package, Plus, Copy, Check, Pencil, Printer, Search, MoreHorizontal, Loader2, TrendingUp } from 'lucide-react'
import JsBarcode from 'jsbarcode'
import { toast } from 'sonner'
import {
  getKits,
  createKit,
  updateKit,
  type Kit,
} from '@/services/kits.service'

const KITS_QUERY_KEY = ['kits'] as const

const W = {
  olive: '#8B9A4B', oliveLight: '#EEF2DE',
  orange: '#E8913A', orangeLight: '#FDF0E2',
  amber: '#F5C842', amberLight: '#FDF8E8',
  green: '#6ABF69', greenLight: '#E8F5E8',
  cream: '#F9F7F3', creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE', dark: '#2D2A26',
  text: '#4A4640', textLight: '#9C968D', warmGrayLight: '#B5AFA5',
}

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
    <div className="space-y-5 animate-fade-in">
      <PageHeader />

      {/* Stat cards - stok sayfası ile aynı stil */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Toplam Kit', value: apiKits.length, icon: Package, iconColor: W.olive, iconBg: W.oliveLight },
          { title: 'Aktif', value: apiKits.filter((k) => k.isActive).length, icon: Barcode, iconColor: W.orange, iconBg: W.orangeLight },
          { title: 'Pasif', value: apiKits.filter((k) => !k.isActive).length, icon: Package, iconColor: W.amber, iconBg: W.amberLight },
          { title: 'Bu Ay Eklenen', value: kitsThisMonth, icon: Factory, iconColor: '#7C5CBF', iconBg: '#EDE8F5' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <div className="rounded-2xl p-5 transition-shadow hover:shadow-md" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                    <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: W.textLight }}>{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-bold" style={{ color: W.dark }}>{s.value}</span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: W.greenLight, color: '#3D8B3D' }}>
                        <TrendingUp className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Kitler tablosu - stok takibi ile aynı yazı tipi / şekil */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Kitler</h3>
              <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>Üretim merkezi kit tanımları ({filteredKits.length} kit)</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: W.warmGrayLight }} />
                <input
                  type="text"
                  placeholder="Barkod, ad veya ID ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}`, color: W.dark }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = W.olive }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = W.warmBorder }}
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
            <table className="w-full">
              <thead>
                <tr style={{ background: W.cream }}>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>ID</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Barkod</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Ad</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Oluşturulma</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Durum</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20" style={{ color: W.textLight }} />
                </tr>
              </thead>
              <tbody>
                {kitsLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: W.olive }} />
                      <p className="text-[12px]" style={{ color: W.textLight }}>Kit listesi yükleniyor...</p>
                    </td>
                  </tr>
                ) : paginatedKits.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[12px]" style={{ color: W.textLight }}>
                      {apiKits.length === 0 ? 'Henüz kit yok. Yeni Kit ile ekleyin.' : 'Arama veya filtreye uygun kit bulunamadı.'}
                    </td>
                  </tr>
                ) : (
                  paginatedKits.map((k) => (
                    <tr
                      key={k.id}
                      className="transition-colors"
                      style={{ borderBottom: `1px solid ${W.warmBorder}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = W.cream }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] font-mono" style={{ color: W.text }}>{k.id}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <code className="text-[13px] font-mono font-bold" style={{ color: W.dark }}>{k.barcode || '—'}</code>
                          {k.barcode && (
                            <button
                              type="button"
                              onClick={() => handleCopyBarcode(k.barcode, k.id)}
                              className="p-1 rounded transition-colors"
                              style={{ color: W.warmGrayLight }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = W.creamDark }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                            >
                              {copiedId === k.id ? <Check className="h-3.5 w-3.5" style={{ color: W.olive }} /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px]" style={{ color: W.text }}>{k.name}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px]" style={{ color: W.textLight }}>{formatDate(k.createdAt)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
                          style={{
                            background: k.isActive ? W.oliveLight : W.creamDark,
                            color: k.isActive ? '#5A6B2A' : W.textLight,
                          }}
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
            totalItems={filteredKits.length}
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
