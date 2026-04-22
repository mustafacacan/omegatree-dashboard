import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, Button } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  ShoppingCart,
  Package,
  Check,
  ImageIcon,
  Upload,
  MapPin,
  Copy,
  CreditCard,
  Landmark,
  Minus,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCurrentUser } from '@/stores/auth.store'
import { motion, AnimatePresence } from 'framer-motion'
import { getSalesKits, getSalesKitImageUrl, type SalesKit } from '@/services/sales-kits.service'
import { createOrder, uploadOrderDekont, type Order } from '@/services/orders.service'
import { getAddresses, getAddressLabel, getAddressFullLine } from '@/services/addresses.service'
import { getActiveBankInfos, type BankInfo } from '@/services/bank-infos.service'
import { SalesKitImage } from '@/components/shared/sales-kit-image'
import { ROUTES } from '@/utils/routes'

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

const fadeUp = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } }
const stagger = { animate: { transition: { staggerChildren: 0.05 } } }

const ORDERS_QUERY_KEY = ['orders'] as const
const ADDRESSES_QUERY_KEY = ['addresses'] as const

type PaymentMethodUi = 'credit_card' | 'transfer'
type PaymentMethodApi = 'credit_card' | 'eft' | 'havale'

function generateTransferRef(): string {
  const hex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase()
  return `ORD-${hex}`
}

function formatIban(iban: string): string {
  const raw = String(iban ?? '').replace(/\s+/g, '').toUpperCase()
  if (!raw) return '—'
  return raw.replace(/(.{4})/g, '$1 ').trim()
}

