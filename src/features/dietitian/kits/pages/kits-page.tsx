import { useState, useRef, type ChangeEvent } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui'
import { StatusBadge } from '@/components/shared/status-badge'
import { Timeline } from '@/components/shared/timeline'
import { KitStatus } from '@/utils/constants'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ScanLine, AlertTriangle, CheckCircle,
  ArrowRight, Clock, Loader2, Search, Send, RotateCcw, Image as ImageIcon,
} from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'
import toast from 'react-hot-toast'

const W = {
  olive: '#8B9A4B', oliveLight: '#EEF2DE',
  orange: '#E8913A', orangeLight: '#FDF0E2',
  amber: '#F5C842', amberLight: '#FDF8E8',
  green: '#6ABF69', greenLight: '#E8F5E8',
  cream: '#F9F7F3', creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE', dark: '#2D2A26',
  text: '#4A4640', textLight: '#9C968D', warmGrayLight: '#B5AFA5',
}

type BarcodeState = 'idle' | 'checking' | 'success' | 'error'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function KitsPage() {
  const user = useCurrentUser()
  const { kits, receiveKitByBarcode, markSampleSent, requestKitReturn } = useWorkflowStore()
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeState, setBarcodeState] = useState<BarcodeState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [returnFormBarcode, setReturnFormBarcode] = useState<string | null>(null)
  const [returnReason, setReturnReason] = useState('')
  const [returnPhotoUrl, setReturnPhotoUrl] = useState<string | undefined>(undefined)
  const [returnPhotoName, setReturnPhotoName] = useState('')
  const [returnError, setReturnError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const myKits = kits
    .filter((k) => k.assignedDietitianId === user?.id)
    .map((k) => ({
      barcode: k.barcode,
      status: k.status,
      client: k.assignedClientName || 'Danisan atanmadi',
      assignedDate: k.createdAt,
      returnRequest: k.returnRequest,
      timeline: [
        {
          label: 'Teslim Alindi',
          status:
            k.status === KitStatus.DELIVERED ||
            k.status === KitStatus.RETURN_REQUESTED ||
            k.status === KitStatus.SAMPLE_SENT ||
            k.status === KitStatus.IN_ANALYSIS ||
            k.status === KitStatus.COMPLETED
              ? 'completed' as const
              : 'upcoming' as const,
        },
        { label: 'Danisana Atandi', status: k.assignedClientName ? 'completed' as const : 'upcoming' as const },
        {
          label: 'Numune Gonderildi',
          status:
            k.status === KitStatus.SAMPLE_SENT ||
            k.status === KitStatus.IN_ANALYSIS ||
            k.status === KitStatus.COMPLETED
              ? 'completed' as const
              : 'upcoming' as const,
        },
        {
          label: 'Analiz',
          status:
            k.status === KitStatus.IN_ANALYSIS
              ? 'current' as const
              : k.status === KitStatus.COMPLETED
                ? 'completed' as const
                : 'upcoming' as const,
        },
        { label: 'Rapor', status: k.status === KitStatus.COMPLETED ? 'completed' as const : 'upcoming' as const },
      ],
    }))

  const handleBarcodeSubmit = () => {
    const trimmed = barcodeInput.trim()
    if (!trimmed) return

    setBarcodeState('checking')
    setErrorMessage('')

    setTimeout(() => {
      const result = receiveKitByBarcode(trimmed, user?.id || '', `${user?.firstName || ''} ${user?.lastName || ''}`.trim())
      if (result.ok) {
        setBarcodeState('success')
      } else {
        setBarcodeState('error')
        setErrorMessage(result.message || 'Barkod eslesmedi.')
      }
    }, 600)
  }

  const resetBarcode = () => {
    setBarcodeInput('')
    setBarcodeState('idle')
    setErrorMessage('')
    inputRef.current?.focus()
  }

  const handleReturnPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setReturnPhotoName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReturnPhotoUrl(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const submitReturnRequest = (barcode: string) => {
    if (!user?.id) {
      setReturnError('Kullanici bilgisi bulunamadi.')
      return
    }
    const actorName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Diyetisyen'
    const result = requestKitReturn(barcode, user.id, returnReason, actorName, { photoUrl: returnPhotoUrl })
    if (!result.ok) {
      setReturnError(result.message)
      return
    }

    toast.success(result.message)
    setReturnFormBarcode(null)
    setReturnReason('')
    setReturnPhotoUrl(undefined)
    setReturnPhotoName('')
    setReturnError('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        actions={
          <Button variant="outline" size="sm" className="text-amber-600 border-amber-300 hover:bg-amber-50">
            <AlertTriangle className="h-3.5 w-3.5" />
            Hasar Bildir
          </Button>
        }
      />

      {/* ═══ BARCODE ENTRY SECTION ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35 }}>
        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>

          {/* Header */}
          <div className="p-5 flex items-center gap-4" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
            <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: W.oliveLight }}>
              <ScanLine className="h-6 w-6" style={{ color: W.olive }} />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Kit Teslim Al</h3>
              <p className="text-[12px]" style={{ color: W.textLight }}>
                Kargonuz geldiginde kit uzerindeki barkod numarasini girin
              </p>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              {barcodeState === 'success' ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="text-center py-6"
                >
                  <div className="h-16 w-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: W.greenLight }}>
                    <CheckCircle className="h-8 w-8" style={{ color: W.green }} />
                  </div>
                  <h4 className="text-[16px] font-bold" style={{ color: W.dark }}>Kit Basariyla Teslim Alindi!</h4>
                  <p className="text-[13px] mt-2 max-w-md mx-auto" style={{ color: W.textLight }}>
                    <code className="font-mono font-semibold" style={{ color: W.olive }}>{barcodeInput}</code> barkodlu kit stogunuza eklendi.
                    Artik bu kiti bir danisana atayabilirsiniz.
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-5">
                    <Button variant="outline" size="sm" onClick={resetBarcode}>
                      <ScanLine className="h-3.5 w-3.5" /> Baska Kit Teslim Al
                    </Button>
                    <Button variant="primary" size="sm" onClick={resetBarcode}>
                      <ArrowRight className="h-3.5 w-3.5" /> Stoguma Git
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: W.warmGrayLight }} />
                      <input
                        ref={inputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => { setBarcodeInput(e.target.value.toUpperCase()); if (barcodeState === 'error') setBarcodeState('idle') }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleBarcodeSubmit() }}
                        placeholder="Barkod numarasini girin (orn: OT-2025-00160)"
                        className="w-full pl-11 pr-4 py-3.5 text-[14px] font-mono rounded-xl outline-none transition-colors"
                        style={{
                          background: W.cream,
                          border: `2px solid ${barcodeState === 'error' ? '#E87070' : W.warmBorder}`,
                          color: W.dark,
                        }}
                        onFocus={(e) => { if (barcodeState !== 'error') e.currentTarget.style.borderColor = W.olive }}
                        onBlur={(e) => { if (barcodeState !== 'error') e.currentTarget.style.borderColor = W.warmBorder }}
                        disabled={barcodeState === 'checking'}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleBarcodeSubmit}
                      disabled={!barcodeInput.trim() || barcodeState === 'checking'}
                      className="px-6 rounded-xl text-[13px] font-semibold text-white transition-all disabled:opacity-40"
                      style={{ background: W.olive }}
                    >
                      {barcodeState === 'checking' ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        'Teslim Al'
                      )}
                    </button>
                  </div>

                  {/* Error message */}
                  {barcodeState === 'error' && errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 mt-3 p-3 rounded-xl"
                      style={{ background: '#FDE8E8', border: '1px solid #F5C0C0' }}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#C53030' }} />
                      <div className="flex-1">
                        <p className="text-[12px] font-medium" style={{ color: '#C53030' }}>{errorMessage}</p>
                        <button type="button" onClick={resetBarcode} className="text-[11px] font-semibold mt-1 underline" style={{ color: '#C53030' }}>
                          Tekrar Dene
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* How it works */}
                  <div className="flex items-center gap-6 mt-4 pt-4" style={{ borderTop: `1px solid ${W.warmBorder}` }}>
                    {[
                      { step: 1, text: 'Kit kargonuz gelsin' },
                      { step: 2, text: 'Barkod numarasini girin' },
                      { step: 3, text: 'Kit stogunuza eklensin' },
                    ].map((s) => (
                      <div key={s.step} className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: W.oliveLight, color: W.olive }}>
                          {s.step}
                        </div>
                        <span className="text-[11px]" style={{ color: W.textLight }}>{s.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ═══ ACTIVE KITS ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Aktif Kitlerim</h3>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: W.oliveLight, color: W.olive }}>
            {myKits.length} kit
          </span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {myKits.map((kit, i) => (
          <motion.div key={kit.barcode} {...fadeUp} transition={{ duration: 0.3, delay: 0.15 + i * 0.06 }}>
            <div className="rounded-2xl overflow-hidden h-full transition-shadow hover:shadow-md" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>

              {/* Kit header */}
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${W.warmBorder}` }}>
                <div>
                  <code className="text-[13px] font-mono font-bold" style={{ color: W.dark }}>{kit.barcode}</code>
                  <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: W.textLight }}>
                    <Clock className="h-2.5 w-2.5" /> {kit.client} · {kit.assignedDate}
                  </p>
                </div>
                <StatusBadge status={kit.status} />
              </div>

              {/* Timeline */}
              <div className="p-4">
                <Timeline steps={kit.timeline} />

                {/* Action button */}
                {kit.status === KitStatus.DELIVERED && (
                  <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${W.warmBorder}` }}>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: W.olive }}
                        onClick={() => markSampleSent(kit.barcode, user?.id || '', `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Diyetisyen')}
                      >
                        <Send className="h-3.5 w-3.5 inline mr-1.5" />
                        Numune Gonderildi Isaretle
                      </button>
                      <button
                        type="button"
                        className="w-full py-2.5 rounded-xl text-[12px] font-semibold transition-colors border"
                        style={{ color: '#A45F16', background: '#FFF7ED', borderColor: '#F3D6B4' }}
                        onClick={() => {
                          setReturnFormBarcode(returnFormBarcode === kit.barcode ? null : kit.barcode)
                          setReturnError('')
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5 inline mr-1.5" />
                        Iade Talebi Olustur
                      </button>
                    </div>
                  </div>
                )}

                {kit.status === KitStatus.RETURN_REQUESTED && (
                  <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${W.warmBorder}` }}>
                    <p className="text-[11px] font-medium" style={{ color: '#A45F16' }}>
                      Iade talebiniz admine iletildi.
                    </p>
                    {kit.returnRequest?.reason && (
                      <p className="text-[11px] mt-1" style={{ color: W.textLight }}>
                        Neden: {kit.returnRequest.reason}
                      </p>
                    )}
                  </div>
                )}

                {returnFormBarcode === kit.barcode && kit.status === KitStatus.DELIVERED && (
                  <div className="mt-3 pt-3 space-y-2" style={{ borderTop: `1px solid ${W.warmBorder}` }}>
                    <label className="text-[11px] font-semibold" style={{ color: W.dark }}>
                      Iade nedeni (zorunlu)
                    </label>
                    <textarea
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      rows={3}
                      placeholder="Kiti neden iade etmek istediginizi yazin..."
                      className="w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none"
                      style={{ background: W.cream, border: `1px solid ${W.warmBorder}`, color: W.dark }}
                    />

                    <label
                      className="flex items-center gap-2 text-[11px] font-medium cursor-pointer"
                      style={{ color: W.text }}
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Foto ekle (opsiyonel)
                      <input type="file" accept="image/*" className="hidden" onChange={handleReturnPhotoChange} />
                    </label>
                    {returnPhotoName && (
                      <p className="text-[10px]" style={{ color: W.textLight }}>
                        Secilen dosya: {returnPhotoName}
                      </p>
                    )}

                    {returnPhotoUrl && (
                      <img src={returnPhotoUrl} alt="Iade kanit gorseli" className="w-full h-28 object-cover rounded-lg border border-surface-200" />
                    )}

                    {returnError && (
                      <p className="text-[11px] font-medium" style={{ color: '#C53030' }}>
                        {returnError}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReturnFormBarcode(null)
                          setReturnReason('')
                          setReturnPhotoUrl(undefined)
                          setReturnPhotoName('')
                          setReturnError('')
                        }}
                      >
                        Vazgec
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => submitReturnRequest(kit.barcode)}>
                        Iade Talebini Gonder
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
