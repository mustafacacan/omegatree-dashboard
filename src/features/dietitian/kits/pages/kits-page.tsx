import { useState, type ChangeEvent } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Modal, ModalContent, ModalHeader, ModalTitle, ModalBody } from '@/components/ui'
import { StatusBadge } from '@/components/shared/status-badge'
import { Timeline } from '@/components/shared/timeline'
import { KitStatus } from '@/utils/constants'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Clock, Send, RotateCcw, Image as ImageIcon, Eye,
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

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

export function KitsPage() {
  const user = useCurrentUser()
  const { kits, markSampleSent, requestKitReturn } = useWorkflowStore()
  const [returnFormBarcode, setReturnFormBarcode] = useState<string | null>(null)
  const [returnReason, setReturnReason] = useState('')
  const [returnPhotoUrl, setReturnPhotoUrl] = useState<string | undefined>(undefined)
  const [returnPhotoName, setReturnPhotoName] = useState('')
  const [returnError, setReturnError] = useState('')
  const [detailModalBarcode, setDetailModalBarcode] = useState<string | null>(null)
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

      {/* ═══ ACTIVE KITS — Tablo ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Aktif Kitlerim</h3>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: W.oliveLight, color: W.olive }}>
            {myKits.length} kit
          </span>
        </div>

        <div className="rounded-2xl overflow-hidden border border-surface-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barkod</TableHead>
                <TableHead>Danisan</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead className="text-right">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myKits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-surface-500 text-sm">
                    Henuz kitiniz yok. Siparis verdikten sonra kargodan gelen kitleri barkod ile teslim alin.
                  </TableCell>
                </TableRow>
              ) : (
                myKits.map((kit) => (
                  <TableRow key={kit.barcode}>
                    <TableCell>
                      <code className="font-mono font-semibold text-surface-800">{kit.barcode}</code>
                    </TableCell>
                    <TableCell className="text-surface-700">{kit.client}</TableCell>
                    <TableCell>
                      <StatusBadge status={kit.status} />
                    </TableCell>
                    <TableCell className="text-surface-500 text-xs">
                      {formatDate(kit.assignedDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailModalBarcode(kit.barcode)}
                        className="gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Surec Takibi
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      {/* Süreç takibi detay modali — Kart icerigi */}
      <Modal open={!!detailModalBarcode} onOpenChange={(open) => !open && setDetailModalBarcode(null)}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Surec Takibi</ModalTitle>
          </ModalHeader>
          <ModalBody>
            {detailModalBarcode && (() => {
              const kit = myKits.find((k) => k.barcode === detailModalBarcode)
              if (!kit) return null
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-surface-200">
                    <div>
                      <code className="text-sm font-mono font-bold text-surface-800">{kit.barcode}</code>
                      <p className="text-xs text-surface-500 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {kit.client} · {formatDate(kit.assignedDate)}
                      </p>
                    </div>
                    <StatusBadge status={kit.status} />
                  </div>

                  <Timeline steps={kit.timeline} />

                  {kit.status === KitStatus.DELIVERED && (
                    <div className="pt-3 space-y-2 border-t border-surface-200">
                      <button
                        type="button"
                        className="w-full py-2.5 rounded-xl text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: W.olive }}
                        onClick={() => {
                          markSampleSent(kit.barcode, user?.id || '', `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Diyetisyen')
                          setDetailModalBarcode(null)
                        }}
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
                  )}

                  {kit.status === KitStatus.RETURN_REQUESTED && (
                    <div className="pt-3 border-t border-surface-200">
                      <p className="text-xs font-medium" style={{ color: '#A45F16' }}>
                        Iade talebiniz admine iletildi.
                      </p>
                      {kit.returnRequest?.reason && (
                        <p className="text-xs mt-1 text-surface-500">Neden: {kit.returnRequest.reason}</p>
                      )}
                    </div>
                  )}

                  {returnFormBarcode === kit.barcode && kit.status === KitStatus.DELIVERED && (
                    <div className="pt-3 space-y-2 border-t border-surface-200">
                      <label className="text-xs font-semibold text-surface-700">Iade nedeni (zorunlu)</label>
                      <textarea
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        rows={3}
                        placeholder="Kiti neden iade etmek istediginizi yazin..."
                        className="w-full rounded-xl px-3 py-2 text-[12px] outline-none resize-none border border-surface-200 bg-surface-50"
                      />
                      <label className="flex items-center gap-2 text-xs font-medium text-surface-600 cursor-pointer">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Foto ekle (opsiyonel)
                        <input type="file" accept="image/*" className="hidden" onChange={handleReturnPhotoChange} />
                      </label>
                      {returnPhotoName && <p className="text-[10px] text-surface-500">Secilen: {returnPhotoName}</p>}
                      {returnPhotoUrl && (
                        <img src={returnPhotoUrl} alt="Iade" className="w-full h-24 object-cover rounded-lg border border-surface-200" />
                      )}
                      {returnError && <p className="text-xs font-medium text-red-600">{returnError}</p>}
                      <div className="flex justify-end gap-2 pt-1">
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
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            submitReturnRequest(kit.barcode)
                            setDetailModalBarcode(null)
                          }}
                        >
                          Iade Talebini Gonder
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
