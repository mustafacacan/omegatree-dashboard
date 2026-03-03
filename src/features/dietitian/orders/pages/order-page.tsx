import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Input, Badge } from '@/components/ui'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { ShoppingCart, Package, Truck, Check, Info, ImageIcon, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrentUser } from '@/stores/auth.store'
import { motion } from 'framer-motion'
import { getSalesKits, getSalesKitImageUrl, type SalesKit } from '@/services/sales-kits.service'
import { createOrder, getOrders, uploadOrderDekont, type Order } from '@/services/orders.service'
import { SalesKitImage } from '@/components/shared/sales-kit-image'

const W = {
  olive: '#8B9A4B',
  oliveLight: '#EEF2DE',
  orange: '#E8913A',
  orangeLight: '#FDF0E2',
  green: '#6ABF69',
  greenLight: '#E8F5E8',
  cream: '#F9F7F3',
  creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
  warmGrayLight: '#B5AFA5',
}

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

const ORDERS_QUERY_KEY = ['orders'] as const

export function DietitianOrderPage() {
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const [selectedKit, setSelectedKit] = useState<SalesKit | null>(null)
  const [orderQty, setOrderQty] = useState(1)
  const [address, setAddress] = useState('')
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dekontTargetOrderId, setDekontTargetOrderId] = useState<number | null>(null)

  const { data: salesKits = [], isLoading: kitsLoading } = useQuery({
    queryKey: ['sales-kits'],
    queryFn: getSalesKits,
  })

  const { data: ordersFromApi = [], isLoading: ordersLoading } = useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: () => getOrders(),
  })

  const createOrderMutation = useMutation({
    mutationFn: ({ salesKitId, quantity }: { salesKitId: number; quantity: number }) =>
      createOrder(salesKitId, {
        quantity,
        paymentMethod: 'havale',
        isPaid: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      toast.success('Siparis basariyla olusturuldu.')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Siparis olusturulamadi.' }))
    },
  })

  const uploadDekontMutation = useMutation({
    mutationFn: ({ orderId, file }: { orderId: number; file: File }) =>
      uploadOrderDekont({ orderId, file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      toast.success('Dekont yuklendi.')
    },
    onError: (err: { response?: { data?: { message?: string; errors?: string[] } } }) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Dekont yuklenemedi.' }))
    },
    onSettled: () => {
      setDekontTargetOrderId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
  })

  const myOrders: Order[] = ordersFromApi.filter(
    (o) => o.user?.id != null && String(o.user.id) === String(user?.id)
  )

  const maxQty = selectedKit ? Math.max(1, Math.min(selectedKit.quantity, 999)) : 1
  const safeQty = selectedKit ? Math.min(maxQty, Math.max(1, orderQty)) : 0
  const total = selectedKit ? selectedKit.price * safeQty : 0

  const handleSelectKit = (kit: SalesKit) => {
    setSelectedKit(kit)
    setOrderQty(1)
  }

  const handleCreateOrder = () => {
    if (!selectedKit) {
      toast.error('Lutfen bir fiyat paketi secin')
      return
    }
    if (safeQty <= 0) {
      toast.error('Gecerli adet girin')
      return
    }
    if (!address.trim()) {
      toast.error('Teslimat adresi gerekli')
      return
    }
    if (!user?.id) {
      toast.error('Kullanici bilgisi bulunamadi')
      return
    }

    createOrderMutation.mutate(
      { salesKitId: selectedKit.id, quantity: safeQty },
      {
        onSuccess: () => {
          setSelectedKit(null)
          setOrderQty(1)
          setAddress('')
        },
      }
    )
  }

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
      toast.error('Siparis bulunamadi')
      return
    }

    uploadDekontMutation.mutate({ orderId: dekontTargetOrderId, file })
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={(e) => handleDekontSelected(e.target.files?.[0] ?? null)}
      />

      {/* Aciklama */}
      <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
        <div
          className="rounded-2xl p-4 flex items-start gap-3 border"
          style={{ background: W.cream, borderColor: W.warmBorder }}
        >
          <Info className="h-5 w-5 shrink-0 mt-0.5" style={{ color: W.olive }} />
          <div>
            <p className="text-[13px] font-medium" style={{ color: W.dark }}>
              Fiyatlar ve paketler
            </p>
            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: W.text }}>
              Asagidaki paketlerden birini secin; toplu alimda indirim uygulanir. Siparis toplami otomatik hesaplanir.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Fiyat paketleri — admin fiyatlandirma ile ayni kart yapisi */}
      {kitsLoading ? (
        <div className="py-12 text-center text-sm" style={{ color: W.textLight }}>
          Paketler yukleniyor...
        </div>
      ) : salesKits.length === 0 ? (
        <div className="py-12 text-center text-sm rounded-2xl border" style={{ color: W.textLight, borderColor: W.warmBorder, background: W.cream }}>
          Henuz fiyat paketi tanimlanmamis.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {salesKits.map((k, i) => {
            const imageUrl = getSalesKitImageUrl(k.imageData?.url ?? k.imageUrl)
            const showImg = imageUrl && !failedImageIds.has(k.id)
            const isSelected = selectedKit?.id === k.id
            return (
              <motion.div key={k.id} {...fadeUp} transition={{ duration: 0.3, delay: 0.05 + i * 0.04 }}>
                <button
                  type="button"
                  onClick={() => handleSelectKit(k)}
                  className="w-full h-full text-left rounded-xl border-2 transition-all overflow-hidden flex flex-col"
                  style={{
                    background: isSelected ? W.oliveLight : '#fff',
                    borderColor: isSelected ? W.olive : W.warmBorder,
                    boxShadow: isSelected ? '0 0 0 2px rgba(139,154,75,0.25)' : undefined,
                  }}
                >
                  <div className="aspect-[4/3] relative overflow-hidden" style={{ background: W.cream }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="h-14 w-14 opacity-50" style={{ color: W.textLight }} />
                    </div>
                    {showImg && imageUrl ? (
                      <div className="absolute inset-0">
                        <SalesKitImage
                          url={imageUrl}
                          alt={k.name}
                          className="w-full h-full object-cover"
                          onError={() => setFailedImageIds((prev) => new Set(prev).add(k.id))}
                        />
                      </div>
                    ) : null}
                    <div className="absolute top-2 right-2">
                      <Badge variant="outline" className="bg-white/90 backdrop-blur text-xs">
                        Stok: {k.quantity} adet
                      </Badge>
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 left-2 h-8 w-8 rounded-full flex items-center justify-center" style={{ background: W.olive }}>
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-surface-800 truncate" style={{ color: W.dark }}>
                      {k.name}
                    </h3>
                    <p className="text-sm mt-1 line-clamp-2 min-h-[2.5rem]" style={{ color: W.textLight }}>
                      {k.description || '—'}
                    </p>
                    <div className="mt-3 pt-3 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${W.warmBorder}` }}>
                      <span className="font-bold text-lg tabular-nums" style={{ color: W.dark }}>
                        {formatCurrency(k.price)}
                      </span>
                      <span className="text-xs" style={{ color: W.textLight }}>adet</span>
                    </div>
                  </div>
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Siparis Ver karti */}
      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card className="overflow-hidden border-0 shadow-sm" style={{ border: `1px solid ${W.warmBorder}`, borderRadius: '1rem' }}>
          <div className="p-5 border-b" style={{ borderColor: W.warmBorder, background: W.oliveLight }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <ShoppingCart className="h-6 w-6" style={{ color: W.olive }} />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold" style={{ color: W.dark }}>Siparis Ver</h3>
                <p className="text-[12px] mt-0.5" style={{ color: W.text }}>
                  Paket secin, teslimat adresini girin ve siparisi tamamlayin
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-5">
            {selectedKit && (
              <div className="mb-4 rounded-xl p-4 border" style={{ background: W.oliveLight, borderColor: W.warmBorder }}>
                <p className="text-[13px] font-medium mb-2" style={{ color: W.dark }}>Secilen paket: {selectedKit.name}</p>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-[13px]" style={{ color: W.text }}>Adet:</label>
                    <input
                      type="number"
                      min={1}
                      max={maxQty}
                      value={safeQty}
                      onChange={(e) => setOrderQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))}
                      className="w-20 rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: W.warmBorder }}
                    />
                  </div>
                  <span className="text-[13px]" style={{ color: W.text }}>
                    Birim {formatCurrency(selectedKit.price)} · Toplam <strong style={{ color: W.dark }}>{formatCurrency(total)}</strong>
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Teslimat Adresi"
                placeholder="Klinik adresi"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <div className="flex flex-col justify-end gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleCreateOrder}
                  disabled={!selectedKit || safeQty <= 0 || !address.trim() || createOrderMutation.isPending}
                  style={{ background: W.olive }}
                >
                  <Package className="h-4 w-4" />
                  {createOrderMutation.isPending ? 'Gonderiliyor...' : `Siparis Ver — ${formatCurrency(total)}`}
                </Button>
              </div>
            </div>
            {selectedKit && (
              <div className="rounded-xl p-4 border" style={{ background: W.cream, borderColor: W.warmBorder }}>
                <div className="flex items-center justify-between text-[13px]">
                  <span style={{ color: W.text }}>Secilen: {selectedKit.name} · {safeQty} adet</span>
                  <span className="font-semibold" style={{ color: W.dark }}>{formatCurrency(selectedKit.price)} / adet</span>
                </div>
                <div className="flex items-center justify-between text-[13px] mt-2 pt-2" style={{ borderTop: `1px solid ${W.warmBorder}` }}>
                  <span style={{ color: W.text }}>Toplam</span>
                  <span className="font-bold text-lg" style={{ color: W.dark }}>{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Siparis Gecmisi */}
      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.15 }}>
        <Card className="overflow-hidden border-0 shadow-sm" style={{ border: `1px solid ${W.warmBorder}`, borderRadius: '1rem' }}>
          <CardHeader className="pb-3" style={{ borderBottom: `1px solid ${W.creamDark}` }}>
            <CardTitle className="text-[15px] font-semibold" style={{ color: W.dark }}>Siparis Gecmisim</CardTitle>
            <CardDescription className="text-[12px]" style={{ color: W.textLight }}>Onceki siparisleriniz ve durumlari</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {ordersLoading ? (
              <div className="text-center py-10" style={{ color: W.textLight }}>
                <p className="text-[13px]">Siparisler yukleniyor...</p>
              </div>
            ) : myOrders.length === 0 ? (
              <div className="text-center py-10" style={{ color: W.textLight }}>
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-[13px]">Henuz siparisiniz yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((order) => {
                  const paid = order.paymenStatus === 'paid'
                  const statusLabel = order.status === 'completed' ? 'Tamamlandi' : order.status === 'cancelled' ? 'Iptal' : 'Beklemede'
                  const hasDekont = order.dekontMediaId != null
                  const canUploadDekont = !paid && (order.paymentMethod === 'havale' || order.paymentMethod === 'eft')
                  const isUploadingThis = uploadDekontMutation.isPending && dekontTargetOrderId === order.id
                  return (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 rounded-xl border transition-colors"
                      style={{ borderColor: W.warmBorder, background: W.cream }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: order.status === 'completed' ? W.oliveLight : W.creamDark }}
                        >
                          {order.status === 'completed' ? (
                            <Truck className="h-5 w-5" style={{ color: W.olive }} />
                          ) : (
                            <Package className="h-5 w-5" style={{ color: W.textLight }} />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[13px]" style={{ color: W.dark }}>Siparis #{order.id}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: W.textLight }}>
                            {order.quantity} Kit · {formatDate(order.createdAt ?? '')}
                            {paid ? ' · Odendi' : ' · Odeme bekleniyor'}
                          </p>
                          {canUploadDekont && (
                            <div className="mt-2 flex items-center gap-2">
                              {hasDekont ? (
                                <Badge variant="success" size="sm" dot>Dekont eklendi</Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePickDekont(order.id)}
                                  disabled={uploadDekontMutation.isPending}
                                  className="h-8"
                                  style={{ borderColor: W.warmBorder, color: W.dark }}
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                  {isUploadingThis ? 'Yukleniyor...' : 'Dekont ekle'}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-[13px] mb-1" style={{ color: W.dark }}>{formatCurrency(Number(order.totalPrice) || 0)}</p>
                        <div className="flex flex-col gap-1 items-end">
                          {paid ? <Badge variant="success" dot>Odendi</Badge> : <Badge variant="warning" dot>Odeme bekleniyor</Badge>}
                          <Badge variant={order.status === 'completed' ? 'primary' : 'default'} dot>
                            {statusLabel}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
