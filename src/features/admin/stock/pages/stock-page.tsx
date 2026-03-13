import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { TablePagination } from '@/components/shared/table-pagination'
import { formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { motion } from 'framer-motion'
import {
  Search, ArrowRightLeft, Check,
  User, Send, CheckCircle, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getStocks, type Stock, type StockStatus } from '@/services/stocks.service'
import { getDieticians, assignKitsToDietician, type DieticianOption } from '@/services/kits.service'

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

      {/* Kit envanter tablosu */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
            <div>
              <h3 className="text-[15px] font-semibold text-surface-900">Kit Envanter</h3>
              <p className="text-[12px] mt-0.5 text-surface-500">
                {filterUserId != null
                  ? `${dietitiansForFilter.find((d) => (d.userId ?? d.id) === filterUserId)?.label ?? 'Diyetisyen'} – bu diyetisyene zimmetli kitler (${totalItems} kit)`
                  : `Sizin stokunuzdaki tüm kitler (${totalItems} kit)`}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Barkod ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
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
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Barkod</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Kit Adı</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Konum / Zimmet</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                      <p className="text-[12px] text-surface-500">Stok listesi yükleniyor...</p>
                    </td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-[12px] text-surface-500">
                      Kayıt bulunamadı.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((s) => (
                    <tr
                      key={s.id}
                      className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40"
                    >
                      <td className="px-5 py-3.5">
                        <code className="text-[13px] font-mono font-bold text-surface-900">{s.kitId?.barcode ?? '—'}</code>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] text-surface-700">{s.kitId?.name ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                            s.status === 'available'
                              ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                              : s.status === 'used'
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                : s.status === 'expired'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                          }`}
                        >
                          {s.status ? STOCK_STATUS_LABELS[s.status] : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] text-surface-700">
                          {s.userId ? (
                            <span className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-primary-500" />
                              {[s.userId.firstName, s.userId.lastName].filter(Boolean).join(' ') || `#${s.userId.id}`}
                            </span>
                          ) : (
                            '—'
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] text-surface-500">{formatDate(s.createdAt)}</span>
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

      {/* Kit Zimmetle modalı */}
      <Modal open={showAssignModal} onOpenChange={(open) => !open && closeAssignModal()}>
        <ModalContent className="max-w-lg max-h-[90vh] flex flex-col">
          <ModalHeader>
            <ModalTitle>Kit Zimmetle</ModalTitle>
            <ModalDescription>Kitleri seçin ve bir diyetisyene atayın.</ModalDescription>
          </ModalHeader>

          {assignSuccess ? (
            <ModalBody className="py-10 text-center">
              <div className="h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-[16px] font-bold text-surface-900">Zimmetleme Başarılı!</h3>
              <p className="text-[13px] mt-2 text-surface-500">
                {selectedKitIds.length} kit seçilen diyetisyene zimmetlendi.
                Diyetisyen kiti teslim aldığında barkod numarası ile stokuna ekleyecek.
              </p>
            </ModalBody>
          ) : (
            <>
              <ModalBody className="space-y-5 pt-0">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-primary-500">1</div>
                    <span className="text-[13px] font-semibold text-surface-900">Kit seçin</span>
                      {selectedKitIds.length > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                          {selectedKitIds.length} seçildi
                        </span>
                      )}
                    </div>

                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                      <input
                        type="text"
                        placeholder="Kit ara (barkod / isim)..."
                        value={assignKitSearch}
                        onChange={(e) => setAssignKitSearch(e.target.value)}
                        className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-full outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
                      />
                    </div>

                    <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-surface-200 bg-surface-50/50">
                      {assignModalLoading ? (
                        <p className="text-[12px] text-center py-4 text-surface-500">Yükleniyor...</p>
                      ) : filteredAvailableStocksForModal.length === 0 ? (
                        <p className="text-[12px] text-center py-4 text-surface-500">Stokta uygun kit bulunmuyor</p>
                      ) : (
                        filteredAvailableStocksForModal.map((s) => {
                          const kitId = s.kitId?.id ?? 0
                          const selected = selectedKitIds.includes(kitId)
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleKitSelect(kitId)}
                              className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all ${
                                selected ? 'bg-primary-100 dark:bg-primary-900/40 border border-primary-500' : 'bg-surface-50 dark:bg-surface-200/30 border border-transparent'
                              }`}
                            >
                              <div
                                className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                                  selected ? 'bg-primary-500 border border-primary-500' : 'bg-panel border border-surface-200'
                                }`}
                              >
                                {selected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <code className="text-[12px] font-mono font-bold text-surface-900">{s.kitId?.barcode ?? '—'}</code>
                                {s.kitId?.name && <span className="text-[10px] block mt-0.5 text-surface-500">{s.kitId.name}</span>}
                              </div>
                              <span className="text-[10px] text-surface-500">{formatDate(s.createdAt)}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${selectedKitIds.length > 0 ? 'bg-primary-500' : 'bg-surface-400'}`}>2</div>
                    <span className="text-[13px] font-semibold text-surface-900">Diyetisyen seçin</span>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                    <input
                      type="text"
                      placeholder="Diyetisyen ara..."
                      value={assignDietitianSearch}
                      onChange={(e) => setAssignDietitianSearch(e.target.value)}
                      className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-full outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
                    />
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 rounded-xl border border-surface-200 bg-surface-50/50">
                      {assignModalLoading ? (
                        <p className="text-[12px] text-center py-4 text-surface-500">Yükleniyor...</p>
                      ) : filteredDietitiansForModal.length === 0 ? (
                        <p className="text-[12px] text-center py-4 text-surface-500">Diyetisyen bulunamadı</p>
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
                              className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all ${
                                sel ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-400' : 'bg-surface-50 dark:bg-surface-200/30 border border-transparent'
                              }`}
                            >
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${sel ? 'bg-orange-500 text-white' : 'bg-surface-200 dark:bg-surface-300 text-surface-700'}`}>
                                {dietitianInitials(d)}
                              </div>
                              <div className="flex-1">
                                <p className="text-[12px] font-semibold text-surface-900">{primaryText}</p>
                                <p className="text-[10px] mt-0.5 text-surface-500">{secondaryText}</p>
                              </div>
                              {sel && <Check className="h-4 w-4 text-orange-500" />}
                            </button>
                          )
                        })
                      )}
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <p className="text-[11px] text-surface-500 order-2 sm:order-1">
                  Zimmetlenen kitler diyetisyene gösterilmez. Fiziksel teslimat sonrası barkod ile eşleştirme yapılır.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="order-1 sm:order-2 shrink-0"
                  onClick={handleAssign}
                  disabled={selectedKitIds.length === 0 || selectedDietitianId == null || assigning}
                >
                  {assigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Zimmetle ({selectedKitIds.length})
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
