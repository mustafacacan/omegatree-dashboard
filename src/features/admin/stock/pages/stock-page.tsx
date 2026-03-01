import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui'
import { StatusBadge } from '@/components/shared/status-badge'
import { TablePagination } from '@/components/shared/table-pagination'
import { KitStatus, UserRole, UserStatus } from '@/utils/constants'
import { formatDate } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Boxes, Search, ArrowRightLeft, AlertTriangle,
  TrendingUp, TrendingDown, X, Check,
  User, Send, CheckCircle,
} from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useUsersStore } from '@/stores/users.store'

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

export function StockPage() {
  const { kits, assignKitsToDietitian } = useWorkflowStore()
  const { users } = useUsersStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedKits, setSelectedKits] = useState<string[]>([])
  const [selectedDietitian, setSelectedDietitian] = useState<string | null>(null)
  const [assignSuccess, setAssignSuccess] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const availableKits = kits.filter(k => k.status === KitStatus.IN_STOCK)
  const dietitians = users
    .filter((u) => u.role === UserRole.DIETITIAN && u.status === UserStatus.ACTIVE)
    .map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      kitCount: kits.filter((k) => k.assignedDietitianId === u.id && k.status !== KitStatus.COMPLETED).length,
    }))

  const filteredStock = useMemo(() => {
    return kits.filter(kit => {
      const matchSearch = !searchQuery || kit.barcode.toLowerCase().includes(searchQuery.toLowerCase())
      const matchStatus = statusFilter === 'all' || kit.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [kits, searchQuery, statusFilter])
  const paginatedStock = useMemo(
    () => filteredStock.slice((page - 1) * pageSize, page * pageSize),
    [filteredStock, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredStock.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [filteredStock.length, page, pageSize])

  const stats = useMemo(() => ({
    inStock: kits.filter(k => k.status === KitStatus.IN_STOCK).length,
    assigned: kits.filter(k => k.status === KitStatus.ASSIGNED).length,
    inProcess: kits.filter(
      (k) =>
        k.status === KitStatus.DELIVERED ||
        k.status === KitStatus.SAMPLE_SENT ||
        k.status === KitStatus.IN_ANALYSIS
    ).length,
    damaged: kits.filter(k => k.status === KitStatus.DAMAGED).length,
  }), [kits])

  const toggleKitSelect = (barcode: string) => {
    setSelectedKits(prev => prev.includes(barcode) ? prev.filter(b => b !== barcode) : [...prev, barcode])
  }

  const handleAssign = () => {
    if (!selectedDietitian || selectedKits.length === 0) return
    const dietitian = dietitians.find((d) => d.id === selectedDietitian)
    if (!dietitian) return
    assignKitsToDietitian(dietitian.id, dietitian.name, selectedKits, 'Admin')
    setAssignSuccess(true)
    setTimeout(() => {
      setAssignSuccess(false)
      setShowAssignModal(false)
      setSelectedKits([])
      setSelectedDietitian(null)
    }, 2000)
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
            <p className="text-[12px] font-semibold" style={{ color: '#5A6B2A' }}>Zimmetleme Akisi</p>
            <p className="text-[11px]" style={{ color: '#7A8A4A' }}>
              Kit zimmetlendiginde diyetisyen bunu goremez. Fiziksel kit ulastiginda diyetisyen barkod numarasini girerek kiti stoguna ekler.
            </p>
          </div>
        </div>
      </motion.div>

      {/* ═══ KIT INVENTORY TABLE ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Kit Envanter</h3>
              <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>Tum kitlerin guncel durumu ({filteredStock.length} kit)</p>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="min-w-[10rem]">
                  <SelectValue placeholder="Tum Durumlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tum Durumlar</SelectItem>
                  <SelectItem value={KitStatus.IN_STOCK}>Stokta</SelectItem>
                  <SelectItem value={KitStatus.ASSIGNED}>Zimmetli</SelectItem>
                  <SelectItem value={KitStatus.DELIVERED}>Teslim Edildi</SelectItem>
                  <SelectItem value={KitStatus.RETURN_REQUESTED}>Iade Talebi</SelectItem>
                  <SelectItem value={KitStatus.IN_ANALYSIS}>Analizde</SelectItem>
                  <SelectItem value={KitStatus.COMPLETED}>Tamamlandi</SelectItem>
                  <SelectItem value={KitStatus.DAMAGED}>Hasarli</SelectItem>
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
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Durum</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Konum / Zimmet</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStock.map((kit) => (
                  <tr
                    key={kit.barcode}
                    className="transition-colors"
                    style={{ borderBottom: `1px solid ${W.warmBorder}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = W.cream }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <td className="px-5 py-3.5">
                      <code className="text-[13px] font-mono font-bold" style={{ color: W.dark }}>{kit.barcode}</code>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={kit.status as KitStatus} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px]" style={{ color: W.text }}>
                        {kit.assignedDietitianName ? (
                          <span className="flex items-center gap-1.5">
                            <User className="h-3 w-3" style={{ color: W.olive }} />
                            {kit.assignedDietitianName}
                          </span>
                        ) : kit.location}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[12px]" style={{ color: W.textLight }}>{formatDate(kit.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            totalItems={filteredStock.length}
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
            onClick={() => { setShowAssignModal(false); setSelectedKits([]); setSelectedDietitian(null); setAssignSuccess(false) }}
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
                  onClick={() => { setShowAssignModal(false); setSelectedKits([]); setSelectedDietitian(null); setAssignSuccess(false) }}
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
                    {selectedKits.length} kit secilen diyetisyene zimmetlendi.
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
                      {selectedKits.length > 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: W.oliveLight, color: W.olive }}>
                          {selectedKits.length} secildi
                        </span>
                      )}
                    </div>
                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                      {availableKits.length === 0 ? (
                        <p className="text-[12px] text-center py-4" style={{ color: W.textLight }}>Stokta uygun kit bulunmuyor</p>
                      ) : (
                        availableKits.map((kit) => {
                          const selected = selectedKits.includes(kit.barcode)
                          return (
                            <button
                              key={kit.barcode}
                              type="button"
                              onClick={() => toggleKitSelect(kit.barcode)}
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
                                <code className="text-[12px] font-mono font-bold" style={{ color: W.dark }}>{kit.barcode}</code>
                              </div>
                              <span className="text-[10px]" style={{ color: W.textLight }}>{formatDate(kit.createdAt)}</span>
                            </button>
                          )
                        })
                      )}
                    </div>
                  </div>

                  {/* Step 2: Select Dietitian */}
                  <div className="p-5" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: selectedKits.length > 0 ? W.olive : W.warmGrayLight }}>2</div>
                      <span className="text-[13px] font-semibold" style={{ color: W.dark }}>Diyetisyen Secin</span>
                    </div>
                    <div className="space-y-1.5">
                      {dietitians.map((d) => {
                        const sel = selectedDietitian === d.id
                        return (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setSelectedDietitian(sel ? null : d.id)}
                            className="flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all"
                            style={{
                              background: sel ? W.orangeLight : W.cream,
                              border: `1.5px solid ${sel ? W.orange : 'transparent'}`,
                            }}
                          >
                            <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold" style={{ background: sel ? W.orange : W.creamDark, color: sel ? '#fff' : W.text }}>
                              {d.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="flex-1">
                              <p className="text-[12px] font-semibold" style={{ color: W.dark }}>{d.name}</p>
                              <p className="text-[10px]" style={{ color: W.textLight }}>{d.kitCount} aktif kit</p>
                            </div>
                            {sel && <Check className="h-4 w-4" style={{ color: W.orange }} />}
                          </button>
                        )
                      })}
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
                      disabled={selectedKits.length === 0 || !selectedDietitian}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Zimmetle ({selectedKits.length})
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
