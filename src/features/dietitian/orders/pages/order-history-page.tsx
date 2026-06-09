import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { PanelHeader } from '@/components/shared/panel-header'
import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { Truck, Copy, Upload, Loader2, ListOrdered } from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/stores/auth.store'
import { motion } from 'framer-motion'
import { getOrders, getOrderById, uploadOrderDekont, type Order } from '@/services/orders.service'
import { ROUTES } from '@/utils/routes'

const ORDERS_QUERY_KEY = ['orders'] as const

const fadeUp = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }

export function DietitianOrderHistoryPage() {
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dekontTargetOrderId, setDekontTargetOrderId] = useState<number | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  const { data: ordersFromApi = [], isLoading: ordersLoading } = useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: () => getOrders(),
  })

  const uploadDekontMutation = useMutation({
    mutationFn: ({ orderId, file }: { orderId: number; file: File }) =>
      uploadOrderDekont({ orderId, file }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', orderId] })
      toast.success('Dekont yüklendi.')
    },
    onError: (err: { response?: { data?: { message?: string; errors?: string[] } } }) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Dekont yüklenemedi. Lütfen tekrar deneyin.' }))
    },
    onSettled: () => {
      setDekontTargetOrderId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
  })

  const myOrders: Order[] = ordersFromApi.filter(
    (o) => o.user?.id != null && String(o.user.id) === String(user?.id)
  )

  const { data: orderDetailResponse, isLoading: orderDetailLoading } = useQuery({
    queryKey: ['orders', 'detail', selectedOrderId],
    queryFn: () => getOrderById(selectedOrderId!),
    enabled: selectedOrderId != null,
  })

  const orderDetail = ((): Order | null => {
    if (!orderDetailResponse) return null
    const raw = orderDetailResponse as unknown as Record<string, unknown>
    if (raw?.data && typeof raw.data === 'object' && raw.data !== null) {
      return raw.data as Order
    }
    return orderDetailResponse as unknown as Order
  })()

  const handlePickDekont = (orderId: number) => {
    setDekontTargetOrderId(orderId)
    fileInputRef.current?.click()
  }

  const handleDekontSelected = (file: File | null) => {
    if (!file) {
      setDekontTargetOrderId(null)
      return
    }
    if (dekontTargetOrderId == null) {
      toast.error('Sipariş bulunamadı.')
      return
    }
    uploadDekontMutation.mutate({ orderId: dekontTargetOrderId, file })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={(e) => handleDekontSelected(e.target.files?.[0] ?? null)}
      />

      <PageHeader />

      <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <PanelHeader
            title="Siparişlerim"
            description={`Tüm siparişleriniz ve ödeme durumları (${myOrders.length} sipariş)`}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Sipariş No</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Paket · Adet</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Tarih</th>
                  <th className="text-right text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Tutar</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Ödeme</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                      <p className="text-[12px] text-surface-500">Siparişler yükleniyor...</p>
                    </td>
                  </tr>
                ) : myOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <Truck className="h-10 w-10 mx-auto mb-2 text-surface-400" />
                      <p className="text-[12px] font-medium text-surface-700">Henüz siparişiniz yok</p>
                      <p className="text-[11px] mt-0.5 text-surface-500">
                        <Link to={ROUTES.DIYETISYEN_SIPARISLER} className="text-primary-600 font-medium hover:underline">
                          Sipariş ver
                        </Link>
                        {' '}sayfasından ilk siparişinizi oluşturabilirsiniz.
                      </p>
                    </td>
                  </tr>
                ) : (
                  myOrders.map((order) => {
                    const paid = order.paymenStatus === 'paid'
                    const statusLabel =
                      order.status === 'completed'
                        ? 'Tamamlandı'
                        : order.status === 'cancelled'
                          ? 'İptal'
                          : 'Beklemede'
                    const hasDekont = order.dekontMediaId != null
                    const canUploadDekont =
                      !paid && (order.paymentMethod === 'havale' || order.paymentMethod === 'eft')
                    const isUploadingThis =
                      uploadDekontMutation.isPending && dekontTargetOrderId === order.id
                    const orderNum = order.orderNumber ?? `#${order.id}`
                    const totalPrice = formatCurrency(Number(order.totalPrice) || 0)
                    const kitName = order.salesKit?.name ?? '—'

                    return (
                      <tr
                        key={order.id}
                        className="transition-colors border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-mono font-semibold text-surface-900">{orderNum}</span>
                            <button
                              type="button"
                              onClick={() => {
                                void navigator.clipboard.writeText(orderNum).then(() =>
                                  toast.success('Sipariş numarası kopyalandı')
                                )
                              }}
                              className="p-1 rounded hover:bg-surface-200 transition-colors"
                              title="Kopyala"
                            >
                              <Copy className="h-3.5 w-3.5 text-surface-500" />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-surface-700">{kitName}</span>
                          <span className="text-[11px] text-surface-500 ml-1">· {order.quantity} paket</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-[12px] text-surface-600">{formatDate(order.createdAt ?? '')}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-[12px] font-semibold tabular-nums text-surface-900">{totalPrice}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              paid
                                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                            }`}
                          >
                            {paid ? 'Ödendi' : 'Ödeme bekleniyor'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                              order.status === 'completed'
                                ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
                                : order.status === 'cancelled'
                                  ? 'bg-surface-200 dark:bg-surface-300/50 text-surface-600'
                                  : 'bg-surface-200 dark:bg-surface-300/50 text-surface-700'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[11px] h-7 px-2"
                              onClick={() => setSelectedOrderId(order.id)}
                              title="Sipariş detayı"
                            >
                              <ListOrdered className="h-3.5 w-3.5 mr-1" />
                              Detay
                            </Button>
                            {canUploadDekont ? (
                              hasDekont ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                  Dekont eklendi
                                </span>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[11px] h-7 px-2"
                                  onClick={() => handlePickDekont(order.id)}
                                  disabled={uploadDekontMutation.isPending}
                                >
                                  <Upload className="h-3.5 w-3.5 mr-1" />
                                  {isUploadingThis ? 'Yükleniyor...' : 'Dekont ekle'}
                                </Button>
                              )
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.section>

      {/* Sipariş detay modal */}
      <Modal open={selectedOrderId != null} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>
              Sipariş detayı {orderDetail ? `— ${orderDetail.orderNumber ?? `#${orderDetail.id}`}` : ''}
            </ModalTitle>
            <ModalDescription>
              {orderDetail && (
                <>
                  {orderDetail.salesKit?.name ?? '—'} · {orderDetail.quantity} paket · {formatCurrency(Number(orderDetail.totalPrice) || 0)}
                </>
              )}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {orderDetailLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                <p className="text-sm text-surface-500">Sipariş yükleniyor...</p>
              </div>
            ) : orderDetail ? (
              <>
                <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">Sipariş no</p>
                    <p className="font-mono font-semibold text-surface-900">{orderDetail.orderNumber ?? `#${orderDetail.id}`}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">Tarih</p>
                    <p className="font-medium text-surface-800">{formatDate(orderDetail.createdAt ?? '')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">Paket</p>
                    <p className="font-medium text-surface-800">{orderDetail.salesKit?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">Paket adedi</p>
                    <p className="font-medium text-surface-800">{orderDetail.quantity}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">Birim fiyat</p>
                    <p className="font-medium text-surface-800 tabular-nums">{formatCurrency(Number(orderDetail.unitPrice) || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">Toplam</p>
                    <p className="font-bold text-surface-900 tabular-nums">{formatCurrency(Number(orderDetail.totalPrice) || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">Ödeme durumu</p>
                    <p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          orderDetail.paymenStatus === 'paid'
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        }`}
                      >
                        {orderDetail.paymenStatus === 'paid' ? 'Ödendi' : 'Ödeme bekleniyor'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500">Sipariş durumu</p>
                    <p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                          orderDetail.status === 'completed'
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                            : orderDetail.status === 'cancelled'
                              ? 'bg-surface-200 text-surface-600 dark:bg-surface-300/40 dark:text-surface-700'
                              : 'bg-surface-200 text-surface-700 dark:bg-surface-300/40 dark:text-surface-700'
                        }`}
                      >
                        {orderDetail.status === 'completed'
                          ? 'Tamamlandı'
                          : orderDetail.status === 'cancelled'
                            ? 'İptal'
                            : 'Beklemede'}
                      </span>
                    </p>
                  </div>
                </div>
                {orderDetail.address && (
                  <div className="rounded-xl border border-surface-200 dark:border-surface-600 bg-surface-50/50 dark:bg-surface-200/40 p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary mb-1">Teslimat adresi</p>
                    <p className="text-sm text-text-primary">
                      {orderDetail.address.fullAddress ||
                        [orderDetail.address.city, orderDetail.address.district].filter(Boolean).join(', ') ||
                        '—'}
                    </p>
                  </div>
                )}
                {!orderDetail.paymenStatus?.includes('paid') &&
                  (orderDetail.paymentMethod === 'havale' || orderDetail.paymentMethod === 'eft') && (
                    <div className="rounded-xl border border-surface-200 bg-surface-50/50 p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-surface-500 mb-0.5">Dekont</p>
                        <p className="text-xs text-surface-600">
                          {orderDetail.dekontMediaId != null ? 'Dekont yüklendi.' : 'EFT/Havale için dekont yükleyin.'}
                        </p>
                      </div>
                      {orderDetail.dekontMediaId == null && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handlePickDekont(orderDetail.id)
                          }}
                          disabled={uploadDekontMutation.isPending}
                        >
                          <Upload className="h-3.5 w-3.5 mr-1" />
                          {uploadDekontMutation.isPending && dekontTargetOrderId === orderDetail.id
                            ? 'Yükleniyor...'
                            : 'Dekont ekle'}
                        </Button>
                      )}
                    </div>
                  )}
              </>
            ) : (
              <p className="text-sm text-surface-500 py-4">Sipariş bilgisi alınamadı.</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setSelectedOrderId(null)}>
              Kapat
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
