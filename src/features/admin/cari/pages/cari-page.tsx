import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Badge, Avatar, Button, Input,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, TrendingUp, TrendingDown, Plus, History } from 'lucide-react'
import { motion } from 'framer-motion'
import { useUsersStore } from '@/stores/users.store'
import { useWorkflowStore } from '@/stores/workflow.store'
import { UserRole } from '@/utils/constants'
import { TablePagination } from '@/components/shared/table-pagination'
import { toast } from 'sonner'

const W = {
  olive: '#8B9A4B',
  oliveLight: '#EEF2DE',
  orange: '#E8913A',
  orangeLight: '#FDF0E2',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
  warmGrayLight: '#B5AFA5',
  cream: '#F9F7F3',
  creamDark: '#F0EDE7',
}

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function CariPage() {
  const { users } = useUsersStore()
  const { kits, payments = [], addCariPayment } = useWorkflowStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [paymentModalUserId, setPaymentModalUserId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [historyUserId, setHistoryUserId] = useState<string | null>(null)

  const demoCari = useMemo(
    () =>
      users
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
        }),
    [kits, users, payments]
  )
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
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [filteredCari.length, page, pageSize])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Cari Hesap Listesi</h3>
              <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>Diyetisyen cari hesaplari ({filteredCari.length} kayit)</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: W.warmGrayLight }} />
              <input
                type="text"
                placeholder="Diyetisyen ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-48 outline-none transition-colors"
                style={{ background: W.cream, border: `1px solid ${W.warmBorder}`, color: W.dark }}
                onFocus={(e) => { e.currentTarget.style.borderColor = W.olive }}
                onBlur={(e) => { e.currentTarget.style.borderColor = W.warmBorder }}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: W.cream }}>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Diyetisyen</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Toplam Odeme</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Kit Borcu</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Bakiye</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Durum</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-32" style={{ color: W.textLight }}>Islem</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCari.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-[12px]" style={{ color: W.textLight }}>
                      Filtreye uygun cari kaydi bulunamadi.
                    </td>
                  </tr>
                ) : (
                  paginatedCari.map((item) => (
                    <tr
                      key={item.id}
                      className="transition-colors"
                      style={{ borderBottom: `1px solid ${W.warmBorder}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = W.cream }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Avatar name={item.name} size="sm" />
                          <div>
                            <span className="text-[12px] block" style={{ color: W.text }}>{item.name}</span>
                            <span className="text-[11px]" style={{ color: W.textLight }}>{item.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px] font-medium" style={{ color: W.olive }}>{formatCurrency(item.totalPayments)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[12px]" style={{ color: W.text }}>{formatCurrency(item.totalKitCharge)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-[12px] font-semibold"
                          style={{ color: item.balance >= 0 ? '#5A6B2A' : '#C0392B' }}
                        >
                          {formatCurrency(item.balance)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {item.balance > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: W.oliveLight, color: '#5A6B2A' }}>
                            <TrendingUp className="h-3 w-3" /> Alacakli
                          </span>
                        ) : item.balance < 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: W.orangeLight, color: '#B56B1E' }}>
                            <TrendingDown className="h-3 w-3" /> Borclu
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: W.creamDark, color: W.text }}>
                            Dengeli
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" onClick={() => setHistoryUserId(item.id)}><History className="h-3.5 w-3.5" /></Button>
                          <Button variant="outline" size="sm" onClick={() => { setPaymentModalUserId(item.id); setPaymentAmount(''); setPaymentNote('') }}><Plus className="h-3.5 w-3.5" /> Odeme</Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
            <ModalTitle>Odeme kaydi</ModalTitle>
            <ModalDescription>
              {paymentModalUserId && demoCari.find((c) => c.id === paymentModalUserId)?.name} icin odenen tutari girin.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <Input type="number" placeholder="Tutar (TL)" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            <Input placeholder="Not (opsiyonel)" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setPaymentModalUserId(null)}>Iptal</Button>
            <Button
              variant="primary"
              onClick={() => {
                const user = paymentModalUserId && demoCari.find((c) => c.id === paymentModalUserId)
                if (!user || !paymentAmount.trim() || Number.isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) {
                  toast.error('Gecerli bir tutar girin')
                  return
                }
                addCariPayment(user.id, user.name, Number(paymentAmount), paymentNote.trim(), 'Admin')
                toast.success('Odeme kaydedildi')
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
            <ModalTitle>Odeme gecmisi</ModalTitle>
            <ModalDescription>{historyUserId && demoCari.find((c) => c.id === historyUserId)?.name}</ModalDescription>
          </ModalHeader>
          <ModalBody>
            <ul className="space-y-2 max-h-64 overflow-auto">
              {(payments || []).filter((p) => p.dietitianId === historyUserId).length === 0 && (
                <li className="text-sm text-surface-500">Henuz odeme kaydi yok.</li>
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
