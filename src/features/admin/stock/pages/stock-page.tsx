import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui'
import { TablePagination } from '@/components/shared/table-pagination'
import { formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Boxes, Search, ArrowRightLeft, AlertTriangle,
  TrendingUp, TrendingDown, X, Check,
  User, Send, CheckCircle, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getStocks, type Stock, type StockStatus } from '@/services/stocks.service'
import { getDieticians, assignKitsToDietician, type DieticianOption } from '@/services/kits.service'

const W = {
  olive: '#8B9A4B', oliveLight: '#EEF2DE',
  orange: '#E8913A', orangeLight: '#FDF0E2',
  amber: '#F5C842', amberLight: '#FDF8E8',
  green: '#6ABF69', greenLight: '#E8F5E8',
  cream: '#F9F7F3', creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE', dark: '#2D2A26',
  text: '#4A4640', textLight: '#9C968D', warmGrayLight: '#B5AFA5',
}

const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  available: 'Stokta',
  used: 'Kullanıldı',
  expired: 'Süresi geçmiş',
  approval_pending: 'Onay bekliyor',
}

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function StockPage() {
  const [stockList, setStockList] = useState<Stock[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignModalStocks, setAssignModalStocks] = useState<Stock[]>([])
  const [assignModalLoading, setAssignModalLoading] = useState(false)
  const [dietitiansList, setDietitiansList] = useState<DieticianOption[]>([])
  const [assignKitSearch, setAssignKitSearch] = useState('')
  const [assignDietitianSearch, setAssignDietitianSearch] = useState('')
  const [selectedKitIds, setSelectedKitIds] = useState<number[]>([])
  const [selectedDietitianId, setSelectedDietitianId] = useState<number | null>(null)
  const [assignSuccess, setAssignSuccess] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  /** Query'de gönderilecek dietitian.user.id (userId); null = tümü (admin stoğu) */
  const [filterUserId, setFilterUserId] = useState<number | null>(null)
  const [dietitiansForFilter, setDietitiansForFilter] = useState<DieticianOption[]>([])

  const availableStocksForModal = useMemo(
    () => assignModalStocks.filter((s) => s.status === 'available' && s.kitId?.id),
    [assignModalStocks]
  )

  const filteredAvailableStocksForModal = useMemo(() => {
    const q = assignKitSearch.trim().toLowerCase()
    if (!q) return availableStocksForModal
    return availableStocksForModal.filter((s) => {
      const barcode = s.kitId?.barcode ?? ''
      const name = s.kitId?.name ?? ''
      return barcode.toLowerCase().includes(q) || name.toLowerCase().includes(q)
    })
  }, [availableStocksForModal, assignKitSearch])

  const filteredDietitiansForModal = useMemo(() => {
    const q = assignDietitianSearch.trim().toLowerCase()
    if (!q) return dietitiansList
    return dietitiansList.filter((d) => d.label.toLowerCase().includes(q))
  }, [dietitiansList, assignDietitianSearch])

  /** Sayfa filtresi için diyetisyen listesi */
  const filteredDietitiansForFilter = dietitiansForFilter

  const dietitianInitials = (d: DieticianOption) => {
    const initialsFromName = [d.firstName?.[0], d.lastName?.[0]].filter(Boolean).join('')
    if (initialsFromName) return initialsFromName.toUpperCase()

    return (d.label || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  const fetchStocks = () => {
    setLoading(true)
    getStocks({
      page,
      limit: pageSize,
      search: searchQuery || undefined,
      sort: 'desc',
      user: filterUserId ?? undefined,
    })
      .then((res) => {
        setStockList(res.data)
        setTotalItems(res.totalItems)
      })
      .catch(() => setStockList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getStocks({
      page,
      limit: pageSize,
      search: searchQuery || undefined,
      sort: 'desc',
      user: filterUserId ?? undefined,
    })
      .then((res) => {
        if (!cancelled) {
          setStockList(res.data)
          setTotalItems(res.totalItems)
        }
      })
      .catch(() => {
        if (!cancelled) setStockList([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [page, pageSize, searchQuery, filterUserId])

  useEffect(() => {
    getDieticians()
      .then(setDietitiansForFilter)
      .catch(() => setDietitiansForFilter([]))
  }, [])

  useEffect(() => {
    if (!showAssignModal) return
    setAssignModalLoading(true)
    setAssignModalStocks([])
    setDietitiansList([])
    setAssignKitSearch('')
    setAssignDietitianSearch('')
    Promise.all([
      getStocks({ page: 1, limit: 200, sort: 'desc' }),
      getDieticians(),
    ])
      .then(([stocksRes, dieticians]) => {
        setAssignModalStocks(stocksRes.data)
        setDietitiansList(dieticians)
      })
      .catch(() => {
        setAssignModalStocks([])
        setDietitiansList([])
      })
      .finally(() => setAssignModalLoading(false))
  }, [showAssignModal])

  const filteredStock = useMemo(() => {
    return stockList.filter((s) => {
      const matchStatus = statusFilter === 'all' || s.status === statusFilter
      return matchStatus
    })
  }, [stockList, statusFilter])
  const tableRows = filteredStock

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, filterUserId])

  const stats = useMemo(() => ({
    inStock: stockList.filter((s) => s.status === 'available').length,
    assigned: stockList.filter((s) => s.status === 'used').length,
    inProcess: stockList.filter((s) => s.status === 'approval_pending').length,
    damaged: stockList.filter((s) => s.status === 'expired').length,
  }), [stockList])

  const toggleKitSelect = (kitId: number) => {
    setSelectedKitIds((prev) =>
      prev.includes(kitId) ? prev.filter((id) => id !== kitId) : [...prev, kitId]
    )
  }

  const handleAssign = () => {
    if (selectedKitIds.length === 0) return

    if (selectedDietitianId == null) {
      toast.error('Lütfen bir diyetisyen seçin.')
      return
    }
    setAssigning(true)
    assignKitsToDietician(selectedDietitianId, selectedKitIds)
      .then(() => {
        setAssignSuccess(true)
        fetchStocks()
        toast.success(`${selectedKitIds.length} kit diyetisyene zimmetlendi.`)
        setTimeout(() => {
          setAssignSuccess(false)
          setShowAssignModal(false)
          setSelectedKitIds([])
          setSelectedDietitianId(null)
        }, 2000)
      })
      .catch((err: { response?: { data?: { message?: string } }; message?: string }) => {
        toast.error(getApiErrorMessage(err, { fallback: 'Zimmetleme yapılamadı.' }))
      })
      .finally(() => setAssigning(false))
  }

  const closeAssignModal = () => {
    setShowAssignModal(false)
    setSelectedKitIds([])
    setSelectedDietitianId(null)
    setAssignSuccess(false)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader />

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Ana Stok', value: stats.inStock, icon: Package, iconColor: W.olive, iconBg: W.oliveLight, change: 4 },
          { title: 'Zimmetli', value: stats.assigned, icon: Send, iconColor: W.orange, iconBg: W.orangeLight, change: 2 },
          { title: 'Surecte', value: stats.inProcess, icon: Boxes, iconColor: W.amber, iconBg: W.amberLight, change: 1 },
          { title: 'Hasarli', value: stats.damaged, icon: AlertTriangle, iconColor: '#D97070', iconBg: '#FDE8E8', change: -1 },
        ].map((s, i) => {
          const Icon = s.icon
          const up = s.change >= 0
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
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: up ? W.greenLight : '#FDE8E8', color: up ? '#3D8B3D' : '#C53030' }}>
                        {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {up ? '+' : ''}{s.change}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ═══ INFO BANNER ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: W.oliveLight, border: '1px solid #D6DFC0' }}>
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#C8D6A0' }}>
            <Send className="h-4 w-4" style={{ color: '#5A6B2A' }} />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-semibold" style={{ color: '#5A6B2A' }}>Stok takibi</p>
            <p className="text-[11px]" style={{ color: '#7A8A4A' }}>
              Varsayılan olarak <strong>sizin stokunuzdaki (admin) tüm kitler</strong> listelenir. Diyetisyen seçerek <strong>hangi diyetisyende hangi kitlerin</strong> olduğunu görebilirsiniz. Kit zimmetlendiginde diyetisyen fiziksel teslimatta barkod ile kiti stoguna ekler.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ═══ KIT INVENTORY TABLE ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Kit Envanter</h3>
              <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>
                {filterUserId != null
                  ? `${dietitiansForFilter.find((d) => (d.userId ?? d.id) === filterUserId)?.label ?? 'Diyetisyen'} – bu diyetisyene zimmetli kitler (${totalItems} kit)`
                  : `Sizin stokunuzdaki tüm kitler (${totalItems} kit)`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: W.warmGrayLight }} />
                <input
                  type="text"
                  placeholder="Barkod ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}`, color: W.dark }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = W.olive }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = W.warmBorder }}
                />
              </div>
              <Select
                value={filterUserId === null ? 'all' : String(filterUserId)}
                onValueChange={(v) => setFilterUserId(v === 'all' ? null : parseInt(v, 10))}
              >
                <SelectTrigger className="min-w-[11rem]">
                  <SelectValue placeholder="Diyetisyen seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Benim stokum (tüm kitler)</SelectItem>
                  {filteredDietitiansForFilter.map((d) => {
                    const valueId = d.userId ?? d.id
                    return (
                      <SelectItem key={d.id} value={String(valueId)}>
                        {d.label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="min-w-[10rem]">
                  <SelectValue placeholder="Tum Durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Durumlar</SelectItem>
                  <SelectItem value="available">Stokta</SelectItem>
                  <SelectItem value="used">Kullanıldı</SelectItem>
                  <SelectItem value="expired">Süresi geçmiş</SelectItem>
                  <SelectItem value="approval_pending">Onay bekliyor</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="primary" size="sm" onClick={() => setShowAssignModal(true)}>
                <ArrowRightLeft className="h-4 w-4" />
                Kit Zimmetle
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: W.cream }}>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Barkod</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Kit Adı</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Durum</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Konum / Zimmet</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: W.olive }} />
                      <p className="text-[12px]" style={{ color: W.textLight }}>Stok listesi yükleniyor...</p>
                    </td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[12px]" style={{ color: W.textLight }}>
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((s) => (
                    <tr
                      key={s.id}
                      className="transition-colors"
                      style={{ borderBottom: `1px solid ${W.warmBorder}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = W.cream }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-5 py-3.5">
                        <code className="text-[13px] font-mono font-bold" style={{ color: W.dark }}>{s.kitId?.barcode ?? '—'}</code>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px]" style={{ color: W.text }}>{s.kitId?.name ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
                          style={{
                            background: s.status === 'available' ? W.oliveLight : s.status === 'used' ? W.orangeLight : s.status === 'expired' ? '#FDE8E8' : W.amberLight,
                            color: s.status === 'available' ? '#5A6B2A' : s.status === 'used' ? W.orange : s.status === 'expired' ? '#C53030' : '#78600A',
                          }}
                        >
                          {s.status ? STOCK_STATUS_LABELS[s.status] : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px]" style={{ color: W.text }}>
                          {s.userId ? (
                            <span className="flex items-center gap-1.5">
                              <User className="h-3 w-3" style={{ color: W.olive }} />
                              {[s.userId.firstName, s.userId.lastName].filter(Boolean).join(' ') || `#${s.userId.id}`}
                            </span>
                          ) : (
                            '—'
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px]" style={{ color: W.textLight }}>{formatDate(s.createdAt)}</span>
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
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
          />
        </div>
      </motion.div>

      {/* ═══ ASSIGN MODAL ═══ */}
      <AnimatePresence>
        {showAssignModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(45,42,38,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={closeAssignModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg rounded-2xl overflow-hidden shadow-xl"
              style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
                <div>
                  <h2 className="text-[17px] font-bold" style={{ color: W.dark }}>Kit Zimmetle</h2>
                  <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>
                    Kitleri secin ve bir diyetisyene atanyin
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeAssignModal}
                  className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: W.cream, color: W.text }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = W.creamDark }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = W.cream }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {assignSuccess ? (
                <div className="p-10 text-center">
                  <div className="h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: W.greenLight }}>
                    <CheckCircle className="h-8 w-8" style={{ color: W.green }} />
                  </div>
                  <h3 className="text-[16px] font-bold" style={{ color: W.dark }}>Zimmetleme Basarili!</h3>
                  <p className="text-[13px] mt-2" style={{ color: W.textLight }}>
                    {selectedKitIds.length} kit seçilen diyetisyene zimmetlendi.
                    Diyetisyen kiti teslim aldiginda barkod numarasini girerek stoguna ekleyecek.
                  </p>
                </div>
              ) : (
                <>
                  {/* Step 1: Select Kits */}
                  <div className="p-5" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: W.olive }}>1</div>
                      <span className="text-[13px] font-semibold" style={{ color: W.dark }}>Kit Secin</span>
                      {selectedKitIds.length > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: W.oliveLight, color: W.olive }}>
                          {selectedKitIds.length} seçildi
                        </span>
                      )}
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: W.warmGrayLight }} />
                      <input
                        type="text"
                        placeholder="Kit ara (barkod / isim)..."
                        value={assignKitSearch}
                        onChange={(e) => setAssignKitSearch(e.target.value)}
                        className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-full outline-none transition-colors"
                        style={{ background: W.cream, border: `1px solid ${W.warmBorder}`, color: W.dark }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = W.olive }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = W.warmBorder }}
                      />
                    </div>

                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                      {assignModalLoading ? (
                        <p className="text-[12px] text-center py-4" style={{ color: W.textLight }}>Yükleniyor...</p>
                      ) : filteredAvailableStocksForModal.length === 0 ? (
                        <p className="text-[12px] text-center py-4" style={{ color: W.textLight }}>Stokta uygun kit bulunmuyor</p>
                      ) : (
                        filteredAvailableStocksForModal.map((s) => {
                          const kitId = s.kitId?.id ?? 0
                          const selected = selectedKitIds.includes(kitId)
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleKitSelect(kitId)}
                              className="flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all"
                              style={{
                                background: selected ? W.oliveLight : W.cream,
                                border: `1.5px solid ${selected ? W.olive : 'transparent'}`,
                              }}
                            >
                              <div
                                className="h-5 w-5 rounded-md flex items-center justify-center shrink-0 transition-colors"
                                style={{
                                  background: selected ? W.olive : '#fff',
                                  border: `1.5px solid ${selected ? W.olive : W.warmBorder}`,
                                }}
                              >
                                {selected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <code className="text-[12px] font-mono font-bold" style={{ color: W.dark }}>{s.kitId?.barcode ?? '—'}</code>
                                {s.kitId?.name && <span className="text-[10px] block mt-0.5" style={{ color: W.textLight }}>{s.kitId.name}</span>}
                              </div>
                              <span className="text-[10px]" style={{ color: W.textLight }}>{formatDate(s.createdAt)}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Step 2: Select Dietitian */}
                  <div className="p-5" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: selectedKitIds.length > 0 ? W.olive : W.warmGrayLight }}>2</div>
                      <span className="text-[13px] font-semibold" style={{ color: W.dark }}>Diyetisyen seçin</span>
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: W.warmGrayLight }} />
                      <input
                        type="text"
                        placeholder="Diyetisyen ara..."
                        value={assignDietitianSearch}
                        onChange={(e) => setAssignDietitianSearch(e.target.value)}
                        className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-full outline-none transition-colors"
                        style={{ background: W.cream, border: `1px solid ${W.warmBorder}`, color: W.dark }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = W.orange }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = W.warmBorder }}
                      />
                    </div>

                    <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                      {assignModalLoading ? (
                        <p className="text-[12px] text-center py-4" style={{ color: W.textLight }}>Yükleniyor...</p>
                      ) : filteredDietitiansForModal.length === 0 ? (
                        <p className="text-[12px] text-center py-4" style={{ color: W.textLight }}>Diyetisyen bulunamadı</p>
                      ) : (
                        filteredDietitiansForModal.map((d) => {
                          const sel = selectedDietitianId === d.id
                          const fullName = [d.firstName, d.lastName].filter(Boolean).join(' ')
                          const primaryText = fullName || d.label
                          const secondaryText = d.email || `#${d.id}`
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => setSelectedDietitianId(sel ? null : d.id)}
                              className="flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all"
                              style={{
                                background: sel ? W.orangeLight : W.cream,
                                border: `1.5px solid ${sel ? W.orange : 'transparent'}`,
                              }}
                            >
                              <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold" style={{ background: sel ? W.orange : W.creamDark, color: sel ? '#fff' : W.text }}>
                                {dietitianInitials(d)}
                              </div>
                              <div className="flex-1">
                                <p className="text-[12px] font-semibold" style={{ color: W.dark }}>{primaryText}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: W.textLight }}>{secondaryText}</p>
                              </div>
                              {sel && <Check className="h-4 w-4" style={{ color: W.orange }} />}
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-5 flex items-center justify-between">
                    <p className="text-[11px]" style={{ color: W.textLight }}>
                      Zimmetlenen kitler diyetisyene gosterilmez. Fiziksel teslimat sonrasi barkod ile eslestirme yapilir.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleAssign}
                      disabled={selectedKitIds.length === 0 || assigning}
                    >
                      {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Zimmetle ({selectedKitIds.length})
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
