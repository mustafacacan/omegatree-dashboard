import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent,
  Button, Input, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { DollarSign, Pencil, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { KitStatus } from '@/utils/constants'
import { TablePagination } from '@/components/shared/table-pagination'

export function PricingPage() {
  const { kits, updateKitPrice } = useWorkflowStore()
  const [editOpen, setEditOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | KitStatus>('all')
  const [editItem, setEditItem] = useState<{ barcode: string; price: number } | null>(null)
  const [editPrice, setEditPrice] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filteredKits = useMemo(
    () =>
      kits
        .filter((k) => {
          const q = search.toLowerCase()
          const matchesSearch =
            !q || k.barcode.toLowerCase().includes(q) || k.batch.toLowerCase().includes(q)
          const matchesStatus = statusFilter === 'all' || k.status === statusFilter
          return matchesSearch && matchesStatus
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [kits, search, statusFilter]
  )
  const paginatedKits = useMemo(
    () => filteredKits.slice((page - 1) * pageSize, page * pageSize),
    [filteredKits, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredKits.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [filteredKits.length, page, pageSize])

  const handleEdit = (item: { barcode: string; price: number }) => {
    setEditItem(item)
    setEditPrice(String(item.price))
    setEditOpen(true)
  }

  const submitEdit = () => {
    if (!editItem) return
    const nextPrice = Number(editPrice)
    const result = updateKitPrice(editItem.barcode, nextPrice, 'Admin')
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setEditOpen(false)
    setEditItem(null)
    setEditPrice('')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card>
        <div className="p-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100">
          <div>
            <h3 className="text-[15px] font-semibold text-surface-900">Kit Bazli Fiyatlandirma</h3>
            <p className="text-[13px] text-surface-500 mt-0.5">Her kitin fiyatini barkoda gore yonetin</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Input
              placeholder="Barkod veya parti ara..."
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-60"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | KitStatus)}
              className="h-10 rounded-lg border border-surface-200 bg-white px-3 text-sm text-surface-700 outline-none"
            >
              <option value="all">Tum Durumlar</option>
              <option value={KitStatus.IN_STOCK}>Stokta</option>
              <option value={KitStatus.ASSIGNED}>Zimmetli</option>
              <option value={KitStatus.DELIVERED}>Teslim Edildi</option>
              <option value={KitStatus.SAMPLE_SENT}>Numune Gonderildi</option>
              <option value={KitStatus.IN_ANALYSIS}>Analizde</option>
              <option value={KitStatus.COMPLETED}>Tamamlandi</option>
            </select>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barkod</TableHead>
                <TableHead>Parti</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Fiyat</TableHead>
                <TableHead>Uretim Tarihi</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKits.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-surface-500">
                    Filtreye uygun kit bulunamadi.
                  </TableCell>
                </TableRow>
              )}
              {paginatedKits.map((item) => (
                <TableRow key={item.barcode}>
                  <TableCell>
                    <code className="text-xs font-mono bg-surface-50 px-2 py-0.5 rounded">{item.barcode}</code>
                  </TableCell>
                  <TableCell className="text-sm text-surface-600">{item.batch}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.status}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-primary-700">{formatCurrency(item.price)}</TableCell>
                  <TableCell className="text-sm text-surface-500">{formatDate(item.createdAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleEdit({ barcode: item.barcode, price: item.price })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
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

      <Modal open={editOpen} onOpenChange={setEditOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Kit Fiyati Duzenle</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Input label="Barkod" value={editItem?.barcode || ''} disabled />
            <Input
              label="Fiyat (TL)"
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              leftIcon={<DollarSign className="h-4 w-4" />}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Iptal</Button>
            <Button onClick={submitEdit}>
              Kaydet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
