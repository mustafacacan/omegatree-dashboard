import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent, Badge, Avatar,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Button, Input, Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, TrendingUp, TrendingDown, Plus, History } from 'lucide-react'
import { useUsersStore } from '@/stores/users.store'
import { useWorkflowStore } from '@/stores/workflow.store'
import { UserRole } from '@/utils/constants'
import { TablePagination } from '@/components/shared/table-pagination'
import { toast } from 'sonner'

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cari Hesap Listesi</CardTitle>
            <Input
              placeholder="Diyetisyen ara..."
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diyetisyen</TableHead>
                <TableHead>Toplam Odeme</TableHead>
                <TableHead>Kit Borcu</TableHead>
                <TableHead>Bakiye</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-32">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCari.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-surface-500">
                    Filtreye uygun cari kaydi bulunamadi.
                  </TableCell>
                </TableRow>
              )}
              {paginatedCari.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={item.name} size="sm" />
                      <div>
                        <p className="font-medium text-surface-800">{item.name}</p>
                        <p className="text-xs text-surface-400">{item.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-primary-700">
                    {formatCurrency(item.totalPayments)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(item.totalKitCharge)}
                  </TableCell>
                  <TableCell>
                    <span className={item.balance >= 0 ? 'font-semibold text-primary-700' : 'font-semibold text-danger'}>
                      {formatCurrency(item.balance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.balance > 0 ? (
                      <Badge variant="success" dot><TrendingUp className="h-3 w-3" /> Alacakli</Badge>
                    ) : item.balance < 0 ? (
                      <Badge variant="danger" dot><TrendingDown className="h-3 w-3" /> Borclu</Badge>
                    ) : (
                      <Badge variant="default">Dengeli</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" onClick={() => setHistoryUserId(item.id)}><History className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="sm" onClick={() => { setPaymentModalUserId(item.id); setPaymentAmount(''); setPaymentNote('') }}><Plus className="h-3.5 w-3.5" /> Odeme</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
        </CardContent>
      </Card>

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
