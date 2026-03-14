import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PanelHeader } from '@/components/shared/panel-header'
import { ToolbarSearch } from '@/components/shared/toolbar-search'
import {
  Badge,
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
  ModalDescription,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Input,
  Textarea,
} from '@/components/ui'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, Boxes, ShoppingCart, AlertTriangle, ScanLine, RotateCcw,
  Search, CheckCircle, ArrowRight, Loader2,
} from 'lucide-react'
import { ROUTES } from '@/utils/routes'
import { useDietitianSettingsStore } from '@/stores/dietitian-settings.store'
import { formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  approveToStock,
  getMyStockList,
  getStockAlertSettings,
  type StockStatus,
  updateStockAlertSettings,
} from '@/services/stocks.service'
import { createDamagedKit } from '@/services/damaged-kits.service'
import { toast } from 'sonner'

type BarcodeState = 'idle' | 'checking' | 'success' | 'error'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function MyStockPage() {
  const navigate = useNavigate()
  const { minStockAlert, setMinStockAlert } = useDietitianSettingsStore()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [minStockInput, setMinStockInput] = useState('')
  const [confirmLimit, setConfirmLimit] = useState<number | null>(null)
  const [receiveKitModalOpen, setReceiveKitModalOpen] = useState(false)
  const [kitsTab, setKitsTab] = useState<'in-stock' | 'used'>('in-stock')
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeState, setBarcodeState] = useState<BarcodeState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const [returnRequestModalOpen, setReturnRequestModalOpen] = useState(false)
  const [selectedReturnKitId, setSelectedReturnKitId] = useState<string>('')
  const [returnReason, setReturnReason] = useState('')
  const [returnFile, setReturnFile] = useState<File | null>(null)
  const [returnSubmitting, setReturnSubmitting] = useState(false)

  const {
    data: stockList = [],
    isLoading: loading,
  } = useQuery({
    queryKey: ['stocks', 'my-stock-list'],
    queryFn: () => getMyStockList(),
  })

  const { data: alertSettings } = useQuery({
    queryKey: ['stocks', 'alert-settings'],
    queryFn: getStockAlertSettings,
  })

  useEffect(() => {
    if (alertSettings && typeof alertSettings.limit === 'number') {
      setMinStockAlert(alertSettings.limit)
    }
  }, [alertSettings, setMinStockAlert])

  const updateAlertLimitMutation = useMutation({
    mutationFn: (limit: number) => updateStockAlertSettings(limit),
    onSuccess: (res) => {
      queryClient.setQueryData(['stocks', 'alert-settings'], res)
      setMinStockAlert(res.limit)
      toast.success('Minimum stok limiti güncellendi')
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err as { response?: { data?: { message?: string } }; message?: string }, { fallback: 'Minimum stok limiti güncellenemedi.' }))
    },
  })

  const draftLimit = useMemo(() => {
    const raw = minStockInput.trim()
    if (raw === '') return minStockAlert
    const n = parseInt(raw, 10)
    if (Number.isNaN(n) || n < 0) return null
    return n
  }, [minStockAlert, minStockInput])

  const canSaveLimit = draftLimit != null && draftLimit !== minStockAlert

  const handleBarcodeSubmit = () => {
    const trimmed = barcodeInput.trim()
    if (!trimmed) return
    setBarcodeState('checking')
    setErrorMessage('')
    approveToStock(trimmed)
      .then(() => {
        setBarcodeState('success')
        queryClient.invalidateQueries({ queryKey: ['stocks', 'my-stock-list'] })
      })
      .catch((err: { response?: { data?: { message?: string } }; message?: string }) => {
        setBarcodeState('error')
        setErrorMessage(getApiErrorMessage(err, { fallback: 'Barkod eşleşmedi veya stok onayı yapılamadı.' }))
      })
  }

  const resetBarcode = () => {
    setBarcodeInput('')
    setBarcodeState('idle')
    setErrorMessage('')
    inputRef.current?.focus()
  }

  const closeReceiveKitModal = () => {
    setReceiveKitModalOpen(false)
    resetBarcode()
  }

  useEffect(() => {
    if (receiveKitModalOpen && barcodeState === 'idle') {
      const t = setTimeout(() => inputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [receiveKitModalOpen, barcodeState])

  const myKits = useMemo(() => {
    return stockList.map((s) => ({
      barcode: s.kitId?.barcode ?? '',
      receivedAt: s.createdAt,
      uiStatus:
        s.status === 'used'
          ? ('assigned' as const)
          : typeof s.status === 'string' && s.status.startsWith('damaged-')
            ? ('damaged' as const)
            : ('available' as const),
      client: '',
      kitStatus: s.status,
    }))
  }, [stockList])

  const returnableKits = useMemo(() => {
    return stockList
      .map((s) => ({
        id: s.kitId?.id,
        barcode: s.kitId?.barcode ?? '',
        stockStatus: s.status,
      }))
      .filter((k): k is { id: number; barcode: string; stockStatus: StockStatus | undefined } =>
        k.id != null && k.barcode !== ''
      )
  }, [stockList])

  const openReturnModal = () => {
    setReturnRequestModalOpen(true)
    setSelectedReturnKitId(returnableKits[0]?.id != null ? String(returnableKits[0].id) : '')
    setReturnReason('')
    setReturnFile(null)
  }

  const closeReturnModal = () => {
    setReturnRequestModalOpen(false)
    setSelectedReturnKitId('')
    setReturnReason('')
    setReturnFile(null)
    setReturnSubmitting(false)
  }

  const submitReturnRequest = async () => {
    if (!selectedReturnKitId) {
      toast.error('Kit seçin')
      return
    }
    if (!returnFile) {
      toast.error('Kanıt dosyası seçin')
      return
    }
    if (!returnReason.trim()) {
      toast.error('Açıklama girin')
      return
    }

    setReturnSubmitting(true)
    try {
      await createDamagedKit(selectedReturnKitId, {
        reason: returnReason.trim(),
        imageFile: returnFile,
      })
      toast.success('İade talebiniz alındı')
      closeReturnModal()
      queryClient.invalidateQueries({ queryKey: ['stocks', 'my-stock-list'] })
    } catch (err) {
      toast.error(getApiErrorMessage(err as { response?: { data?: { message?: string } }; message?: string }, { fallback: 'İade talebi oluşturulamadı.' }))
      setReturnSubmitting(false)
    }
  }

  const availableKits = useMemo(() => myKits.filter((k) => k.uiStatus === 'available'), [myKits])
  const usedKits = useMemo(() => myKits.filter((k) => k.uiStatus !== 'available'), [myKits])

  const filtered = useMemo(() => {
    return myKits.filter(
      (k) => !searchQuery || k.barcode.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [myKits, searchQuery])

  const filteredAvailable = useMemo(
    () => filtered.filter((k) => k.uiStatus === 'available'),
    [filtered]
  )

  const filteredUsed = useMemo(
    () => filtered.filter((k) => k.uiStatus !== 'available'),
    [filtered]
  )

  const badgeForKit = (kit: { uiStatus: 'available' | 'assigned' | 'damaged'; kitStatus?: unknown }) => {
    if (kit.uiStatus === 'assigned') {
      return <Badge variant="warning" dot>Atanmış</Badge>
    }
    if (kit.uiStatus === 'damaged') {
      if (kit.kitStatus === 'damaged-pending') {
        return <Badge variant="danger" dot>Hasarli · Bekliyor</Badge>
      }
      return <Badge variant="danger" dot>Hasarli</Badge>
    }
    return <Badge variant="success" dot>Hazir</Badge>
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      {/* Min stok uyarı limiti */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.08 }}>
        <div className="panel border-b border-surface-200">
          <div className="p-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-surface-700">Minimum stok uyarı limiti:</span>
            <input
              type="number"
              min={0}
              value={minStockInput !== '' ? minStockInput : minStockAlert}
              onChange={(e) => setMinStockInput(e.target.value)}
              onBlur={() => {
                if (minStockInput.trim() !== '' && draftLimit == null) {
                  setMinStockInput('')
                }
              }}
              placeholder={String(minStockAlert || 0)}
              className="w-20 rounded-lg border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200 dark:focus:ring-primary-800"
            />
            <Button
              variant="primary"
              size="sm"
              disabled={!canSaveLimit}
              onClick={() => {
                if (draftLimit == null) return
                setConfirmLimit(draftLimit)
              }}
            >
              Kaydet
            </Button>
            <span className="text-xs text-surface-500">Stok bu sayının altına düşünce uyarı alırsınız.</span>
          </div>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmLimit != null}
        onOpenChange={(open) => {
          if (!open) setConfirmLimit(null)
        }}
        title="Minimum stok limiti"
        description={
          confirmLimit != null
            ? `Minimum stok uyarı limitini ${confirmLimit} olarak güncellemek istiyor musunuz?`
            : 'Devam etmek istiyor musunuz?'
        }
        confirmLabel="Onayla"
        cancelLabel="İptal"
        loading={updateAlertLimitMutation.isPending}
        onConfirm={() => {
          if (confirmLimit == null) return
          updateAlertLimitMutation.mutate(confirmLimit, {
            onSuccess: () => {
              setConfirmLimit(null)
              setMinStockInput('')
            },
          })
        }}
      />

      {/* Stok uyarısı */}
      {minStockAlert > 0 && availableKits.length < minStockAlert && (
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="rounded-2xl p-4 flex items-center gap-3 border border-amber-200 bg-amber-50/70">
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold text-amber-900">Stok uyarısı</p>
              <p className="text-[11px] text-amber-800">
                Kullanılabilir kit sayınız ({availableKits.length}) minimum limitinizin ({minStockAlert}) altında. Yeni sipariş vermenizi öneririz.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.DIYETISYEN_SIPARISLER)} className="border-amber-300 text-amber-900">
              Sipariş ver
            </Button>
          </div>
        </motion.div>
      )}

      {/* Kit listesi */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
        <Tabs value={kitsTab} onValueChange={(v) => setKitsTab(v as 'in-stock' | 'used')}>
          <div className="panel border-b border-surface-200">
            <PanelHeader
              title="Stoğum"
              description={`Kullanılabilir: ${availableKits.length} · Kullanılan: ${usedKits.length}`}
              actions={
                <>
                  <TabsList className="bg-surface-100 dark:bg-surface-200/60 p-0.5 rounded-lg">
                    <TabsTrigger value="in-stock" className="rounded-md text-[12px] data-[state=active]:bg-white dark:data-[state=active]:bg-surface-100">
                      Stoktaki ({filteredAvailable.length})
                    </TabsTrigger>
                    <TabsTrigger value="used" className="rounded-md text-[12px] data-[state=active]:bg-white dark:data-[state=active]:bg-surface-100">
                      Kullanılan ({filteredUsed.length})
                    </TabsTrigger>
                  </TabsList>
                  <ToolbarSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Barkod ara..."
                    inputClassName="h-9 text-sm w-48"
                  />
                  <Button variant="primary" size="sm" onClick={() => setReceiveKitModalOpen(true)} className="gap-2">
                    <ScanLine className="h-4 w-4" /> Kit teslim al
                  </Button>
                  <Button variant="outline" size="sm" onClick={openReturnModal} className="gap-2">
                    <RotateCcw className="h-4 w-4" /> İade talebi
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.DIYETISYEN_SIPARISLER)} className="gap-2">
                    <ShoppingCart className="h-4 w-4" /> Sipariş ver
                  </Button>
                </>
              }
            />

            <TabsContent value="in-stock" className="mt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Barkod</th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Teslim</th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-12 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                          <p className="text-[12px] text-surface-500">Stok listesi yükleniyor...</p>
                        </td>
                      </tr>
                    ) : filteredAvailable.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-12 text-center">
                          <Package className="h-10 w-10 mx-auto mb-2 text-surface-400" />
                          <p className="text-[12px] font-medium text-surface-700">Kullanılabilir kit yok</p>
                          <p className="text-[11px] mt-0.5 text-surface-500">Kit teslim alarak stoğunuza ekleyebilirsiniz.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredAvailable.map((kit) => (
                        <tr key={kit.barcode} className="border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200 transition-colors">
                          <td className="px-5 py-3.5">
                            <code className="text-xs font-mono bg-surface-100 dark:bg-surface-200/60 px-2 py-0.5 rounded text-surface-600">{kit.barcode}</code>
                          </td>
                          <td className="px-5 py-3.5 text-[12px] text-surface-500">{formatDate(kit.receivedAt)}</td>
                          <td className="px-5 py-3.5">{badgeForKit(kit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="used" className="mt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-100 dark:bg-surface-200/80 border-b border-surface-200">
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Barkod</th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Not</th>
                      <th className="text-left text-[11px] font-semibold uppercase tracking-wider px-5 py-3 text-surface-500">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-12 text-center">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
                          <p className="text-[12px] text-surface-500">Stok listesi yükleniyor...</p>
                        </td>
                      </tr>
                    ) : filteredUsed.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-12 text-center">
                          <Boxes className="h-10 w-10 mx-auto mb-2 text-surface-400" />
                          <p className="text-[12px] font-medium text-surface-700">Kullanılan kit yok</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsed.map((kit) => (
                        <tr key={kit.barcode} className="border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200 transition-colors">
                          <td className="px-5 py-3.5">
                            <code className="text-xs font-mono bg-surface-100 dark:bg-surface-200/60 px-2 py-0.5 rounded text-surface-600">{kit.barcode}</code>
                          </td>
                          <td className="px-5 py-3.5 text-[12px] text-surface-500">
                            {kit.uiStatus === 'assigned'
                              ? 'Danışana atanmış'
                              : kit.uiStatus === 'damaged'
                                ? `Hasarlı${kit.kitStatus === 'damaged-pending' ? ' (bekliyor)' : ''}`
                                : `Teslim: ${formatDate(kit.receivedAt)}`}
                          </td>
                          <td className="px-5 py-3.5">{badgeForKit(kit)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <div className="border-t border-surface-200 px-5 py-4">
              <p className="text-[11px] text-surface-500">
                Bu stok, barkod ile teslim aldığınız kitleri gösterir. Yeni kit eklemek için{' '}
                <button type="button" onClick={() => setReceiveKitModalOpen(true)} className="font-medium text-primary-600 hover:underline">
                  Kit teslim al
                </button>
                . İade için <span className="font-medium">İade talebi</span> butonunu kullanın.
              </p>
            </div>
          </div>
        </Tabs>
      </motion.div>

      {/* İade Talebi modali */}
      <Modal open={returnRequestModalOpen} onOpenChange={(open) => !open && closeReturnModal()}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <ModalTitle>İade Talebi</ModalTitle>
            <ModalDescription className="text-surface-700 dark:text-surface-700 font-medium">
              Stoğunuzdan bir kit seçip kanıt dosyası ve açıklama ekleyin.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <p className="form-section-title mb-2">Kit</p>
              <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/50">
                <Select
                  value={selectedReturnKitId || '_empty'}
                  onValueChange={(v) => setSelectedReturnKitId(v === '_empty' ? '' : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={returnableKits.length > 0 ? 'Seçin...' : 'Stokta kit yok'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_empty">Seçin...</SelectItem>
                    {returnableKits.map((k) => (
                      <SelectItem key={k.id} value={String(k.id)}>
                        {k.barcode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <p className="form-section-title mb-2">Kanıt dosyası</p>
              <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/50">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null
                    setReturnFile(file)
                  }}
                />
                <p className="text-xs text-surface-500 mt-1">Fotoğraf veya PDF yükleyin.</p>
              </div>
            </div>

            <div>
              <p className="form-section-title mb-2">Açıklama</p>
              <div className="rounded-lg border border-surface-200 p-3 bg-surface-50/50">
                <Textarea
                  placeholder="Hasar / iade nedeni..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={closeReturnModal}>
              İptal
            </Button>
            <Button
              variant="primary"
              onClick={() => void submitReturnRequest()}
              disabled={returnSubmitting || returnableKits.length === 0}
            >
              {returnSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gönderiliyor...
                </>
              ) : (
                'İade talebi oluştur'
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Kit Teslim Al modali */}
      <Modal open={receiveKitModalOpen} onOpenChange={(open) => !open && closeReceiveKitModal()}>
        <ModalContent className="max-w-2xl">
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 bg-primary-100 text-primary-600">
                <ScanLine className="h-5 w-5" />
              </div>
              <div>
                <ModalTitle>Kit Teslim Al</ModalTitle>
                <ModalDescription className="text-surface-700 dark:text-surface-700 font-medium mt-0.5">
                  Kargonuz geldiğinde kit üzerindeki barkod numarasını girin.
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <AnimatePresence mode="wait">
              {barcodeState === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-4"
                >
                  <div className="h-14 w-14 rounded-full mx-auto mb-3 flex items-center justify-center bg-success/10">
                    <CheckCircle className="h-7 w-7 text-success" />
                  </div>
                  <h4 className="text-[15px] font-bold text-surface-800">Kit başarıyla teslim alındı!</h4>
                  <p className="text-[12px] mt-2 text-surface-500">
                    <code className="font-mono font-semibold text-primary-600">{barcodeInput}</code> barkodlu kit stoğunuza eklendi.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={resetBarcode}>
                      <ScanLine className="h-3.5 w-3.5" /> Başka kit teslim al
                    </Button>
                    <Button variant="primary" size="sm" onClick={closeReceiveKitModal} className="gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5" /> Listeyi güncelle
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => {
                          setBarcodeInput(e.target.value)
                          if (barcodeState === 'error') setBarcodeState('idle')
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleBarcodeSubmit() }}
                        placeholder="Barkod (örn: OT-2025-00160)"
                        className="w-full pl-9 pr-3 py-3 text-sm font-mono rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200 dark:focus:ring-primary-800"
                        style={{ borderColor: barcodeState === 'error' ? '#E87070' : undefined }}
                        disabled={barcodeState === 'checking'}
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleBarcodeSubmit}
                      disabled={!barcodeInput.trim() || barcodeState === 'checking'}
                      className="shrink-0 gap-1.5"
                    >
                      {barcodeState === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Teslim Al'}
                    </Button>
                  </div>
                  {barcodeState === 'error' && errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 mt-3 p-3 rounded-xl bg-red-50 border border-red-200"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-red-700">{errorMessage}</p>
                        <button type="button" onClick={resetBarcode} className="text-xs font-semibold mt-1 underline text-red-700">Tekrar Dene</button>
                      </div>
                    </motion.div>
                  )}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-surface-200">
                    {[
                      { step: 1, text: 'Kit kargonuz gelsin' },
                      { step: 2, text: 'Barkod girin' },
                      { step: 3, text: 'Stoga eklensin' },
                    ].map((s) => (
                      <div key={s.step} className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">{s.step}</div>
                        <span className="text-[11px] text-surface-500">{s.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
