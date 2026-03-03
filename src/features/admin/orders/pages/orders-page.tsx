import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Button, Input, Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Checkbox,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, Eye, Truck, Package, ShoppingBag, Clock, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { TablePagination } from '@/components/shared/table-pagination'
import { useWorkflowStore } from '@/stores/workflow.store'
import { KitStatus } from '@/utils/constants'
import { getOrders } from '@/services/orders.service'

const ORDERS_QUERY_KEY = ['orders'] as const

export function OrdersPage() {
  const { orders, kits, assignKitsToDietitian, setOrdersFromApi } = useWorkflowStore()

  const { data: apiOrders } = useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: getOrders,
  })

  useEffect(() => {
    if (apiOrders && apiOrders.length >= 0) {
      setOrdersFromApi(apiOrders)
    }
  }, [apiOrders, setOrdersFromApi])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([])

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return orders
    return orders.filter(
      (order) => order.id.toLowerCase().includes(q) || order.dietitianName.toLowerCase().includes(q)
    )
  }, [search, orders])

  const paginatedOrders = useMemo(
    () => filteredOrders.slice((page - 1) * pageSize, page * pageSize),
    [filteredOrders, page, pageSize]
  )

  const stats = useMemo(() => {
    const total = orders.length
    const awaitingShip = orders.filter((o) => o.assignedBarcodes.length < o.qty).length
    const fullyShipped = orders.filter((o) => o.assignedBarcodes.length >= o.qty && o.qty > 0).length
    return { total, awaitingShip, fullyShipped }
  }, [orders])

  const availableKits = useMemo(() => {
    return kits.filter(
      (k) => k.status === KitStatus.IN_STOCK && !k.assignedDietitianId && !k.assignedClientId
    )
  }, [kits])

  const currentOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrder)
  }, [orders, selectedOrder])

  const remainingQty = currentOrder ? currentOrder.qty - currentOrder.assignedBarcodes.length : 0

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [filteredOrders.length, page, pageSize])

  const handleOpenOrder = (orderId: string) => {
    setSelectedOrder(orderId)
    const order = orders.find((o) => o.id === orderId)
    if (order) {
      setSelectedBarcodes([])
    }
  }

  const toggleBarcode = (barcode: string) => {
    if (selectedBarcodes.includes(barcode)) {
      setSelectedBarcodes(selectedBarcodes.filter((b) => b !== barcode))
    } else {
      if (selectedBarcodes.length < remainingQty) {
        setSelectedBarcodes([...selectedBarcodes, barcode])
      } else {
        toast.error(`En fazla ${remainingQty} adet secebilirsiniz`)
      }
    }
  }

  const handleShipOrder = () => {
    if (!currentOrder) return
    if (selectedBarcodes.length === 0) {
      toast.error('En az bir kit secin')
      return
    }
    if (selectedBarcodes.length > remainingQty) {
      toast.error(`En fazla ${remainingQty} adet secebilirsiniz`)
      return
    }
    const selectedKits = kits.filter((k) => selectedBarcodes.includes(k.barcode))
    const invalidKits = selectedKits.filter(
      (k) => k.status !== KitStatus.IN_STOCK || k.assignedDietitianId
    )
    if (invalidKits.length > 0) {
      toast.error(`${invalidKits.length} kit stokta degil veya atanmis`)
      return
    }

    assignKitsToDietitian(
      currentOrder.dietitianId,
      currentOrder.dietitianName,
      selectedBarcodes,
      'Admin',
      undefined,
      currentOrder.id
    )

    const newAssignedCount = currentOrder.assignedBarcodes.length + selectedBarcodes.length
    if (newAssignedCount >= currentOrder.qty) {
      toast.success(`Siparis tamamlandi. ${selectedBarcodes.length} kit kargoya verildi.`)
    } else {
      toast.success(`${selectedBarcodes.length} kit kargoya verildi. Kalan: ${currentOrder.qty - newAssignedCount} adet`)
    }

    setSelectedOrder(null)
    setSelectedBarcodes([])
  }

  const getOrderStatusLabel = (order: { qty: number; assignedBarcodes: string[] }) => {
    const sent = order.assignedBarcodes.length
    if (sent === 0) return 'Kargo bekliyor'
    if (sent >= order.qty) return 'Kargoya verildi'
    return `${sent}/${order.qty} kargoda`
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      {/* Özet kartları */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl p-4 border border-surface-200 bg-white flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <ShoppingBag className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-surface-500">Toplam Siparis</p>
            <p className="text-xl font-bold text-surface-900 tabular-nums">{stats.total}</p>
          </div>
        </div>
        <div className="rounded-2xl p-4 border border-surface-200 bg-white flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-surface-500">Kargo Bekleyen</p>
            <p className="text-xl font-bold text-surface-900 tabular-nums">{stats.awaitingShip}</p>
          </div>
        </div>
        <div className="rounded-2xl p-4 border border-surface-200 bg-white flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-surface-500">Kargoya Verilen</p>
            <p className="text-xl font-bold text-surface-900 tabular-nums">{stats.fullyShipped}</p>
          </div>
        </div>
      </section>

      <Card className="border-surface-200">
        <CardHeader className="border-b border-surface-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Siparisler</CardTitle>
              <p className="text-sm text-surface-500 mt-1">
                Odemesi diyetisyen panelinde yapilan siparisleri goruntuleyin; kitleri diyetisyene verin.
              </p>
            </div>
            <Input
              placeholder="Siparis no veya diyetisyen ara..."
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-72"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siparis No</TableHead>
                <TableHead>Diyetisyen</TableHead>
                <TableHead className="text-right">Adet</TableHead>
                <TableHead className="text-right">Tutar</TableHead>
                <TableHead>Kargolama</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>Odeme</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-surface-500">
                      <Package className="h-10 w-10 text-surface-300" />
                      <p className="text-sm font-medium">Siparis bulunamadi</p>
                      <p className="text-xs">
                        {search.trim() ? 'Arama kriterine uygun siparis yok.' : 'Henuz siparis kaydi yok.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {paginatedOrders.map((order) => (
                <TableRow key={order.id} className="group">
                  <TableCell className="font-mono font-semibold text-surface-900">{order.id}</TableCell>
                  <TableCell>{order.dietitianName}</TableCell>
                  <TableCell className="text-right tabular-nums">{order.qty} kit</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.assignedBarcodes.length >= order.qty
                          ? 'success'
                          : order.assignedBarcodes.length > 0
                            ? 'info'
                            : 'warning'
                      }
                      dot
                    >
                      {getOrderStatusLabel(order)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-surface-500 text-sm">{formatDate(order.createdAt)}</TableCell>
                  <TableCell>
                    {order.paid ? (
                      <Badge variant="success" dot>Odendi</Badge>
                    ) : (
                      <Badge variant="warning" dot>Odeme bekleniyor</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenOrder(order.id)}
                      aria-label="Siparis detayi"
                      title="Detay ve kargolama"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={filteredOrders.length}
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

      {/* Sipariş detay ve kargolama modal */}
      <Modal open={selectedOrder !== null} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>
              {currentOrder ? `Siparis ${currentOrder.id}` : 'Siparis detayi'}
            </ModalTitle>
            <ModalDescription>
              {currentOrder && (
                <>
                  {currentOrder.dietitianName} · {currentOrder.qty} kit · {formatCurrency(currentOrder.total)}
                </>
              )}
            </ModalDescription>
          </ModalHeader>
          {currentOrder && (
            <ModalBody className="space-y-5">
              {/* Sipariş özeti */}
              <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3">
                  Siparis ozeti
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-surface-500">Siparis no</p>
                    <p className="font-semibold font-mono">{currentOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-surface-500">Diyetisyen</p>
                    <p className="font-semibold">{currentOrder.dietitianName}</p>
                  </div>
                  <div>
                    <p className="text-surface-500">Toplam adet</p>
                    <p className="font-semibold">{currentOrder.qty} kit</p>
                  </div>
                  <div>
                    <p className="text-surface-500">Kargoya verilen</p>
                    <p className="font-semibold text-primary-600">{currentOrder.assignedBarcodes.length} kit</p>
                  </div>
                  <div>
                    <p className="text-surface-500">Kalan</p>
                    <p className="font-semibold">{remainingQty} kit</p>
                  </div>
                  <div>
                    <p className="text-surface-500">Tutar</p>
                    <p className="font-semibold">{formatCurrency(currentOrder.total)}</p>
                  </div>
                </div>
              </div>

              {/* Kargoya verilecek kitler */}
              {remainingQty > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-surface-800">
                    Stoktan kit secin ({remainingQty} adet secin)
                  </h4>
                  <p className="text-xs text-surface-500">
                    Asagidan stoktaki kitleri isaretleyin ve &quot;Diyetisyene ver&quot; butonuna tiklayin.
                  </p>
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-surface-200 bg-white">
                    {availableKits.length === 0 ? (
                      <div className="p-8 text-center text-surface-500">
                        <Package className="h-10 w-10 mx-auto mb-2 text-surface-300" />
                        <p className="text-sm font-medium">Stokta uygun kit yok</p>
                        <p className="text-xs mt-1">Uretim merkezinden barkod uretin veya diger siparislerden kalan kitleri kontrol edin.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-surface-100">
                        {availableKits.slice(0, 50).map((kit) => (
                          <li key={kit.barcode}>
                            <label className="flex items-center gap-3 p-3 hover:bg-surface-50 cursor-pointer">
                              <Checkbox
                                checked={selectedBarcodes.includes(kit.barcode)}
                                onCheckedChange={() => toggleBarcode(kit.barcode)}
                                disabled={
                                  !selectedBarcodes.includes(kit.barcode) && selectedBarcodes.length >= remainingQty
                                }
                              />
                              <span className="font-mono text-sm font-semibold">{kit.barcode}</span>
                              <span className="text-xs text-surface-500 ml-auto">{formatCurrency(kit.price)}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Zaten kargoya verilen kitler */}
              {currentOrder.assignedBarcodes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-surface-800">
                    Bu sipariste kargoya verilen kitler
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {currentOrder.assignedBarcodes.map((barcode) => (
                      <Badge key={barcode} variant="primary" className="font-mono text-xs">
                        {barcode}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </ModalBody>
          )}
          <ModalFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Kapat
            </Button>
            {currentOrder && remainingQty > 0 && (
              <Button
                variant="primary"
                onClick={handleShipOrder}
                disabled={selectedBarcodes.length === 0}
              >
                <Truck className="h-4 w-4" />
                Diyetisyene ver {selectedBarcodes.length > 0 && `(${selectedBarcodes.length} adet)`}
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
