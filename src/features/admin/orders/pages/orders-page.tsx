import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Badge, Button, Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Checkbox,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Search, Eye, Truck, Package, ShoppingBag, Clock, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { TablePagination } from '@/components/shared/table-pagination'
import { useWorkflowStore } from '@/stores/workflow.store'
import { KitStatus } from '@/utils/constants'
import { getOrders, type OrderItem } from '@/services/orders.service'
import { getStocks, type Stock } from '@/services/stocks.service'

const ORDERS_QUERY_KEY = ['orders'] as const
const STOCKS_AVAILABLE_QUERY_KEY = ['stocks', 'available'] as const
const EMPTY_ORDERS: OrderItem[] = []

const W = {
  olive: '#8B9A4B', oliveLight: '#EEF2DE',
  orange: '#E8913A', orangeLight: '#FDF0E2',
  warmBorder: '#E8E4DE', dark: '#2D2A26',
  text: '#4A4640', textLight: '#9C968D', warmGrayLight: '#B5AFA5',
  cream: '#F9F7F3', creamDark: '#F0EDE7',
}

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function OrdersPage() {
  const { orders, kits, assignKitsToDietitian, setOrdersFromApi } = useWorkflowStore()

  const { data: apiOrdersData, isLoading: ordersLoading } = useQuery<OrderItem[]>({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: () => getOrders(),
  })
  const apiOrders = apiOrdersData ?? EMPTY_ORDERS

  useEffect(() => {
    if (apiOrdersData != null && apiOrdersData.length >= 0) {
      setOrdersFromApi(apiOrdersData)
    }
  }, [apiOrdersData, setOrdersFromApi])

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [selectedBarcodes, setSelectedBarcodes] = useState<string[]>([])

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return apiOrders
    return apiOrders.filter((order: OrderItem) => {
      const orderNum = (order.orderNumber ?? '').toLowerCase()
      const userName = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ').toLowerCase()
      const kitName = (order.salesKit?.name ?? '').toLowerCase()
      return orderNum.includes(q) || userName.includes(q) || kitName.includes(q) || String(order.id).includes(q)
    })
  }, [search, apiOrders])

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

  const availableKitsFromStore = useMemo(() => {
    return kits.filter(
      (k) => k.status === KitStatus.IN_STOCK && !k.assignedDietitianId && !k.assignedClientId
    )
  }, [kits])

  const { data: stocksResult } = useQuery({
    queryKey: [...STOCKS_AVAILABLE_QUERY_KEY, selectedOrder],
    queryFn: () => getStocks({ limit: 200 }),
    enabled: selectedOrder !== null,
  })

  const availableKits = useMemo(() => {
    const fromApi = (stocksResult?.data ?? []).filter(
      (s: Stock) => s.status === 'available' && s.kitId?.barcode
    ) as Stock[]
    if (fromApi.length > 0) {
      return fromApi.map((s) => ({
        barcode: s.kitId!.barcode,
        name: s.kitId?.name,
        price: 0,
      }))
    }
    return availableKitsFromStore.map((k) => ({
      barcode: k.barcode,
      name: undefined,
      price: k.price,
    }))
  }, [stocksResult?.data, availableKitsFromStore])

  const currentOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrder)
  }, [orders, selectedOrder])

  const selectedOrderItem = useMemo((): OrderItem | null => {
    if (!selectedOrder || !apiOrders.length) return null
    return apiOrders.find((o) => String(o.id) === selectedOrder) ?? null
  }, [selectedOrder, apiOrders])

  const remainingQty = currentOrder ? currentOrder.qty - currentOrder.assignedBarcodes.length : 0

  const paymentMethodLabel = (method: string | undefined) => {
    if (!method) return '—'
    const m = (method || '').toLowerCase()
    if (m === 'havale') return 'Havale'
    if (m === 'eft') return 'EFT'
    if (m === 'kredi_karti' || m === 'kredi kartı') return 'Kredi kartı'
    return method
  }

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
      toast.error('En az bir kit seçin')
      return
    }
    if (selectedBarcodes.length > remainingQty) {
      toast.error(`En fazla ${remainingQty} adet seçebilirsiniz`)
      return
    }
    const validBarcodes = new Set(availableKits.map((k) => k.barcode))
    const invalidSelected = selectedBarcodes.filter((b) => !validBarcodes.has(b))
    if (invalidSelected.length > 0) {
      toast.error('Seçilen kitlerden biri artık stokta yok veya atanmış.')
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

      {/* Özet kartları — üretim merkezi stili */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'Toplam Sipariş', value: stats.total, icon: ShoppingBag, iconColor: W.olive, iconBg: W.oliveLight },
          { title: 'Kargo Bekleyen', value: stats.awaitingShip, icon: Clock, iconColor: W.orange, iconBg: W.orangeLight },
          { title: 'Kargoya Verilen', value: stats.fullyShipped, icon: CheckCircle, iconColor: '#6ABF69', iconBg: '#E8F5E8' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <div className="rounded-2xl p-5 transition-shadow hover:shadow-md" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                    <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: W.textLight }}>{s.title}</p>
                    <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: W.dark }}>{s.value}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </section>

      {/* Siparişler tablosu — kullanıcılar tablosu ile aynı stil */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Siparişler</h3>
              <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>
                Ödemesi diyetisyen panelinde yapılan siparişler ({filteredOrders.length} sipariş)
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: W.warmGrayLight }} />
              <input
                type="text"
                placeholder="Sipariş no, müşteri veya paket ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-56 outline-none transition-colors"
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
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Sipariş No</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Müşteri</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Paket</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Adet</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Tutar</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Durum</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Ödeme</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3" style={{ color: W.textLight }}>Tarih</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 w-20" style={{ color: W.textLight }} />
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" style={{ color: W.olive }} />
                      <p className="text-[12px]" style={{ color: W.textLight }}>Sipariş listesi yükleniyor...</p>
                    </td>
                  </tr>
                ) : paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <Package className="h-10 w-10 mx-auto mb-2" style={{ color: W.warmGrayLight }} />
                      <p className="text-[12px] font-medium" style={{ color: W.text }}>Sipariş bulunamadı</p>
                      <p className="text-[11px] mt-0.5" style={{ color: W.textLight }}>
                        {search.trim() ? 'Arama kriterine uygun sipariş yok.' : 'Henüz sipariş kaydı yok.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order: OrderItem) => {
                    const userName = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || '—'
                    const totalPrice = typeof order.totalPrice === 'string' ? Number.parseFloat(order.totalPrice) : Number(order.totalPrice)
                    const storeOrder = orders.find((o) => o.id === String(order.id))
                    const statusLabel = storeOrder ? getOrderStatusLabel(storeOrder) : (order.status === 'pending' ? 'Beklemede' : order.status === 'completed' ? 'Tamamlandı' : order.status ?? '—')
                    const paymentLabel = order.paymenStatus === 'paid' ? 'Ödendi' : order.paymenStatus === 'pending' ? 'Beklemede' : (order.paymentMethod ?? order.paymenStatus) ?? '—'
                    return (
                      <tr
                        key={order.id}
                        className="transition-colors"
                        style={{ borderBottom: `1px solid ${W.warmBorder}` }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = W.cream }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-mono font-semibold" style={{ color: W.dark }}>{order.orderNumber ?? order.id}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px]" style={{ color: W.text }}>{userName}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px]" style={{ color: W.text }}>{order.salesKit?.name ?? '—'}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[12px] tabular-nums" style={{ color: W.text }}>{order.quantity}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[12px] font-semibold tabular-nums" style={{ color: W.dark }}>{formatCurrency(Number.isFinite(totalPrice) ? totalPrice : 0)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
                            style={{
                              background: storeOrder && storeOrder.assignedBarcodes.length >= storeOrder.qty ? W.oliveLight : storeOrder && storeOrder.assignedBarcodes.length > 0 ? W.creamDark : W.orangeLight,
                              color: storeOrder && storeOrder.assignedBarcodes.length >= storeOrder.qty ? '#5A6B2A' : storeOrder && storeOrder.assignedBarcodes.length > 0 ? W.text : '#B56B1E',
                            }}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
                            style={{
                              background: order.paymenStatus === 'paid' ? W.oliveLight : W.creamDark,
                              color: order.paymenStatus === 'paid' ? '#5A6B2A' : W.textLight,
                            }}
                          >
                            {paymentLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px]" style={{ color: W.textLight }}>{order.createdAt ? formatDate(order.createdAt) : '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleOpenOrder(String(order.id))}
                            aria-label="Sipariş detayı"
                            title="Detay ve kargolama"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
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
        </div>
      </motion.div>

      {/* Sipariş detay ve kargolama modal — API'deki tüm alanlar + kargolama */}
      <Modal open={selectedOrder !== null} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <ModalContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <ModalHeader>
            <ModalTitle>
              {selectedOrderItem ? `Sipariş ${selectedOrderItem.orderNumber ?? selectedOrderItem.id}` : 'Sipariş detayı'}
            </ModalTitle>
            <ModalDescription>
              {selectedOrderItem && (
                <>
                  {[selectedOrderItem.user?.firstName, selectedOrderItem.user?.lastName].filter(Boolean).join(' ')} · {selectedOrderItem.quantity} adet · {formatCurrency(Number(selectedOrderItem.totalPrice) || 0)}
                </>
              )}
            </ModalDescription>
          </ModalHeader>
          {(selectedOrderItem || currentOrder) && (
            <ModalBody className="space-y-5 overflow-y-auto flex-1">
              {/* API'den gelen sipariş detayı */}
              {selectedOrderItem && (
                <>
                  <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3">Sipariş bilgileri</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-surface-500 text-xs">Sipariş no</p>
                        <p className="font-semibold font-mono">{selectedOrderItem.orderNumber ?? selectedOrderItem.id}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Müşteri</p>
                        <p className="font-semibold">{[selectedOrderItem.user?.firstName, selectedOrderItem.user?.lastName].filter(Boolean).join(' ')}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Telefon</p>
                        <p className="font-semibold">{selectedOrderItem.user?.phone ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Paket</p>
                        <p className="font-semibold">{selectedOrderItem.salesKit?.name ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Adet</p>
                        <p className="font-semibold">{selectedOrderItem.quantity}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Birim fiyat</p>
                        <p className="font-semibold">{formatCurrency(Number(selectedOrderItem.unitPrice) || 0)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Toplam tutar</p>
                        <p className="font-semibold">{formatCurrency(Number(selectedOrderItem.totalPrice) || 0)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Durum</p>
                        <p className="font-semibold">{selectedOrderItem.status === 'pending' ? 'Beklemede' : selectedOrderItem.status === 'completed' ? 'Tamamlandı' : selectedOrderItem.status ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Ödeme durumu</p>
                        <p className="font-semibold">{selectedOrderItem.paymenStatus === 'paid' ? 'Ödendi' : selectedOrderItem.paymenStatus === 'pending' ? 'Beklemede' : selectedOrderItem.paymenStatus ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Ödeme yöntemi</p>
                        <p className="font-semibold">{paymentMethodLabel(selectedOrderItem.paymentMethod)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Oluşturulma</p>
                        <p className="font-semibold">{selectedOrderItem.createdAt ? formatDate(selectedOrderItem.createdAt) : '—'}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Son güncelleme</p>
                        <p className="font-semibold">{selectedOrderItem.updatedAt ? formatDate(selectedOrderItem.updatedAt) : '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Teslimat adresi */}
                  {selectedOrderItem.address && (
                    <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-2">Teslimat adresi</h4>
                      <p className="text-sm text-surface-800">
                        {selectedOrderItem.address.fullAddress || [selectedOrderItem.address.city, selectedOrderItem.address.district].filter(Boolean).join(', ') || '—'}
                      </p>
                    </div>
                  )}

                  {/* Kargolama özeti (store) */}
                  {currentOrder && (
                    <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-4">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-3">Kargolama</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-surface-500 text-xs">Toplam adet</p>
                          <p className="font-semibold">{currentOrder.qty} kit</p>
                        </div>
                        <div>
                          <p className="text-surface-500 text-xs">Kargoya verilen</p>
                          <p className="font-semibold text-primary-600">{currentOrder.assignedBarcodes.length} kit</p>
                        </div>
                        <div>
                          <p className="text-surface-500 text-xs">Kalan</p>
                          <p className="font-semibold">{remainingQty} kit</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Kargoya verilecek kitler */}
              {remainingQty > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-surface-800">
                    Stokta atanmamış kitler — {remainingQty} adet seçin
                  </h4>
                  <p className="text-xs text-surface-500">
                    Aşağıdan stoktaki (henüz atanmamış) kitleri işaretleyin ve &quot;Diyetisyene ver&quot; butonuna tıklayın.
                  </p>
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-surface-200 bg-white">
                    {availableKits.length === 0 ? (
                      <div className="p-8 text-center text-surface-500">
                        <Package className="h-10 w-10 mx-auto mb-2 text-surface-300" />
                        <p className="text-sm font-medium">Stokta atanmamış kit yok</p>
                        <p className="text-xs mt-1">Üretim merkezinden barkod üretin veya Stok sayfasından stok durumunu kontrol edin.</p>
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
                              {kit.name && <span className="text-xs text-surface-500 truncate max-w-[120px]">{kit.name}</span>}
                              <span className="text-xs text-surface-500 ml-auto">
                                {kit.price != null && kit.price > 0 ? formatCurrency(kit.price) : '—'}
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Zaten kargoya verilen kitler */}
              {currentOrder && currentOrder.assignedBarcodes.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-surface-800">
                    Bu siparişte kargoya verilen kitler
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
