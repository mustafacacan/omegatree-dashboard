import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Button, Input, Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Checkbox,
} from '@/components/ui'
import { OrderStatus, ORDER_STATUS_LABELS, KitStatus } from '@/utils/constants'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Search, Eye, Truck, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { TablePagination } from '@/components/shared/table-pagination'
import { useWorkflowStore } from '@/stores/workflow.store'

const statusVariant: Record<OrderStatus, 'warning' | 'info' | 'primary' | 'success' | 'danger'> = {
  [OrderStatus.PENDING]: 'warning',
  [OrderStatus.PAID]: 'info',
  [OrderStatus.SHIPPED]: 'primary',
  [OrderStatus.DELIVERED]: 'success',
  [OrderStatus.CANCELLED]: 'danger',
}

export function OrdersPage() {
  const { orders, kits, assignKitsToDietitian } = useWorkflowStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([])
  const [trackingNo, setTrackingNo] = useState('')

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

  const availableKits = useMemo(() => {
    // Sadece stokta olan ve henüz kimseye atanmamış kitler
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
      setTrackingNo('')
    }
  }

  const toggleBarcode = (barcode: string) => {
    if (selectedBarcodes.includes(barcode)) {
      setSelectedBarcodes(selectedBarcodes.filter((b) => b !== barcode))
    } else {
      if (selectedBarcodes.length < remainingQty) {
        setSelectedBarcodes([...selectedBarcodes, barcode])
      } else {
        toast.error(`Maksimum ${remainingQty} adet secebilirsiniz`)
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
      toast.error(`Maksimum ${remainingQty} adet secebilirsiniz`)
      return
    }
    if (!trackingNo.trim()) {
      toast.error('Kargo takip numarasi gerekli')
      return
    }

    // Seçilen kitlerin gerçekten stokta olduğunu kontrol et
    const selectedKits = kits.filter((k) => selectedBarcodes.includes(k.barcode))
    const invalidKits = selectedKits.filter(
      (k) => k.status !== KitStatus.IN_STOCK || k.assignedDietitianId
    )
    if (invalidKits.length > 0) {
      toast.error(`${invalidKits.length} adet kit stokta degil veya zaten atanmis`)
      return
    }

    assignKitsToDietitian(
      currentOrder.dietitianId,
      currentOrder.dietitianName,
      selectedBarcodes,
      trackingNo.trim(),
      'Admin',
      undefined,
      currentOrder.id
    )
    
    const newAssignedCount = currentOrder.assignedBarcodes.length + selectedBarcodes.length
    if (newAssignedCount >= currentOrder.qty) {
      toast.success(`Siparis tamamlandi! ${selectedBarcodes.length} adet kit kargoya verildi`)
    } else {
      toast.success(`${selectedBarcodes.length} adet kit kargoya verildi. Kalan: ${currentOrder.qty - newAssignedCount} adet`)
    }
    
    setSelectedOrder(null)
    setSelectedBarcodes([])
    setTrackingNo('')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Siparisler</CardTitle>
            <Input
              placeholder="Siparis ara..."
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
                <TableHead>Siparis No</TableHead>
                <TableHead>Diyetisyen</TableHead>
                <TableHead>Adet</TableHead>
                <TableHead>Tutar</TableHead>
                <TableHead>Kargoya Verilen</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-surface-500">
                    Filtreye uygun siparis bulunamadi.
                  </TableCell>
                </TableRow>
              )}
              {paginatedOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-semibold">{order.id}</TableCell>
                  <TableCell>{order.dietitianName}</TableCell>
                  <TableCell>{order.qty} Kit</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <Badge variant={order.assignedBarcodes.length > 0 ? 'primary' : 'warning'} dot>
                      {order.assignedBarcodes.length}/{order.qty}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-surface-500">{formatDate(order.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => handleOpenOrder(order.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
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

      {/* Order Detail & Shipment Modal */}
      <Modal open={selectedOrder !== null} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <ModalContent className="max-w-3xl">
          <ModalHeader>
            <ModalTitle>Siparis Detayi ve Kargolama</ModalTitle>
            <ModalDescription>
              {currentOrder && (
                <>
                  {currentOrder.dietitianName} - {currentOrder.qty} adet kit - {formatCurrency(currentOrder.total)}
                </>
              )}
            </ModalDescription>
          </ModalHeader>
          {currentOrder && (
            <ModalBody className="space-y-4">
              <div className="p-4 rounded-lg bg-surface-50 border border-surface-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-surface-500">Siparis No:</span>
                    <p className="font-semibold">{currentOrder.id}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Diyetisyen:</span>
                    <p className="font-semibold">{currentOrder.dietitianName}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Toplam Adet:</span>
                    <p className="font-semibold">{currentOrder.qty} Kit</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Kargoya Verilen:</span>
                    <p className="font-semibold">{currentOrder.assignedBarcodes.length} Kit</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Kalan:</span>
                    <p className="font-semibold text-primary-600">{remainingQty} Kit</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Toplam Tutar:</span>
                    <p className="font-semibold">{formatCurrency(currentOrder.total)}</p>
                  </div>
                </div>
              </div>

              {remainingQty > 0 && (
                <>
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Stoktan Kit Sec ({remainingQty} adet secin)</h4>
                    <div className="max-h-60 overflow-y-auto border border-surface-200 rounded-lg">
                      {availableKits.length === 0 ? (
                        <div className="p-8 text-center text-surface-500">
                          <Package className="h-8 w-8 mx-auto mb-2 text-surface-300" />
                          <p>Stokta uygun kit bulunamadi</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-surface-100">
                          {availableKits.slice(0, 50).map((kit) => (
                            <label
                              key={kit.barcode}
                              className="flex items-center gap-3 p-3 hover:bg-surface-50 cursor-pointer"
                            >
                              <Checkbox
                                checked={selectedBarcodes.includes(kit.barcode)}
                                onCheckedChange={() => toggleBarcode(kit.barcode)}
                                disabled={!selectedBarcodes.includes(kit.barcode) && selectedBarcodes.length >= remainingQty}
                              />
                              <div className="flex-1">
                                <code className="text-sm font-mono font-semibold">{kit.barcode}</code>
                                <p className="text-xs text-surface-500">{formatCurrency(kit.price)}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Input
                    label="Kargo Takip Numarasi"
                    placeholder="YK-123456"
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                  />
                </>
              )}

              {currentOrder.assignedBarcodes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Kargoya Verilen Kitler</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentOrder.assignedBarcodes.map((barcode) => (
                      <Badge key={barcode} variant="primary">
                        {barcode}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </ModalBody>
          )}
          <ModalFooter>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Kapat
            </Button>
            {currentOrder && remainingQty > 0 && (
              <Button
                variant="primary"
                onClick={handleShipOrder}
                disabled={selectedBarcodes.length === 0 || !trackingNo.trim()}
              >
                <Truck className="h-4 w-4" />
                Kargoya Ver ({selectedBarcodes.length} adet)
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
