import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Avatar, Button, Input,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, TrendingUp, TrendingDown, Minus, Plus, History, ChevronDown, Wallet, Package, Scale } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUsersStore } from '@/stores/users.store'
import { useWorkflowStore } from '@/stores/workflow.store'
import { UserRole } from '@/utils/constants'
import { TablePagination } from '@/components/shared/table-pagination'
import { toast } from 'sonner'

const palette = {
  olive: '#8B9A4B',
  oliveLight: '#E8F0D4',
  oliveBg: 'rgba(139, 154, 75, 0.12)',
  orange: '#E8913A',
  orangeLight: '#FDF0E2',
  orangeBg: 'rgba(232, 145, 58, 0.12)',
  success: '#5D9B5D',
  successBg: 'rgba(93, 155, 93, 0.14)',
  danger: '#C75C5C',
  dangerBg: 'rgba(199, 92, 92, 0.12)',
  neutral: '#6B7280',
  neutralBg: 'rgba(107, 114, 128, 0.1)',
  border: '#E8E4DE',
  cream: '#F9F7F3',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
  accentSky: '#5A9EC8',
  accentViolet: '#9B7EC8',
  accentCyan: '#5BA8B5',
}

const fadeUp = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }
const stagger = { animate: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } } }
const itemMotion = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

const MOCK_CARI = [
  { id: 'mock-cari-1', name: 'Ayşe Yılmaz', email: 'ayse.yilmaz@example.com', totalPayments: 12500, totalKitCharge: 8000, balance: 4500 },
  { id: 'mock-cari-2', name: 'Mehmet Kaya', email: 'mehmet.kaya@example.com', totalPayments: 6200, totalKitCharge: 9200, balance: -3000 },
  { id: 'mock-cari-3', name: 'Zeynep Demir', email: 'zeynep.demir@example.com', totalPayments: 15000, totalKitCharge: 15000, balance: 0 },
  { id: 'mock-cari-4', name: 'Can Öztürk', email: 'can.ozturk@example.com', totalPayments: 0, totalKitCharge: 4500, balance: -4500 },
  { id: 'mock-cari-5', name: 'Elif Arslan', email: 'elif.arslan@example.com', totalPayments: 21000, totalKitCharge: 18000, balance: 3000 },
  { id: 'mock-cari-6', name: 'Burak Şahin', email: 'burak.sahin@example.com', totalPayments: 8400, totalKitCharge: 8400, balance: 0 },
]