export function DietitianOrderPage() {
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const [selectedKit, setSelectedKit] = useState<SalesKit | null>(null)
  const [orderQty, setOrderQty] = useState(1)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [failedImageIds, setFailedImageIds] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dekontTargetOrderId, setDekontTargetOrderId] = useState<number | null>(null)
  const [dekontModalOpen, setDekontModalOpen] = useState(false)
  const [dekontModalOrder, setDekontModalOrder] = useState<Pick<Order, 'id' | 'orderNumber' | 'totalPrice'> | null>(null)
  const [confirmOrderModalOpen, setConfirmOrderModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodUi>('transfer')
  const [transferRef, setTransferRef] = useState<string>('')

  const { data: salesKits = [], isLoading: kitsLoading } = useQuery({
    queryKey: ['sales-kits'],
    queryFn: getSalesKits,
  })

  const { data: addresses = [], isLoading: addressesLoading } = useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: getAddresses,
  })

  const bankInfosQuery = useQuery({
    queryKey: ['bank-infos', 'active'],
    queryFn: getActiveBankInfos,
    retry: 1,
  })

  const createOrderMutation = useMutation({
    mutationFn: ({
      salesKitId,
      quantity,
      addressId,
      paymentMethod: method,
    }: {
      salesKitId: number
      quantity: number
      addressId?: number
      paymentMethod: PaymentMethodApi
    }) =>
      createOrder(salesKitId, {
        quantity,
        paymentMethod: method,
        isPaid: false,
        addressId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      toast.success('Sipariş başarıyla oluşturuldu.')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Sipariş oluşturulamadı. Lütfen tekrar deneyin.' }))
    },
  })

  const uploadDekontMutation = useMutation({
    mutationFn: ({ orderId, file }: { orderId: number; file: File }) =>
      uploadOrderDekont({ orderId, file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      toast.success('Dekont yüklendi.')
      setDekontModalOpen(false)
      setDekontModalOrder(null)
    },
    onError: (err: { response?: { data?: { message?: string; errors?: string[] } } }) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Dekont yüklenemedi. Lütfen tekrar deneyin.' }))
    },
    onSettled: () => {
      setDekontTargetOrderId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
  })

  const maxQty = selectedKit ? Math.max(1, Math.min(selectedKit.quantity, 999)) : 1
  const safeQty = selectedKit ? Math.min(maxQty, Math.max(1, orderQty)) : 0
  const total = selectedKit ? selectedKit.price * safeQty : 0
  const totalKits = selectedKit ? selectedKit.quantity * safeQty : 0

  const handleSelectKit = (kit: SalesKit) => {
    setSelectedKit(kit)
    setOrderQty(1)
  }

  const openConfirmOrderModal = () => {
    if (!selectedKit) {
      toast.error('Lütfen bir fiyat paketi seçin.')
      return
    }
    if (safeQty <= 0) {
      toast.error('Geçerli adet girin.')
      return
    }
    if (addresses.length === 0) {
      toast.error('Sipariş için önce Ayarlar sayfasından en az bir adres ekleyin.')
      return
    }
    if (!selectedAddressId) {
      toast.error('Lütfen bir teslimat adresi seçin.')
      return
    }
    if (!user?.id) {
      toast.error('Kullanıcı bilgisi bulunamadı.')
      return
    }
    setTransferRef(generateTransferRef())
    setConfirmOrderModalOpen(true)
  }

  const handleConfirmOrder = () => {
    if (!selectedKit || !user?.id) return
    const addressId = Number(selectedAddressId)
    const apiPaymentMethod: PaymentMethodApi = paymentMethod === 'transfer' ? 'havale' : 'credit_card'
    createOrderMutation.mutate(
      {
        salesKitId: selectedKit.id,
        quantity: safeQty,
        addressId: Number.isNaN(addressId) ? undefined : addressId,
        paymentMethod: apiPaymentMethod,
      },
      {
        onSuccess: (created) => {
          setConfirmOrderModalOpen(false)
          setSelectedKit(null)
          setOrderQty(1)
          setSelectedAddressId(null)

          if (paymentMethod === 'transfer' && created?.id != null) {
            toast.message('Dekontu Sipariş Geçmişim sayfasından siparişinizin üzerinden ekleyebilirsiniz.')
            const createdId = Number(created.id)
            if (Number.isFinite(createdId) && createdId > 0) {
              setDekontTargetOrderId(createdId)
              setDekontModalOrder({
                id: createdId,
                orderNumber: (created as unknown as { orderNumber?: string }).orderNumber,
                totalPrice: (created as unknown as { totalPrice?: unknown }).totalPrice as Order['totalPrice'],
              })
              setDekontModalOpen(true)
            }
          }
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
      toast.error('Sipariş bulunamadı.')
      return
    }
    uploadDekontMutation.mutate({ orderId: dekontTargetOrderId, file })
  }

  return (
    <div className="min-h-screen pb-16">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,application/pdf"
        onChange={(e) => handleDekontSelected(e.target.files?.[0] ?? null)}
      />

      <PageHeader />

      <div className="grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-10 items-start">
        {/* Left: Packages + info */}
        <div className="space-y-6">
          {kitsLoading ? (
            <div className="py-16 text-center">
              <div className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              <p className="text-sm text-surface-500 mt-3">Paketler yükleniyor...</p>
            </div>
          ) : salesKits.length === 0 ? (
            <motion.div
              {...fadeUp}
              className="py-16 px-6 text-center rounded-2xl border border-dashed bg-surface-50"
              style={{ borderColor: W.warmBorder }}
            >
              <Package className="h-14 w-14 mx-auto text-surface-400" />
              <p className="text-surface-600 mt-3 font-medium">Henüz fiyat paketi tanımlanmamış</p>
              <p className="text-sm text-surface-500 mt-1">Yönetici tarafından paket eklendiğinde burada listelenecektir.</p>
            </motion.div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
              variants={stagger}
              initial="initial"
              animate="animate"
            >
              {salesKits.map((k, i) => {
                const imageUrl = getSalesKitImageUrl(k.imageData?.url)
                const showImg = imageUrl && !failedImageIds.has(k.id)
                const isSelected = selectedKit?.id === k.id
                return (
                  <motion.div
                    key={k.id}
                    variants={fadeUp}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectKit(k)}
                      className={`
                        w-full text-left rounded-2xl border-2 overflow-hidden flex flex-col
                        transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/8
                        ${isSelected
                          ? 'border-primary-500 bg-primary-50 shadow-md shadow-primary-500/10'
                          : 'border-border bg-panel hover:border-primary-300'
                        }
                      `}
                    >
                      <div
                        className={`
                          relative h-52 w-full overflow-hidden bg-surface-100 sm:h-56 md:h-60
                          dark:bg-surface-800/60
                          ${isSelected ? 'ring-2 ring-inset ring-primary-500/30' : 'ring-1 ring-inset ring-surface-900/[0.06] dark:ring-white/[0.08]'}
                        `}
                      >
                        {showImg && imageUrl ? (
                          <SalesKitImage
                            url={imageUrl}
                            alt={k.name}
                            className="absolute inset-0 h-full w-full object-cover object-center"
                            onError={() => setFailedImageIds((prev) => new Set(prev).add(k.id))}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-14 w-14 text-surface-400" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute left-3 top-3 z-[1] flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 shadow-md ring-2 ring-white dark:ring-surface-900">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-4 sm:p-5">
                        <h3 className="font-semibold text-surface-800 truncate">{k.name}</h3>
                        <p className="text-sm mt-1 line-clamp-2 min-h-[2.5rem] text-surface-500">
                          {k.description || '—'}
                        </p>
                        <div className="mt-4 pt-3 flex items-center justify-between border-t border-border">
                          <span className="font-bold text-lg tabular-nums text-surface-800">
                            {formatCurrency(k.price)}
                          </span>
                          <span className="text-xs text-surface-500">/ adet · {k.quantity} kit</span>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>

        {/* Right: Sticky order summary & checkout */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="lg:sticky lg:top-6"
        >
          <Card className="overflow-hidden border border-border shadow-lg shadow-surface-900/5 rounded-2xl">
            <div className="px-5 py-4 bg-gradient-to-br from-primary-50 to-surface-50 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-border flex items-center justify-center shadow-sm shrink-0">
                  <ShoppingCart className="h-5 w-5 text-primary-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-surface-800">Sipariş özeti</h3>
                  <p className="text-xs text-surface-500 mt-0.5">Paket, adet ve teslimat</p>
                </div>
              </div>
            </div>
            <CardContent className="p-4 space-y-4">
              <AnimatePresence mode="wait">
                {selectedKit ? (
                  <motion.div
                    key="with-kit"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="rounded-xl p-3.5 bg-primary-50/80 border border-primary-200/50">
                      <p className="text-[13px] font-medium text-surface-800 truncate">Seçilen paket: {selectedKit.name}</p>
                      <div className="flex items-center justify-between gap-3 mt-2.5 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-surface-600">Adet</span>
                          <div className="flex items-center rounded-lg border border-border bg-white overflow-hidden h-8">
                            <button
                              type="button"
                              onClick={() => setOrderQty((q) => Math.max(1, q - 1))}
                              className="h-8 w-8 flex items-center justify-center text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-50 shrink-0"
                              disabled={safeQty <= 1}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={maxQty}
                              value={safeQty}
                              onChange={(e) =>
                                setOrderQty(Math.min(maxQty, Math.max(1, Number(e.target.value) || 1)))
                              }
                              className="w-10 text-center border-0 border-x border-border py-1.5 text-[13px] font-medium bg-transparent focus:outline-none focus:ring-0"
                            />
                            <button
                              type="button"
                              onClick={() => setOrderQty((q) => Math.min(maxQty, q + 1))}
                              className="h-8 w-8 flex items-center justify-center text-surface-600 hover:bg-surface-100 transition-colors disabled:opacity-50 shrink-0"
                              disabled={safeQty >= maxQty}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <span className="text-[13px] text-surface-600 tabular-nums">Birim {formatCurrency(selectedKit.price)}</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-kit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl p-4 border border-dashed border-border bg-surface-50 text-center"
                  >
                    <Package className="h-8 w-8 mx-auto text-surface-400" />
                    <p className="text-[13px] font-medium text-surface-600 mt-1.5">Paket seçilmedi</p>
                    <p className="text-xs text-surface-500 mt-0.5">Soldan bir paket seçin</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="rounded-xl border border-border bg-surface-50/50 p-3.5 space-y-2">
                <label className="text-[13px] font-medium text-surface-700 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-primary-600 shrink-0">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  Teslimat adresi
                </label>
                {addressesLoading ? (
                  <p className="text-[13px] text-surface-500 py-1">Adresler yükleniyor...</p>
                ) : addresses.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-white px-3 py-3.5 text-center text-[13px] text-surface-500">
                    Henüz adres yok.{' '}
                    <Link
                      to={ROUTES.DIYETISYEN_AYARLAR}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      Ayarlar
                    </Link>
                    {' '}sayfasından ekleyin.
                  </div>
                ) : (
                  <Select value={selectedAddressId ?? ''} onValueChange={(v) => setSelectedAddressId(v || null)}>
                    <SelectTrigger className="w-full rounded-xl border-border bg-white h-11 text-[13px] shadow-sm hover:bg-surface-50 transition-colors">
                      <SelectValue placeholder="Adres seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {addresses.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {getAddressLabel(a)} — {getAddressFullLine(a)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedKit && (
                <div className="rounded-xl p-3.5 bg-surface-50 border border-border space-y-2">
                  <div className="flex justify-between items-baseline gap-2 text-[13px]">
                    <span className="text-surface-600 truncate min-w-0">{selectedKit.name} · {safeQty} paket</span>
                    <span className="font-medium text-surface-800 tabular-nums shrink-0">{formatCurrency(selectedKit.price)}/adet</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-2 text-[13px] text-surface-600">
                    <span>Toplam kit</span>
                    <span className="tabular-nums">{totalKits} kit</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-[13px] font-medium text-surface-700">Toplam</span>
                    <span className="text-lg font-bold text-surface-800 tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full rounded-xl h-11 text-sm font-semibold mt-0.5"
                onClick={openConfirmOrderModal}
                disabled={
                  !selectedKit ||
                  safeQty <= 0 ||
                  addresses.length === 0 ||
                  !selectedAddressId
                }
              >
                <Package className="h-4 w-4 shrink-0" />
                Sipariş ver — {formatCurrency(total)}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Confirm order modal */}
      <Modal open={confirmOrderModalOpen} onOpenChange={setConfirmOrderModalOpen}>
        <ModalContent className="flex flex-col max-h-[90vh] overflow-hidden p-0 rounded-2xl">
          <ModalHeader className="flex-shrink-0 p-6 pb-4">
            <ModalTitle>Siparişi onayla</ModalTitle>
            <ModalDescription>Sipariş özeti ve ödeme yöntemini seçin.</ModalDescription>
          </ModalHeader>
          <ModalBody className="flex-1 min-h-0 overflow-y-auto px-6 space-y-5">
            {selectedKit && (
              <>
                <div
                  className="rounded-xl p-4 border bg-primary-50/80"
                  style={{ borderColor: W.warmBorder }}
                >
                  <p className="text-sm font-medium text-surface-800">Sipariş özeti</p>
                  <p className="text-sm mt-1 text-surface-600">
                    {selectedKit.name} · {safeQty} paket × {formatCurrency(selectedKit.price)}
                  </p>
                  <p className="text-sm mt-0.5 text-surface-600">Toplam {totalKits} kit</p>
                  <p className="text-lg font-bold mt-2 text-surface-800">Toplam: {formatCurrency(total)}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-surface-700 mb-3">Ödeme yöntemi</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'credit_card' as const, label: 'Kredi kartı', Icon: CreditCard },
                      { id: 'transfer' as const, label: 'EFT/Havale', Icon: Landmark },
                    ].map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPaymentMethod(id)}
                        className={`
                          flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                          ${paymentMethod === id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-border hover:border-primary-200 hover:bg-surface-50'
                          }
                        `}
                      >
                        <Icon
                          className={`h-5 w-5 shrink-0 ${paymentMethod === id ? 'text-primary-600' : 'text-surface-400'}`}
                        />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === 'transfer' && (
                  <div
                    className="rounded-xl p-4 border space-y-3 bg-surface-50"
                    style={{ borderColor: W.warmBorder }}
                  >
                    <p className="text-sm font-medium text-surface-800">
                      EFT/Havale ile ödeme
                    </p>
                    <p className="text-xs text-surface-600">
                      Lütfen açıklama kısmına aşağıdaki sipariş numarasını yazın.
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-surface-500 shrink-0">Açıklamaya yazılacak:</span>
                      <code className="flex-1 px-3 py-2 rounded-lg bg-white border border-border text-sm font-mono">
                        {transferRef}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => {
                          void navigator.clipboard.writeText(transferRef).then(() =>
                            toast.success('Kopyalandı')
                          )
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-surface-700">Banka hesapları</p>
                        <p className="text-[11px] text-surface-500">
                          {bankInfosQuery.isLoading ? 'Yükleniyor…' : `${bankInfosQuery.data?.length ?? 0} hesap`}
                        </p>
                      </div>

                      {bankInfosQuery.isLoading ? (
                        <div className="rounded-xl border border-surface-200 bg-white p-3 text-xs text-surface-600">
                          Banka bilgileri yükleniyor...
                        </div>
                      ) : bankInfosQuery.isError ? (
                        <div className="rounded-xl border border-surface-200 bg-white p-3 text-xs text-surface-600">
                          Banka bilgileri yüklenemedi.
                        </div>
                      ) : (bankInfosQuery.data?.length ?? 0) === 0 ? (
                        <div className="rounded-xl border border-surface-200 bg-white p-3 text-xs text-surface-600">
                          Aktif banka bilgisi bulunamadı.
                        </div>
                      ) : (
                        <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
                          <div className="divide-y divide-surface-200">
                            {(bankInfosQuery.data ?? []).map((b: BankInfo) => (
                              <div key={b.id} className="p-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="text-[12px] font-semibold text-surface-900 truncate">
                                      {b.bankName}
                                    </p>
                                    <p className="text-[11px] text-surface-500 truncate">{b.accountHolder}</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0"
                                    onClick={() => {
                                      void navigator.clipboard
                                        .writeText(String(b.ibanNo ?? '').replace(/\s/g, ''))
                                        .then(() => toast.success('IBAN kopyalandı'))
                                    }}
                                    title="IBAN kopyala"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="mt-2 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                                  <p className="text-[10px] font-medium uppercase tracking-wider text-surface-500">
                                    IBAN
                                  </p>
                                  <code className="block mt-1 font-mono text-[13px] text-surface-900 break-all">
                                    {formatIban(b.ibanNo)}
                                  </code>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </ModalBody>
          <ModalFooter className="flex-shrink-0 border-t border-border p-6 pt-4 gap-3">
            <Button variant="outline" onClick={() => setConfirmOrderModalOpen(false)}>
              İptal
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmOrder}
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? 'Gönderiliyor...' : 'Siparişi onayla'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Dekont upload modal */}
      <Modal
        open={dekontModalOpen}
        onOpenChange={(open) => {
          setDekontModalOpen(open)
          if (!open) {
            setDekontModalOrder(null)
            setDekontTargetOrderId(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }
        }}
      >
        <ModalContent className="rounded-2xl">
          <ModalHeader>
            <ModalTitle>Dekont yükle</ModalTitle>
            <ModalDescription>
              Sipariş oluşturuldu. EFT/Havale ödemesi için dekontu şimdi yükleyin.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {dekontModalOrder && (
              <div
                className="rounded-xl border p-4 bg-surface-50"
                style={{ borderColor: W.warmBorder }}
              >
                <p className="text-xs text-surface-500">Sipariş</p>
                <p className="font-semibold text-surface-800">
                  {dekontModalOrder.orderNumber ?? `#${dekontModalOrder.id}`}
                </p>
                {dekontModalOrder.totalPrice != null && (
                  <p className="text-sm mt-1 text-surface-600">
                    Tutar: {formatCurrency(Number(dekontModalOrder.totalPrice) || 0)}
                  </p>
                )}
              </div>
            )}
            <div
              className="rounded-xl border p-4 flex items-center justify-between gap-4 bg-white"
              style={{ borderColor: W.warmBorder }}
            >
              <div className="min-w-0">
                <p className="font-medium text-surface-800">Dosya seçin (PDF veya görsel)</p>
                <p className="text-xs mt-0.5 text-surface-500">Seçimden sonra yükleme otomatik başlar.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => dekontModalOrder?.id != null && handlePickDekont(dekontModalOrder.id)}
                disabled={uploadDekontMutation.isPending || dekontModalOrder?.id == null}
                className="shrink-0 rounded-lg"
              >
                <Upload className="h-4 w-4" />
                {uploadDekontMutation.isPending ? 'Yükleniyor...' : 'Dekont seç'}
              </Button>
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-border">
            <Button variant="outline" onClick={() => setDekontModalOpen(false)}>
              Daha sonra
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
