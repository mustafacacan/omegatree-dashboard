import { useMemo, useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
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
  TrendingUp, TrendingDown, Search, CheckCircle, ArrowRight, Loader2,
} from 'lucide-react'
import { ROUTES } from '@/utils/routes'
import { useDietitianSettingsStore } from '@/stores/dietitian-settings.store'
import { formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { getMyStockList, approveToStock, type StockStatus } from '@/services/stocks.service'
import { createDamagedKit } from '@/services/damaged-kits.service'
import { toast } from 'sonner'

type BarcodeState = 'idle' | 'checking' | 'success' | 'error'

const W = {
  olive: '#8B9A4B', oliveLight: '#EEF2DE',
  orange: '#E8913A', orangeLight: '#FDF0E2',
  amber: '#F5C842', amberLight: '#FDF8E8',
  green: '#6ABF69', greenLight: '#E8F5E8',
  cream: '#F9F7F3', creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE', dark: '#2D2A26',
  text: '#4A4640', textLight: '#9C968D', warmGrayLight: '#B5AFA5',
}

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function MyStockPage() {
  const navigate = useNavigate()
  const { minStockAlert, setMinStockAlert } = useDietitianSettingsStore()
  const [stockList, setStockList] = useState<Awaited<ReturnType<typeof getMyStockList>>>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [minStockInput, setMinStockInput] = useState('')
  const [receiveKitModalOpen, setReceiveKitModalOpen] = useState(false)
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeState, setBarcodeState] = useState<BarcodeState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const [returnRequestModalOpen, setReturnRequestModalOpen] = useState(false)
  const [selectedReturnKitId, setSelectedReturnKitId] = useState<string>('')
  const [returnReason, setReturnReason] = useState('')
  const [returnFile, setReturnFile] = useState<File | null>(null)
  const [returnSubmitting, setReturnSubmitting] = useState(false)

  const fetchMyStock = () => {
    setLoading(true)
    getMyStockList()
      .then(setStockList)
      .catch(() => setStockList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchMyStock()
  }, [])

  const handleBarcodeSubmit = () => {
    const trimmed = barcodeInput.trim()
    if (!trimmed) return
    setBarcodeState('checking')
    setErrorMessage('')
    approveToStock(trimmed)
      .then(() => {
        setBarcodeState('success')
        fetchMyStock()
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
      toast.error('Kanit dosyasi secin')
      return
    }
    if (!returnReason.trim()) {
      toast.error('Aciklama girin')
      return
    }

    setReturnSubmitting(true)
    try {
      await createDamagedKit(selectedReturnKitId, {
        reason: returnReason.trim(),
        imageFile: returnFile,
      })
      toast.success('Iade talebiniz alindi')
      closeReturnModal()
      fetchMyStock()
    } catch (err) {
      toast.error(getApiErrorMessage(err as { response?: { data?: { message?: string } }; message?: string }, { fallback: 'Iade talebi olusturulamadi.' }))
      setReturnSubmitting(false)
    }
  }

  const availableKits = useMemo(() => myKits.filter((k) => k.uiStatus === 'available'), [myKits])
  const assignedKits = useMemo(() => myKits.filter((k) => k.uiStatus === 'assigned'), [myKits])
  const damagedPendingKits = useMemo(
    () => myKits.filter((k) => k.uiStatus === 'damaged' && k.kitStatus === 'damaged-pending'),
    [myKits]
  )

  const filtered = useMemo(() => {
    return myKits.filter(
      (k) => !searchQuery || k.barcode.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [myKits, searchQuery])

  const badgeForKit = (kit: { uiStatus: 'available' | 'assigned' | 'damaged'; kitStatus?: unknown }) => {
    if (kit.uiStatus === 'assigned') {
      return <Badge variant="warning" dot>Atanmis</Badge>
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
    <div className="space-y-8 animate-fade-in">
      <PageHeader />

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Kullanilabilir', value: availableKits.length, icon: Package, iconColor: W.olive, iconBg: W.oliveLight, change: 2 },
          { title: 'Danisana Atanmis', value: assignedKits.length, icon: Boxes, iconColor: W.orange, iconBg: W.orangeLight, change: 1 },
          { title: 'Minimum stok limiti', value: minStockAlert || '—', icon: AlertTriangle, iconColor: W.amber, iconBg: W.amberLight, change: 0 },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <div className="rounded-2xl p-5 transition-shadow hover:shadow-md" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ background: s.iconBg }}>
                    <Icon className="h-5 w-5" style={{ color: s.iconColor }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: W.textLight }}>{s.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xl font-bold" style={{ color: W.dark }}>{s.value}</span>
                      {s.change !== 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" style={{ background: s.change > 0 ? W.greenLight : '#FDE8E8', color: s.change > 0 ? '#3D8B3D' : '#C53030' }}>
                          {s.change > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                          {s.change > 0 ? '+' : ''}{s.change}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ═══ MIN STOK LİMİTİ AYARI ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.08 }}>
        <div className="rounded-2xl p-4 flex flex-wrap items-center gap-3" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
          <span className="text-sm font-medium text-surface-700">Minimum stok uyari limiti:</span>
          <input
            type="number"
            min={0}
            value={minStockInput !== '' ? minStockInput : minStockAlert}
            onChange={(e) => setMinStockInput(e.target.value)}
            onBlur={() => { const n = parseInt(minStockInput, 10); if (!Number.isNaN(n) && n >= 0) setMinStockAlert(n); setMinStockInput('') }}
            placeholder={String(minStockAlert || 0)}
            className="w-20 rounded-lg border border-surface-200 px-2 py-1.5 text-sm"
          />
          <span className="text-xs text-surface-500">Stok bu sayinin altina dustugunde uyari alirsiniz.</span>
        </div>
      </motion.div>

      {/* ═══ STOCK WARNING ═══ */}
      {minStockAlert > 0 && availableKits.length < minStockAlert && (
        <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: W.amberLight, border: '1px solid #F0DFA0' }}>
            <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#F5E6A0' }}>
              <AlertTriangle className="h-5 w-5" style={{ color: '#B8960A' }} />
            </div>
            <div className="flex-1">
              <p className="text-[12px] font-semibold" style={{ color: '#78600A' }}>Stok uyarisi</p>
              <p className="text-[11px]" style={{ color: '#9C7D0A' }}>Kullanilabilir kit sayiniz ({availableKits.length}) minimum limitinizin ({minStockAlert}) altinda. Yeni siparis vermenizi oneririz.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.DIYETISYEN_SIPARISLER)} style={{ borderColor: '#D4B830', color: '#78600A' }}>
              Siparis Ver
            </Button>
          </div>
        </motion.div>
      )}

      {/* ═══ STOCK LIST ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.15 }}>
        <div className="panel">

          {/* Header — tablonun ustunde Kit Teslim Al butonu */}
          <div className="p-5 flex items-center justify-between gap-3 flex-wrap" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
            <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Stoktaki Kitler</h3>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5" style={{ color: W.warmGrayLight }} />
                <input
                  type="text"
                  placeholder="Barkod ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-44 outline-none transition-colors"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}`, color: W.dark }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = W.olive }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = W.warmBorder }}
                />
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setReceiveKitModalOpen(true)}
                className="gap-1.5"
                style={{ background: W.olive }}
              >
                <ScanLine className="h-3.5 w-3.5" /> Kit Teslim Al
              </Button>
              <Button variant="outline" size="sm" onClick={openReturnModal}>
                <RotateCcw className="h-3.5 w-3.5" /> Iade Talebi
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.DIYETISYEN_SIPARISLER)}>
                <ShoppingCart className="h-3.5 w-3.5" /> Yeni Siparis
              </Button>
            </div>
          </div>

          {/* Available kits */}
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full" style={{ background: W.green }} />
              <span className="text-[12px] font-semibold" style={{ color: W.dark }}>Kullanilabilir</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: W.greenLight, color: '#3D8B3D' }}>{availableKits.length}</span>
            </div>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-surface-500 text-sm">
                <Loader2 className="h-8 w-8 animate-spin mb-2" style={{ color: W.olive }} />
                <p>Stok listesi yükleniyor...</p>
              </div>
            ) : availableKits.length === 0 ? (
              <div className="text-center py-8 text-surface-500 text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 text-surface-300" />
                <p>Kullanilabilir kit bulunmuyor</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filtered.filter(k => k.uiStatus === 'available').map((kit) => (
                <div
                  key={kit.barcode}
                  className="flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer"
                  style={{ background: W.cream, border: `1.5px solid transparent` }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.olive; e.currentTarget.style.background = W.oliveLight }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = W.cream }}
                >
                  <div>
                    <code className="text-[13px] font-mono font-bold" style={{ color: W.dark }}>{kit.barcode}</code>
                    <p className="text-[10px] mt-0.5" style={{ color: W.textLight }}>Teslim: {formatDate(kit.receivedAt)}</p>
                  </div>
                  {badgeForKit(kit)}
                </div>
              ))}
              </div>
            )}

            {/* Damaged pending kits */}
            {damagedPendingKits.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-6 mb-3">
                  <div className="h-2 w-2 rounded-full" style={{ background: '#E87070' }} />
                  <span className="text-[12px] font-semibold" style={{ color: W.dark }}>Hasarli (Bekliyor)</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
                    style={{ background: '#FDE8E8', color: '#C53030' }}
                  >
                    {damagedPendingKits.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered
                    .filter((k) => k.uiStatus === 'damaged' && k.kitStatus === 'damaged-pending')
                    .map((kit) => (
                      <div
                        key={kit.barcode}
                        className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: '#FDE8E8', border: '1.5px solid transparent' }}
                      >
                        <div>
                          <code className="text-[13px] font-mono font-bold" style={{ color: W.dark }}>{kit.barcode}</code>
                          <p className="text-[10px] mt-0.5" style={{ color: '#C53030' }}>Teslim: {formatDate(kit.receivedAt)}</p>
                        </div>
                        {badgeForKit(kit)}
                      </div>
                    ))}
                </div>
              </>
            )}

            {/* Assigned kits */}
            {assignedKits.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-6 mb-3">
                  <div className="h-2 w-2 rounded-full" style={{ background: W.orange }} />
                  <span className="text-[12px] font-semibold" style={{ color: W.dark }}>Danisana Atanmis</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: W.orangeLight, color: W.orange }}>{assignedKits.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.filter(k => k.uiStatus === 'assigned').map((kit) => (
                    <div
                      key={kit.barcode}
                      className="flex items-center justify-between p-4 rounded-xl"
                      style={{ background: W.orangeLight, border: '1.5px solid transparent' }}
                    >
                      <div>
                        <code className="text-[13px] font-mono font-bold" style={{ color: W.dark }}>{kit.barcode}</code>
                        <p className="text-[10px] mt-0.5" style={{ color: W.orange }}>{kit.client}</p>
                      </div>
                      {badgeForKit(kit)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Info */}
          <div className="px-5 pb-5">
            <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: W.oliveLight }}>
              <ScanLine className="h-4 w-4 shrink-0" style={{ color: W.olive }} />
              <p className="text-[11px]" style={{ color: '#5A6B2A' }}>
                Bu stok, barkod numarasi ile teslim aldiginiz kitleri gosterir. Yeni kit eklemek icin yukaridaki
                <button type="button" onClick={() => setReceiveKitModalOpen(true)} className="font-semibold underline ml-1" style={{ color: '#5A6B2A' }}>Kit Teslim Al</button> butonunu kullanin.
                Iade talebi icin yukaridaki <span className="font-semibold">Iade Talebi</span> butonunu kullanin.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Iade Talebi modali */}
      <Modal open={returnRequestModalOpen} onOpenChange={(open) => !open && closeReturnModal()}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Iade Talebi</ModalTitle>
            <ModalDescription>
              Stogunuzdan bir kit secip kanit dosyasi ve aciklama ekleyin.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <Select
              value={selectedReturnKitId || '_empty'}
              onValueChange={(v) => setSelectedReturnKitId(v === '_empty' ? '' : v)}
            >
              <SelectTrigger label="Kit" className="w-full">
                <SelectValue placeholder={returnableKits.length > 0 ? 'Secin...' : 'Stokta kit yok'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_empty">Secin...</SelectItem>
                {returnableKits.map((k) => (
                  <SelectItem key={k.id} value={String(k.id)}>
                    {k.barcode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="file"
              label="Kanit dosyasi (fotoğraf veya PDF)"
              accept="image/*,application/pdf"
              onChange={(e) => {
                const file = e.target.files && e.target.files[0] ? e.target.files[0] : null
                setReturnFile(file)
              }}
            />

            <Textarea
              label="Neden"
              placeholder="Hasar / iade nedeni..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
          </ModalBody>
          <ModalFooter className="gap-2">
            <Button variant="outline" onClick={closeReturnModal}>
              Iptal
            </Button>
            <Button
              variant="primary"
              onClick={() => void submitReturnRequest()}
              disabled={returnSubmitting || returnableKits.length === 0}
              style={{ background: W.olive }}
            >
              {returnSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gonderiliyor
                </>
              ) : (
                'Iade talebi olustur'
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Kit Teslim Al modali */}
      <Modal open={receiveKitModalOpen} onOpenChange={(open) => !open && closeReceiveKitModal()}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: W.oliveLight }}>
                <ScanLine className="h-5 w-5" style={{ color: W.olive }} />
              </div>
              <div>
                <ModalTitle>Kit Teslim Al</ModalTitle>
                <p className="text-xs text-surface-500 mt-0.5">
                  Kargonuz geldiginde kit uzerindeki barkod numarasini girin
                </p>
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
                  <div className="h-14 w-14 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: W.greenLight }}>
                    <CheckCircle className="h-7 w-7" style={{ color: W.green }} />
                  </div>
                  <h4 className="text-[15px] font-bold text-surface-800">Kit Basariyla Teslim Alindi!</h4>
                  <p className="text-[12px] mt-2 text-surface-500">
                    <code className="font-mono font-semibold text-primary-600">{barcodeInput}</code> barkodlu kit stogunuza eklendi.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={resetBarcode}>
                      <ScanLine className="h-3.5 w-3.5" /> Baska Kit Teslim Al
                    </Button>
                    <Button variant="primary" size="sm" onClick={closeReceiveKitModal} className="gap-1.5">
                      <ArrowRight className="h-3.5 w-3.5" /> Listeyi Guncelle
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
                        placeholder="Barkod (orn: OT-2025-00160)"
                        className="w-full pl-9 pr-3 py-3 text-sm font-mono rounded-xl border border-surface-200 bg-surface-50 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-200"
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
                      style={{ background: W.olive }}
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
                        <div className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary-100 text-primary-700">{s.step}</div>
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