export function CariPage() {
  const { users } = useUsersStore()
  const { kits, payments = [], addCariPayment } = useWorkflowStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [paymentModalUserId, setPaymentModalUserId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [historyUserId, setHistoryUserId] = useState<string | null>(null)

  const demoCari = useMemo(() => {
    const fromUsers = users
      .filter((u) => u.role === UserRole.DIETITIAN)
      .map((u) => {
        const name = `${u.firstName} ${u.lastName}`.trim()
        const userKits = kits.filter((k) => k.assignedDietitianId === u.id)
        const totalKitCharge = userKits.reduce((sum, k) => sum + (k.price || 0), 0)
        const totalPayments = (payments || []).filter((p) => p.dietitianId === u.id).reduce((sum, p) => sum + p.amount, 0)
        const balance = totalPayments - totalKitCharge
        return {
          id: u.id,
          name,
          email: u.email,
          totalPayments,
          totalKitCharge,
          balance,
        }
      })
    return [...fromUsers, ...MOCK_CARI]
  }, [kits, users, payments])

  const filteredCari = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return demoCari
    return demoCari.filter(
      (item) => item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q)
    )
  }, [demoCari, search])

  const paginatedCari = useMemo(
    () => filteredCari.slice((page - 1) * pageSize, page * pageSize),
    [filteredCari, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredCari.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [filteredCari.length, page, pageSize])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      {/* Ana panel - Accordion liste */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="rounded-xl overflow-hidden border border-surface-200 bg-white">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: palette.dark }}>Cari Hesap Listesi</h3>
              <p className="text-[12px] mt-0.5" style={{ color: palette.textLight }}>
                Diyetisyen cari hesapları · {filteredCari.length} kayıt
              </p>
            </div>
            <div className="relative group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors"
                style={{ color: palette.textLight }}
              />
              <input
                type="text"
                placeholder="Diyetisyen ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 text-[13px] rounded-xl w-56 outline-none transition-all duration-200"
                style={{
                  background: palette.cream,
                  border: `1px solid ${palette.border}`,
                  color: palette.dark,
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-surface-400)' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = palette.border }}
              />
            </div>
          </div>

          <motion.div
            className="p-2 sm:p-3"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            {paginatedCari.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm" style={{ color: palette.textLight }}>Filtreye uygun cari kaydı bulunamadı.</p>
              </div>
            ) : (
              paginatedCari.map((item) => {
                const isExpanded = expandedId === item.id
                const statusType = item.balance > 0 ? 'alacakli' : item.balance < 0 ? 'borclu' : 'dengeli'
                const statusConfig = {
                  alacakli: { label: 'Alacaklı', icon: TrendingUp, leftColor: '#16a34a' },
                  borclu: { label: 'Borçlu', icon: TrendingDown, leftColor: '#ea580c' },
                  dengeli: { label: 'Dengeli', icon: Minus, leftColor: '#64748b' },
                }
                const config = statusConfig[statusType]
                const StatusIcon = config.icon

                return (
                  <motion.div
                    key={item.id}
                    variants={itemMotion}
                    transition={{ duration: 0.25 }}
                    className="border-b border-surface-200 last:border-b-0 rounded-none"
                    style={{
                      background: isExpanded ? 'var(--color-surface-50)' : 'transparent',
                      borderLeft: `4px solid ${config.leftColor}`,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="w-full text-left p-3 sm:p-4 flex items-center gap-3 sm:gap-4 hover:bg-surface-50/80 transition-colors duration-150"
                    >
                      <Avatar name={item.name} size="md" className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold truncate" style={{ color: palette.dark }}>{item.name}</p>
                        <p className="text-[11px] truncate" style={{ color: palette.textLight }}>{item.email}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 shrink-0">
                        <span className="text-[12px] font-semibold tabular-nums text-surface-700">
                          {formatCurrency(item.balance)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-surface-200 text-surface-700">
                          <StatusIcon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </div>
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.25 }}
                        className="shrink-0 p-1 text-surface-500"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </motion.span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-surface-200 bg-surface-50/50">
                            <div className="px-4 py-5 sm:px-6 sm:py-6">
                              <p className="text-xs font-medium text-surface-500 uppercase tracking-wider mb-4">Hesap özeti</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1 rounded-xl bg-white border border-surface-200 p-4 shadow-sm min-h-[72px] justify-center">
                                  <div className="flex items-center gap-2.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-600">
                                      <Wallet className="h-4 w-4" />
                                    </span>
                                    <span className="text-xs font-medium text-surface-500">Toplam Ödeme</span>
                                  </div>
                                  <p className="text-base font-semibold tabular-nums text-surface-800 pl-11">{formatCurrency(item.totalPayments)}</p>
                                </div>
                                <div className="flex flex-col gap-1 rounded-xl bg-white border border-surface-200 p-4 shadow-sm min-h-[72px] justify-center">
                                  <div className="flex items-center gap-2.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-600">
                                      <Package className="h-4 w-4" />
                                    </span>
                                    <span className="text-xs font-medium text-surface-500">Kit Borcu</span>
                                  </div>
                                  <p className="text-base font-semibold tabular-nums text-surface-800 pl-11">{formatCurrency(item.totalKitCharge)}</p>
                                </div>
                                <div className="flex flex-col gap-1 rounded-xl bg-white border border-surface-200 p-4 shadow-sm min-h-[72px] justify-center">
                                  <div className="flex items-center gap-2.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-100 text-surface-600">
                                      <Scale className="h-4 w-4" />
                                    </span>
                                    <span className="text-xs font-medium text-surface-500">Bakiye</span>
                                  </div>
                                  <p className="text-base font-semibold tabular-nums text-surface-800 pl-11">{formatCurrency(item.balance)}</p>
                                </div>
                              </div>
                              <div className="mt-5 pt-5 border-t border-surface-200 flex flex-wrap items-center justify-end gap-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setHistoryUserId(item.id)
                                  }}
                                  className="gap-2 min-w-[100px]"
                                >
                                  <History className="h-4 w-4" />
                                  Geçmiş
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPaymentModalUserId(item.id)
                                    setPaymentAmount('')
                                    setPaymentNote('')
                                  }}
                                  className="gap-2 min-w-[120px]"
                                >
                                  <Plus className="h-4 w-4" />
                                  Ödeme Ekle
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {/* Mobil: bakiye ve durum badge'i sadece kapalıyken */}
                    {!isExpanded && (
                      <div className="sm:hidden flex items-center justify-between px-4 pb-3 gap-2">
                        <span className="text-[12px] font-semibold tabular-nums text-surface-700">{formatCurrency(item.balance)}</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-surface-200 text-surface-700">
                          <StatusIcon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )
              })
            )}
          </motion.div>

          <TablePagination
            totalItems={filteredCari.length}
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

      {/* Ödeme ekle modal */}
      <Modal open={!!paymentModalUserId} onOpenChange={(open) => !open && setPaymentModalUserId(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Ödeme kaydı</ModalTitle>
            <ModalDescription>
              {paymentModalUserId && demoCari.find((c) => c.id === paymentModalUserId)?.name} için ödenen tutarı girin.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <Input type="number" placeholder="Tutar (TL)" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            <Input placeholder="Not (opsiyonel)" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setPaymentModalUserId(null)}>İptal</Button>
            <Button
              variant="primary"
              onClick={() => {
                const user = paymentModalUserId && demoCari.find((c) => c.id === paymentModalUserId)
                if (!user || !paymentAmount.trim() || Number.isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
                  toast.error('Geçerli bir tutar girin')
                  return
                }
                addCariPayment(user.id, user.name, Number(paymentAmount), paymentNote.trim(), 'Admin')
                toast.success('Ödeme kaydedildi')
                setPaymentModalUserId(null)
                setPaymentAmount('')
                setPaymentNote('')
              }}
            >
              Kaydet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Ödeme geçmişi modal */}
      <Modal open={!!historyUserId} onOpenChange={(open) => !open && setHistoryUserId(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Ödeme geçmişi</ModalTitle>
            <ModalDescription>{historyUserId && demoCari.find((c) => c.id === historyUserId)?.name}</ModalDescription>
          </ModalHeader>
          <ModalBody>
            <ul className="space-y-2 max-h-64 overflow-auto">
              {(payments || []).filter((p) => p.dietitianId === historyUserId).length === 0 && (
                <li className="text-sm text-surface-500">Henüz ödeme kaydı yok.</li>
              )}
              {(payments || []).filter((p) => p.dietitianId === historyUserId).map((p) => (
                <li key={p.id} className="flex justify-between text-sm py-2 border-b border-surface-100 last:border-0">
                  <span>{formatDate(p.date)} — {p.note || '-'}</span>
                  <span className="font-medium text-primary-700">{formatCurrency(p.amount)}</span>
                </li>
              ))}
            </ul>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
