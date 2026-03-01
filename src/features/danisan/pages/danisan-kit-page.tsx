import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui'
import { StatusBadge } from '@/components/shared/status-badge'
import { KitStatus } from '@/utils/constants'
import { Package, Truck, ScanLine, CheckCircle, XCircle, Loader2, Send } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'
import { formatDate } from '@/lib/utils'
import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

type BarcodeState = 'idle' | 'checking' | 'success' | 'error'

export function DanisanKitPage() {
  const user = useCurrentUser()
  const { kits, receiveKitByClient, markSampleSentByClient } = useWorkflowStore()
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeState, setBarcodeState] = useState<BarcodeState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [sampleSending, setSampleSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Danışan sadece kendisine atanmış kitleri görebilir
  const activeKit = kits.find((k) => k.assignedClientId === user?.id)
  const demoKit = activeKit
    ? {
        barcode: activeKit.barcode,
        status: activeKit.status as KitStatus,
        requestedAt: formatDate(activeKit.createdAt),
        deliveredAt: formatDate(activeKit.createdAt),
        trackingNo: activeKit.trackingNo || '—',
      }
    : null

  const handleBarcodeSubmit = () => {
    const trimmed = barcodeInput.trim()
    if (!trimmed) return

    if (!user?.id) {
      toast.error('Kullanici bilgisi bulunamadi')
      return
    }

    setBarcodeState('checking')
    setErrorMessage('')

    setTimeout(() => {
      const clientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Danisan'
      const result = receiveKitByClient(trimmed, user.id, clientName)
      if (result.ok) {
        setBarcodeState('success')
        toast.success(result.message || 'Kit teslim alindi!')
        setTimeout(() => {
          setBarcodeInput('')
          setBarcodeState('idle')
        }, 2000)
      } else {
        setBarcodeState('error')
        setErrorMessage(result.message || 'Barkod eslesmedi.')
        toast.error(result.message || 'Barkod eslesmedi.')
      }
    }, 600)
  }

  const resetBarcode = () => {
    setBarcodeInput('')
    setBarcodeState('idle')
    setErrorMessage('')
    inputRef.current?.focus()
  }

  const handleMarkSampleSent = () => {
    if (!activeKit || activeKit.status !== KitStatus.CLIENT_RECEIVED || !user?.id) return
    const clientName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Danisan'
    setSampleSending(true)
    setTimeout(() => {
      const result = markSampleSentByClient(activeKit.barcode, user.id, clientName, clientName)
      setSampleSending(false)
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    }, 400)
  }

  const canMarkSampleSent = activeKit?.status === KitStatus.CLIENT_RECEIVED

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader />

      {/* Barkod Girişi - Eğer henüz kit atanmamışsa veya teslim alınmamışsa */}
      {(!activeKit || activeKit.status !== KitStatus.CLIENT_RECEIVED) && (
        <Card className="border-primary-200 bg-primary-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                <ScanLine className="h-6 w-6 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-surface-900 mb-1">Kit Barkod Girişi</h3>
                <p className="text-sm text-surface-600 mb-4">
                  {activeKit
                    ? 'Kitinizi teslim almak icin barkod numarasini girin'
                    : 'Size atanan kitin barkod numarasini girin'}
                </p>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={barcodeInput}
                      onChange={(e) => {
                        setBarcodeInput(e.target.value.toUpperCase())
                        if (barcodeState !== 'idle') {
                          setBarcodeState('idle')
                          setErrorMessage('')
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && barcodeState === 'idle') {
                          handleBarcodeSubmit()
                        }
                      }}
                      placeholder="Barkod numarasini girin..."
                      disabled={barcodeState === 'checking' || barcodeState === 'success'}
                      className="flex-1 font-mono"
                    />
                    {barcodeState === 'idle' && (
                      <Button variant="primary" onClick={handleBarcodeSubmit} disabled={!barcodeInput.trim()}>
                        <ScanLine className="h-4 w-4" />
                        Kontrol Et
                      </Button>
                    )}
                    {barcodeState === 'checking' && (
                      <Button variant="primary" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Kontrol Ediliyor...
                      </Button>
                    )}
                    {barcodeState === 'success' && (
                      <Button variant="success" disabled>
                        <CheckCircle className="h-4 w-4" />
                        Basarili
                      </Button>
                    )}
                    {barcodeState === 'error' && (
                      <Button variant="outline" onClick={resetBarcode}>
                        <XCircle className="h-4 w-4" />
                        Tekrar Dene
                      </Button>
                    )}
                  </div>
                  <AnimatePresence>
                    {errorMessage && barcodeState === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
                      >
                        {errorMessage}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Numuneyi gönderdim – sadece kit teslim alındı (CLIENT_RECEIVED) iken */}
      {canMarkSampleSent && (
        <Card className="border-violet-200 bg-violet-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Send className="h-6 w-6 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-surface-900 mb-1">Numuneyi laboratuvara gonderdim</h3>
                <p className="text-sm text-surface-600 mb-4">
                  Numuneyi laboratuvara gonderdiyseniz asagidaki butona tiklayarak sureci ilerletin. Diyetisyeniniz de bu adimi sizin yerinize isaretleyebilir.
                </p>
                <Button
                  variant="primary"
                  onClick={handleMarkSampleSent}
                  disabled={sampleSending}
                >
                  {sampleSending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Isaretleniyor...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Numuneyi gonderildi olarak isaretle
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          {!demoKit ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-surface-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-surface-600 mb-1">Henuz kit atanmadi</p>
              <p className="text-xs text-surface-400">Diyetisyeniniz size bir kit atadiginda burada gorunecektir.</p>
            </div>
          ) : (
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
              <Package className="h-7 w-7 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <code className="text-sm font-mono font-semibold text-surface-800">{demoKit.barcode}</code>
                <StatusBadge status={demoKit.status} size="sm" pulse />
              </div>
              <p className="text-sm text-surface-500 mb-4">
                {demoKit.status === KitStatus.CLIENT_RECEIVED
                  ? 'Numuneyi laboratuvara gonderdikten sonra "Numuneyi gonderildi olarak isaretle" butonunu kullanin.'
                  : ([KitStatus.SAMPLE_SENT, KitStatus.LAB_PENDING, KitStatus.IN_ANALYSIS] as KitStatus[]).includes(demoKit.status)
                    ? 'Numune laboratuvarda. Sonuc hazir oldugunda raporunuz diyetisyeniniz uzerinden paylasilacaktir.'
                    : 'Surec devam ediyor. Rapor hazir oldugunda burada gorunecektir.'}
              </p>
              {demoKit.trackingNo && (
                <div className="flex items-center gap-2 text-sm text-surface-600">
                  <Truck className="h-4 w-4" />
                  <span>Kargo takip no: <strong>{demoKit.trackingNo}</strong></span>
                </div>
              )}
            </div>
          </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-surface-800 mb-3">Takip cizelgesi</h3>
          {demoKit ? (
            <ul className="space-y-3 text-sm text-surface-600">
              <li className="flex items-center gap-2">
                <span className="text-primary-500">✓</span>
                <span>Kit gonderildi</span>
                <span className="text-surface-400 ml-auto">{demoKit.requestedAt}</span>
              </li>
              <li className="flex items-center gap-2">
                {([KitStatus.DELIVERED, KitStatus.CLIENT_RECEIVED, KitStatus.SAMPLE_SENT, KitStatus.LAB_PENDING, KitStatus.IN_ANALYSIS, KitStatus.ANALYSIS_COMPLETE, KitStatus.SPECIALIST_POOL, KitStatus.REPORT_READY, KitStatus.ADMIN_APPROVAL, KitStatus.COMPLETED] as KitStatus[]).includes(demoKit.status)
                  ? <><span className="text-primary-500">✓</span><span>Numune alindi</span><span className="text-surface-400 ml-auto">{demoKit.deliveredAt}</span></>
                  : <><span className="text-primary-400">●</span><span>Numune alinacak</span></>
                }
              </li>
              <li className="flex items-center gap-2">
                {([KitStatus.SAMPLE_SENT, KitStatus.LAB_PENDING, KitStatus.IN_ANALYSIS, KitStatus.ANALYSIS_COMPLETE, KitStatus.SPECIALIST_POOL, KitStatus.REPORT_READY, KitStatus.ADMIN_APPROVAL, KitStatus.COMPLETED] as KitStatus[]).includes(demoKit.status)
                  ? ([KitStatus.IN_ANALYSIS, KitStatus.ANALYSIS_COMPLETE] as KitStatus[]).includes(demoKit.status)
                    ? <><span className="text-primary-400">●</span><span>Analizde</span></>
                    : ([KitStatus.ANALYSIS_COMPLETE, KitStatus.SPECIALIST_POOL, KitStatus.REPORT_READY, KitStatus.ADMIN_APPROVAL, KitStatus.COMPLETED] as KitStatus[]).includes(demoKit.status)
                      ? <><span className="text-primary-500">✓</span><span>Analizde</span></>
                      : <><span className="text-primary-400">●</span><span>Analiz bekleniyor</span></>
                  : <><span className="text-surface-300">○</span><span>Analizde</span></>
                }
              </li>
              <li className="flex items-center gap-2">
                {demoKit.status === KitStatus.COMPLETED
                  ? <><span className="text-primary-500">✓</span><span>Sonuc hazir</span></>
                  : <><span className="text-surface-300">○</span><span>Sonuc hazir</span></>
                }
              </li>
            </ul>
          ) : (
            <p className="text-sm text-surface-500">Numune gonderildikten sonra adim adim surec takibi burada gorunecek.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

