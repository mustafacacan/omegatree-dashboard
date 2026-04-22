import { useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Button, Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Search, ListOrdered, Package, CheckCircle, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { TablePagination } from '@/components/shared/table-pagination'
import { PdfViewer } from '@/components/shared/pdf-viewer'
import { useWorkflowStore } from '@/stores/workflow.store'
import { getOrderById, getOrdersWithPagination, updateOrderStatus, type OrderItem } from '@/services/orders.service'
import {
  OrderKitAssignStep,
  type OrderKitAssignFooterState,
  type OrderKitAssignStepHandle,
} from '@/features/admin/orders/components/order-kit-assign-step'

const ORDERS_QUERY_KEY = ['orders'] as const

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }
const EMPTY_ORDERS: OrderItem[] = []

const KIT_ASSIGN_FOOTER_IDLE: OrderKitAssignFooterState = {
  canAssign: false,
  isAssigning: false,
  selectedCount: 0,
}

export function OrdersPage() {
  const { orders, setOrdersFromApi, approveOrderByAdmin } = useWorkflowStore()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  /** Modal içi adım: 1 = Onayla, 2 = Kit atama, 3 = Tamamla */
  const [modalStep, setModalStep] = useState<1 | 2 | 3>(1)
  const kitAssignStepRef = useRef<OrderKitAssignStepHandle | null>(null)
  const [kitAssignFooter, setKitAssignFooter] = useState<OrderKitAssignFooterState>(KIT_ASSIGN_FOOTER_IDLE)

  const trimmedSearch = useMemo(() => search.trim(), [search])
  const ordersQuery = useQuery({
    queryKey: [...ORDERS_QUERY_KEY, { page, pageSize, search: trimmedSearch }],
    queryFn: () =>
      getOrdersWithPagination({
        page: {
          page,
          limit: pageSize,
          search: trimmedSearch || undefined,
        },
      }),
    placeholderData: keepPreviousData,
  })

  const apiOrders = ordersQuery.data?.items ?? EMPTY_ORDERS
  const totalItems = ordersQuery.data?.totalItems ?? apiOrders.length

  useEffect(() => {
    if (!ordersQuery.isSuccess) return
    // Guard against infinite re-render loops caused by unstable empty-array references.
    setOrdersFromApi(apiOrders)
  }, [ordersQuery.isSuccess, apiOrders, setOrdersFromApi])

  const currentOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrder)
  }, [orders, selectedOrder])

  const selectedOrderItem = useMemo((): OrderItem | null => {
    if (!selectedOrder || !apiOrders.length) return null
    return apiOrders.find((o) => String(o.id) === selectedOrder) ?? null
  }, [selectedOrder, apiOrders])

  const {
    data: selectedOrderDetail,
    isLoading: selectedOrderDetailLoading,
    isError: selectedOrderDetailError,
  } = useQuery({
    queryKey: ['orders', 'detail', selectedOrder],
    queryFn: async () => {
      const id = Number(selectedOrder)
      if (!Number.isFinite(id)) throw new Error('Geçersiz sipariş id')
      return getOrderById(id)
    },
    enabled: selectedOrder !== null,
  })

  useEffect(() => {
    if (selectedOrderDetailError) {
      toast.error('Sipariş detayı alınamadı')
    }
  }, [selectedOrderDetailError])

  const orderDetailForUi = useMemo((): OrderItem | null => {
    if (!selectedOrderDetail) return selectedOrderItem
    const raw = selectedOrderDetail as unknown
    const rawObj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    const d =
      rawObj && typeof rawObj.data === 'object' && rawObj.data !== null
        ? (rawObj.data as Record<string, unknown>)
        : (rawObj ?? {})

    const idNum = Number(d.id)
    const unitPriceNum = Number(d.unitPrice)
    const totalPriceNum = Number(d.totalPrice)

    return {
      ...(selectedOrderItem ?? { id: Number.isFinite(idNum) ? idNum : 0, quantity: 0 }),
      id: Number.isFinite(idNum) ? idNum : (selectedOrderItem?.id ?? 0),
      quantity: Number(d.quantity) || (selectedOrderItem?.quantity ?? 0),
      unitPrice: Number.isFinite(unitPriceNum) ? unitPriceNum : (selectedOrderItem?.unitPrice ?? undefined),
      totalPrice: Number.isFinite(totalPriceNum) ? totalPriceNum : (selectedOrderItem?.totalPrice ?? undefined),
      status: (d.status as string | undefined) ?? selectedOrderItem?.status,
      paymentMethod: (d.paymentMethod as string | undefined) ?? selectedOrderItem?.paymentMethod,
      paymenStatus: (d.paymenStatus as string | undefined) ?? selectedOrderItem?.paymenStatus,
      createdAt: (d.createdAt as string | undefined) ?? selectedOrderItem?.createdAt,
      updatedAt: (d.updatedAt as string | undefined) ?? selectedOrderItem?.updatedAt,
      user: (d.user as OrderItem['user'] | undefined) ?? selectedOrderItem?.user,
      salesKit: (d.salesKit as OrderItem['salesKit'] | undefined) ?? selectedOrderItem?.salesKit,
      address: (d.address as OrderItem['address'] | undefined) ?? selectedOrderItem?.address,
      orderNumber: (d.orderNumber as string | undefined) ?? selectedOrderItem?.orderNumber,
      dekontMediaId: (d.dekontMediaId as number | null | undefined) ?? selectedOrderItem?.dekontMediaId,
    }
  }, [selectedOrderDetail, selectedOrderItem])

  const dekontUrl = useMemo((): string | null => {
    if (!selectedOrderDetail) return null
    const raw = selectedOrderDetail as unknown
    const rawObj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null
    const data =
      rawObj && typeof rawObj.data === 'object' && rawObj.data !== null
        ? (rawObj.data as Record<string, unknown>)
        : (rawObj ?? {})

    const url =
      (data.dekontMedia && typeof data.dekontMedia === 'object'
        ? (data.dekontMedia as Record<string, unknown>).url
        : undefined) ??
      data.dekontMediaUrl ??
      data.dekontUrl

    return typeof url === 'string' && url.trim().length > 0 ? url : null
  }, [selectedOrderDetail])

  const dekontIsPdf = useMemo(() => {
    if (!dekontUrl) return false
    return /\.pdf($|\?|#)/i.test(dekontUrl)
  }, [dekontUrl])

  const remainingQty = currentOrder ? currentOrder.qty - currentOrder.assignedBarcodes.length : 0

  /** API satırı: quantity × salesKit.quantity = zimmetlenecek toplam fiziksel kit (store ile aynı mantık) */
  const orderFulfillmentKitCount = useMemo(() => {
    if (!orderDetailForUi) return 0
    const line = Math.max(0, Math.floor(Number(orderDetailForUi.quantity) || 0))
    const sk = orderDetailForUi.salesKit?.quantity
    const per =
      sk != null && Number.isFinite(Number(sk)) ? Math.max(1, Math.floor(Number(sk))) : null
    return per != null ? line * per : line
  }, [orderDetailForUi?.quantity, orderDetailForUi?.salesKit?.quantity])

  /** Adım 1: Siparişi onayla (dekont/ödeme kontrolü) — sadece store, API'ye gitmez */
  const handleApproveOrder = () => {
    if (!selectedOrder) return
    approveOrderByAdmin(selectedOrder)
    setModalStep(remainingQty > 0 ? 2 : 3)
    toast.success('Sipariş onaylandı. Sıradaki adıma geçebilirsiniz.')
  }

  /** Adım 2: Siparişi tamamla — API'de status = completed */
  const completeOrderMutation = useMutation({
    mutationFn: async () => {
      const id = Number(selectedOrder)
      if (!Number.isFinite(id)) throw new Error('Geçersiz sipariş id')
      return updateOrderStatus(id, 'completed')
    },
    onSuccess: async () => {
      toast.success('Sipariş tamamlandı')
      await queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      if (selectedOrder) {
        await queryClient.invalidateQueries({ queryKey: ['orders', 'detail', selectedOrder] })
      }
    },
    onError: () => {
      toast.error('Sipariş tamamlanamadı')
    },
  })

  useEffect(() => {
    setPage(1)
  }, [trimmedSearch])

  useEffect(() => {
    if (modalStep !== 2) setKitAssignFooter(KIT_ASSIGN_FOOTER_IDLE)
  }, [modalStep])

  /** Modal açıldığında başlangıç adımını belirle */
  useEffect(() => {
    if (!selectedOrder || !currentOrder) return
    if (orderDetailForUi?.status === 'completed') return
    if (!currentOrder.approvedByAdmin) setModalStep(1)
    else if (remainingQty > 0) setModalStep(2)
    else setModalStep(3)
  }, [selectedOrder])

  const handleOpenOrder = (orderId: string) => {
    setSelectedOrder(orderId)
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

      {/* Siparişler tablosu */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
            <div>
              <h3 className="text-[15px] font-semibold text-surface-900">Siparişler</h3>
              <p className="text-[12px] mt-0.5 text-surface-500">
                Ödemesi diyetisyen panelinde yapılan siparişler ({totalItems} sipariş)
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
              <input
                type="text"
                placeholder="Sipariş no, müşteri veya paket ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-56 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Sipariş No</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Müşteri</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Paket</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Adet</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Tutar</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Ödeme</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Tarih</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {ordersQuery.isLoading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                      <p className="text-[12px] text-surface-500">Sipariş listesi yükleniyor...</p>
                    </td>
                  </tr>
                ) : apiOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
                      <Package className="h-10 w-10 mx-auto mb-2 text-surface-400" />
                      <p className="text-[12px] font-medium text-surface-700">Sipariş bulunamadı</p>
                      <p className="text-[11px] mt-0.5 text-surface-500">
                        {search.trim() ? 'Arama kriterine uygun sipariş yok.' : 'Henüz sipariş kaydı yok.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  apiOrders.map((order: OrderItem) => {
                    const userName = [order.user?.firstName, order.user?.lastName].filter(Boolean).join(' ') || '—'
                    const totalPrice = typeof order.totalPrice === 'string' ? Number.parseFloat(order.totalPrice) : Number(order.totalPrice)
                    const storeOrder = orders.find((o) => o.id === String(order.id))
                    const statusLabel = storeOrder ? getOrderStatusLabel(storeOrder) : (order.status === 'pending' ? 'Beklemede' : order.status === 'completed' ? 'Tamamlandı' : order.status ?? '—')
                    const paymentLabel = order.paymenStatus === 'paid' ? 'Ödendi' : order.paymenStatus === 'pending' ? 'Beklemede' : (order.paymentMethod ?? order.paymenStatus) ?? '—'
                    return (
                      <tr
                        key={order.id}
                        className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40"
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] font-mono font-semibold text-surface-900">{order.orderNumber ?? order.id}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-surface-700">{userName}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-surface-700">{order.salesKit?.name ?? '—'}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[12px] tabular-nums text-surface-700">{order.quantity}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[12px] font-semibold tabular-nums text-surface-900">{formatCurrency(Number.isFinite(totalPrice) ? totalPrice : 0)}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              storeOrder && storeOrder.assignedBarcodes.length >= storeOrder.qty
                                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                                : storeOrder && storeOrder.assignedBarcodes.length > 0
                                  ? 'bg-surface-200 dark:bg-surface-300/50 text-surface-700'
                                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              order.paymenStatus === 'paid'
                                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                                : 'bg-surface-200 dark:bg-surface-300/50 text-surface-500'
                            }`}
                          >
                            {paymentLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-surface-500">{order.createdAt ? formatDate(order.createdAt) : '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1">
                            {order.status !== 'completed' && !storeOrder?.approvedByAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[11px] h-7 px-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  approveOrderByAdmin(String(order.id))
                                  toast.success('Sipariş onaylandı')
                                }}
                                title="Dekont/ödeme kontrolü yapıldı, siparişi onayla"
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Onayla
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[11px] h-7 px-2"
                              onClick={() => handleOpenOrder(String(order.id))}
                              aria-label="Sipariş detayı"
                              title="Sipariş detayı — onay, kit atama, tamamlama"
                            >
                              <ListOrdered className="h-3.5 w-3.5 mr-1" />
                              Detay
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
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

      {/* Sipariş detay modal — adım adım: 1 Onayla, 2 Kit atama, 3 Tamamla */}
      <Modal open={selectedOrder !== null} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <ModalContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <ModalHeader>
            <ModalTitle>
              {orderDetailForUi ? `Sipariş ${orderDetailForUi.orderNumber ?? orderDetailForUi.id}` : 'Sipariş detayı'}
            </ModalTitle>
            <ModalDescription>
              {orderDetailForUi && (
                <>
                  {[orderDetailForUi.user?.firstName, orderDetailForUi.user?.lastName].filter(Boolean).join(' ')} · {orderDetailForUi.quantity} adet · {formatCurrency(Number(orderDetailForUi.totalPrice) || 0)}
                </>
              )}
            </ModalDescription>
          </ModalHeader>

          {(orderDetailForUi || currentOrder || selectedOrderDetailLoading) && orderDetailForUi?.status !== 'completed' && (
            <>
              {/* Stepper: 1 — 2 — 3 */}
              <div className="px-6 pt-1 pb-2 border-b border-surface-200">
                <div className="flex items-center gap-2">
                  {[
                    { step: 1 as const, label: 'Onayla' },
                    { step: 2 as const, label: 'Kit atama' },
                    { step: 3 as const, label: 'Tamamla' },
                  ].map(({ step, label }, i) => {
                    const isActive = modalStep === step
                    const isDone = (step === 1 && currentOrder?.approvedByAdmin) || (step === 2 && modalStep === 3) || (step === 2 && remainingQty === 0 && currentOrder?.approvedByAdmin)
                    return (
                      <div key={step} className="flex items-center gap-2 flex-1">
                        <div
                          className={isActive ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-sm text-white bg-primary-500' : isDone ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-sm text-white bg-green-600' : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium border-2 border-surface-300 text-surface-500'}
                        >
                          {isDone && !isActive ? <CheckCircle className="h-4 w-4" /> : step}
                        </div>
                        <span className={`text-xs font-medium ${isActive ? 'text-surface-900 dark:text-surface-100' : 'text-surface-500'}`}>{label}</span>
                        {i < 2 && <div className={`flex-1 h-0.5 min-w-[12px] rounded ${isDone ? 'bg-primary-500' : 'bg-surface-200'}`} />}
                      </div>
                    )
                  })}
                </div>
              </div>

              <ModalBody className="space-y-5 overflow-y-auto flex-1">
                {selectedOrderDetailLoading && (
                  <div className="py-10 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                    <p className="text-sm text-surface-500">Sipariş detayı yükleniyor...</p>
                  </div>
                )}

                {/* Adım 1: Onayla — özet + dekont */}
                {!selectedOrderDetailLoading && orderDetailForUi && modalStep === 1 && (
                  <div className="space-y-4">
                    <p className="text-sm text-surface-600">Dekont ve ödemeyi kontrol edin, ardından siparişi onaylayın.</p>
                    <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-surface-500 text-xs">Sipariş no</p>
                        <p className="font-semibold font-mono">{orderDetailForUi.orderNumber ?? orderDetailForUi.id}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Müşteri</p>
                        <p className="font-semibold">{[orderDetailForUi.user?.firstName, orderDetailForUi.user?.lastName].filter(Boolean).join(' ')}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Ödeme</p>
                        <p className="font-semibold">{orderDetailForUi.paymenStatus === 'paid' ? 'Ödendi' : 'Beklemede'}</p>
                      </div>
                      <div>
                        <p className="text-surface-500 text-xs">Toplam</p>
                        <p className="font-semibold">{formatCurrency(Number(orderDetailForUi.totalPrice) || 0)}</p>
                      </div>
                    </div>
                    {orderDetailForUi.address && (
                      <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-3">
                        <p className="text-surface-500 text-xs mb-1">Teslimat</p>
                        <p className="text-sm">{orderDetailForUi.address.fullAddress || [orderDetailForUi.address.city, orderDetailForUi.address.district].filter(Boolean).join(', ') || '—'}</p>
                      </div>
                    )}
                    <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">Dekont</h4>
                        {dekontUrl && (
                          <Button variant="outline" size="sm" onClick={() => window.open(dekontUrl!, '_blank', 'noopener,noreferrer')}>Dosyayı aç</Button>
                        )}
                      </div>
                      {!dekontUrl ? (
                        <p className="text-sm text-surface-600">Dekont yüklenmemiş.</p>
                      ) : dekontIsPdf ? (
                        <PdfViewer file={dekontUrl} maxHeight="40vh" />
                      ) : (
                        <img src={dekontUrl} alt="Dekont" className="w-full max-h-[40vh] object-contain rounded-lg border border-surface-200" loading="lazy" />
                      )}
                    </div>
                  </div>
                )}

                {/* Adım 2: Kit atama — stok API + POST /kits/assign (stok sayfasıyla aynı) */}
                {!selectedOrderDetailLoading && orderDetailForUi && modalStep === 2 && selectedOrder && (
                  <OrderKitAssignStep
                    ref={kitAssignStepRef}
                    onAssignFooterState={setKitAssignFooter}
                    orderUserId={orderDetailForUi.user?.id}
                    orderClientName={
                      [orderDetailForUi.user?.firstName, orderDetailForUi.user?.lastName]
                        .filter(Boolean)
                        .join(' ') || '—'
                    }
                    remainingSlots={remainingQty}
                    orderedQuantity={currentOrder?.qty ?? orderFulfillmentKitCount}
                    salesKitQuantity={
                      orderDetailForUi.salesKit?.quantity != null
                        ? Number(orderDetailForUi.salesKit.quantity)
                        : null
                    }
                    workflowOrderId={selectedOrder}
                    onAssigned={({ nowComplete }) => {
                      if (nowComplete) setModalStep(3)
                    }}
                  />
                )}

                {/* Adım 3: Tamamla */}
                {!selectedOrderDetailLoading && orderDetailForUi && modalStep === 3 && (
                  <div className="space-y-4">
                    <p className="text-sm text-surface-600">Siparişi sistemde tamamlandı olarak işaretleyeceksiniz. Bu işlemden sonra sipariş &quot;Tamamlandı&quot; görünecektir.</p>
                    <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-4 text-sm">
                      <p><strong>{orderDetailForUi.orderNumber ?? orderDetailForUi.id}</strong> · {[orderDetailForUi.user?.firstName, orderDetailForUi.user?.lastName].filter(Boolean).join(' ')} · {formatCurrency(Number(orderDetailForUi.totalPrice) || 0)}</p>
                      {currentOrder && currentOrder.assignedBarcodes.length > 0 && (
                        <p className="text-surface-600 mt-1">{currentOrder.assignedBarcodes.length} kit diyetisyene atandı.</p>
                      )}
                    </div>
                  </div>
                )}

                {orderDetailForUi?.status === 'completed' && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-green-800">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2" />
                    <p className="font-medium">Bu sipariş tamamlandı.</p>
                  </div>
                )}
              </ModalBody>

              <ModalFooter className="gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Kapat</Button>

                {modalStep === 1 && orderDetailForUi && !currentOrder?.approvedByAdmin && (
                  <Button variant="primary" onClick={handleApproveOrder}>
                    <CheckCircle className="h-4 w-4" />
                    Siparişi onayla
                  </Button>
                )}

                {modalStep === 2 && (
                  <>
                    <Button
                      variant="primary"
                      disabled={!kitAssignFooter.canAssign}
                      onClick={() => kitAssignStepRef.current?.submitAssign()}
                    >
                      {kitAssignFooter.isAssigning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Zimmetle ({kitAssignFooter.selectedCount})
                    </Button>
                    <Button variant="outline" onClick={() => setModalStep(3)}>
                      Tamamla&apos;ya geç
                    </Button>
                  </>
                )}

                {modalStep === 3 && orderDetailForUi && currentOrder?.approvedByAdmin && (
                  <Button
                    variant="primary"
                    onClick={() => completeOrderMutation.mutate()}
                    disabled={completeOrderMutation.isPending}
                  >
                    {completeOrderMutation.isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Tamamlanıyor</>
                    ) : (
                      <><CheckCircle className="h-4 w-4" /> Siparişi tamamla</>
                    )}
                  </Button>
                )}
              </ModalFooter>
            </>
          )}

          {/* Sipariş zaten tamamlandıysa sadece bilgi + Kapat */}
          {orderDetailForUi?.status === 'completed' && (
            <>
              <ModalBody>
                <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center text-green-800">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3" />
                  <p className="font-medium">Bu sipariş tamamlandı.</p>
                  <p className="text-sm mt-1">{orderDetailForUi.orderNumber ?? orderDetailForUi.id}</p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Kapat</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
