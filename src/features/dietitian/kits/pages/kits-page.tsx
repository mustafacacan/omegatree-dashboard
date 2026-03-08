import { useMemo, useState, type ChangeEvent } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Badge, Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Modal, ModalContent, ModalHeader, ModalTitle, ModalBody } from '@/components/ui'
import { Timeline } from '@/components/shared/timeline'
import { formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { motion } from 'framer-motion'
import {
  AlertTriangle, Clock, RotateCcw, Image as ImageIcon, Eye, MapPin,
} from 'lucide-react'
import { useCurrentUser } from '@/stores/auth.store'
import { useLaboratoriesStore } from '@/stores/laboratories.store'
import { toast } from 'sonner'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createDamagedKit } from '@/services/damaged-kits.service'
import { getDieticianClientKitById, getDieticianClientKits, type DieticianClientKit } from '@/services/dietician-client-kits.service'

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

function getDieticianKitBarcode(kit: DieticianClientKit) {
  return kit.kitBarcode ?? `#${kit.id}`
}

function DieticianKitStatusBadge({ status }: { status: DieticianClientKit['status'] }) {
  if (!status) return <span className="text-xs text-surface-400">—</span>

  const label =
    status === 'in_client'
      ? 'Danisanda'
      : status === 'in_laboratory'
        ? 'Laboratuvarda'
        : status === 'in_expert'
          ? 'Uzmanda'
          : status === 'delivered'
            ? 'Teslim'
            : status === 'cancelled'
              ? 'Iptal'
              : status === 'completed'
                ? 'Tamamlandi'
                : status

  const variant: 'success' | 'danger' | 'warning' | 'info' | 'primary' =
    status === 'completed' || status === 'delivered'
      ? 'success'
      : status === 'cancelled'
        ? 'danger'
        : status === 'in_laboratory'
          ? 'warning'
          : status === 'in_expert'
            ? 'info'
            : 'primary'

  return (
    <Badge variant={variant} size="sm">
      {label}
    </Badge>
  )
}

function buildDieticianKitTimeline(status: DieticianClientKit['status']) {
  const order: Array<DieticianClientKit['status']> = ['delivered', 'in_client', 'in_laboratory', 'in_expert', 'completed']
  const labels: Record<NonNullable<DieticianClientKit['status']>, string> = {
    delivered: 'Teslim Alindi',
    in_client: 'Danisana Atandi',
    in_laboratory: 'Laboratuvara Ulasti',
    in_expert: 'Uzman Incelemesi',
    completed: 'Tamamlandi',
    cancelled: 'Iptal Edildi',
  }

  if (!status) {
    return order.map((s) => ({ label: labels[s], status: 'upcoming' as const }))
  }

  if (status === 'cancelled') {
    return [
      { label: labels.delivered, status: 'upcoming' as const },
      { label: labels.in_client, status: 'upcoming' as const },
      { label: labels.in_laboratory, status: 'upcoming' as const },
      { label: labels.in_expert, status: 'upcoming' as const },
      { label: labels.cancelled, status: 'error' as const },
    ]
  }

  const idx = order.indexOf(status)
  return order.map((s, i) => {
    if (idx === -1) return { label: labels[s], status: 'upcoming' as const }
    if (i < idx) return { label: labels[s], status: 'completed' as const }
    if (i === idx) return { label: labels[s], status: status === 'completed' ? 'completed' as const : 'current' as const }
    return { label: labels[s], status: 'upcoming' as const }
  })
}

export function KitsPage() {
  const user = useCurrentUser()
  const laboratories = useLaboratoriesStore((s) => s.laboratories)
  const assignedLab = user?.id
    ? laboratories.find((l) => l.assignedDietitians.includes(user.id))
    : null
  const queryClient = useQueryClient()
  const [returnFormKitId, setReturnFormKitId] = useState<number | null>(null)
  const [returnReason, setReturnReason] = useState('')
  const [returnPhotoUrl, setReturnPhotoUrl] = useState<string | undefined>(undefined)
  const [returnPhotoFile, setReturnPhotoFile] = useState<File | null>(null)
  const [returnPhotoName, setReturnPhotoName] = useState('')
  const [returnError, setReturnError] = useState('')
  const [detailModalKitId, setDetailModalKitId] = useState<number | null>(null)

  const kitsQuery = useQuery({
    queryKey: ['dietician-client-kits', 1],
    queryFn: () => getDieticianClientKits(1),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const detailQuery = useQuery({
    queryKey: ['dietician-client-kits', 'detail', detailModalKitId],
    queryFn: () => getDieticianClientKitById(detailModalKitId as number),
    enabled: detailModalKitId != null,
    retry: 1,
  })

  const createDamagedMutation = useMutation({
      mutationFn: ({ kitId, reason, imageFile }: { kitId: string; reason: string; imageFile: File }) =>
        createDamagedKit(kitId, { reason, imageFile }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['damaged-kits'] })
    },
    onError: (err: { response?: { data?: { message?: string; errors?: string[] } } }) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Iade talebi gonderilemedi.' }))
    },
  })
  const myKits = useMemo(() => {
    const items = kitsQuery.data ?? []
    return [...items].sort((a, b) => {
      const aDate = a.updatedAt ?? a.createdAt ?? a.kitUpdatedAt ?? a.kitCreatedAt ?? '1970-01-01T00:00:00.000Z'
      const bDate = b.updatedAt ?? b.createdAt ?? b.kitUpdatedAt ?? b.kitCreatedAt ?? '1970-01-01T00:00:00.000Z'
      return new Date(bDate).getTime() - new Date(aDate).getTime()
    })
  }, [kitsQuery.data])

  const handleReturnPhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setReturnPhotoFile(file)
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
    if (!returnPhotoFile) {
      setReturnError('Hasar bildirimi icin fotoğraf yuklemeniz zorunludur.')
      return
    }
    createDamagedMutation.mutate(
        { kitId: barcode, reason: returnReason, imageFile: returnPhotoFile },
      {
        onSuccess: () => {
          toast.success('Iade talebiniz gonderildi. Admin incelemesi bekleniyor.')
          setReturnFormKitId(null)
          setReturnReason('')
          setReturnPhotoUrl(undefined)
          setReturnPhotoFile(null)
          setReturnPhotoName('')
          setReturnError('')
        },
      }
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        actions={
          <Button
            variant="outline"
            size="sm"
            className="text-amber-600 border-amber-300 hover:bg-amber-50"
            onClick={() =>
              toast(
                'Hasar / iade bildirimi icin ilgili kitin satirindaki "Surec Takibi" butonuna tiklayin, acilan pencerede "Iade Talebi Olustur" secin.',
                { icon: '📋', duration: 5000 }
              )
            }
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Hasar Bildir
          </Button>
        }
      />

      {/* Numuneleri göndereceğiniz laboratuvar adresi */}
      {assignedLab && (
        <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
          <div className="rounded-xl p-4 border flex items-start gap-3" style={{ background: W.oliveLight, borderColor: W.warmBorder }}>
            <MapPin className="h-5 w-5 shrink-0 mt-0.5" style={{ color: W.olive }} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: W.textLight }}>Numuneleri gondereceginiz adres</p>
              <p className="text-[14px] font-semibold mt-1" style={{ color: W.dark }}>{assignedLab.name}</p>
              <p className="text-[13px] mt-1 leading-snug" style={{ color: W.text }}>
                {assignedLab.address}
                {assignedLab.district ? `, ${assignedLab.district}` : ''} / {assignedLab.city}
                {assignedLab.postalCode ? ` ${assignedLab.postalCode}` : ''}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══ ACTIVE KITS — Tablo ═══ */}
      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold" style={{ color: W.dark }}>Aktif Kitlerim</h3>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: W.oliveLight, color: W.olive }}>
            {myKits.length} kit
          </span>
        </div>

        <div className="panel">
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
              {kitsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-surface-500 text-sm">
                    Yukleniyor...
                  </TableCell>
                </TableRow>
              ) : kitsQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-surface-500 text-sm">
                    {getApiErrorMessage(kitsQuery.error, { fallback: 'Kitler yuklenemedi.' })}
                  </TableCell>
                </TableRow>
              ) : myKits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-surface-500 text-sm">
                    Henuz kitiniz yok. Siparis verdikten sonra kargodan gelen kitleri barkod ile teslim alin.
                  </TableCell>
                </TableRow>
              ) : (
                myKits.map((kit) => (
                  <TableRow key={kit.id}>
                    <TableCell>
                      <code className="font-mono font-semibold text-surface-800">{getDieticianKitBarcode(kit)}</code>
                    </TableCell>
                    <TableCell className="text-surface-700">{kit.clientName || 'Danisan atanmadi'}</TableCell>
                    <TableCell>
                      <DieticianKitStatusBadge status={kit.status} />
                    </TableCell>
                    <TableCell className="text-surface-500 text-xs">
                      {formatDate(kit.createdAt || kit.kitCreatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailModalKitId(kit.id)}
                        className="gap-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                          Goruntule
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
      <Modal open={!!detailModalKitId} onOpenChange={(open) => !open && setDetailModalKitId(null)}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Surec Takibi</ModalTitle>
          </ModalHeader>
          <ModalBody>
            {detailModalKitId != null && (() => {
              const fromList = myKits.find((k) => k.id === detailModalKitId) ?? null
              const kit = detailQuery.data ?? fromList

              if (detailQuery.isLoading && !kit) {
                return <div className="py-10 text-center text-sm text-surface-500">Yukleniyor...</div>
              }

              if (detailQuery.isError && !kit) {
                return (
                  <div className="py-10 text-center text-sm text-surface-500">
                    {getApiErrorMessage(detailQuery.error, { fallback: 'Detay yuklenemedi.' })}
                  </div>
                )
              }

              if (!kit) return null

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-surface-200">
                    <div>
                      <code className="text-sm font-mono font-bold text-surface-800">{getDieticianKitBarcode(kit)}</code>
                      <p className="text-xs text-surface-500 mt-0.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {kit.clientName || 'Danisan atanmadi'} · {formatDate(kit.createdAt || kit.kitCreatedAt)}
                      </p>
                    </div>
                    <DieticianKitStatusBadge status={kit.status} />
                  </div>

                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-semibold text-surface-500">Kit</p>
                        <p className="text-[13px] font-medium text-surface-800">{kit.kitName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-surface-500">Durum</p>
                        <div className="mt-0.5"><DieticianKitStatusBadge status={kit.status} /></div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-surface-500">Diyetisyen</p>
                        <p className="text-[13px] font-medium text-surface-800">{kit.dieticianName || '—'}</p>
                        {(kit.dieticianPhone || kit.dieticianEmail) && (
                          <p className="text-[11px] text-surface-500 mt-0.5">
                            {kit.dieticianPhone ?? ''}{kit.dieticianPhone && kit.dieticianEmail ? ' · ' : ''}{kit.dieticianEmail ?? ''}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-surface-500">Danisan</p>
                        <p className="text-[13px] font-medium text-surface-800">{kit.clientName || '—'}</p>
                        {(kit.clientPhone || kit.clientEmail) && (
                          <p className="text-[11px] text-surface-500 mt-0.5">
                            {kit.clientPhone ?? ''}{kit.clientPhone && kit.clientEmail ? ' · ' : ''}{kit.clientEmail ?? ''}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <Timeline steps={buildDieticianKitTimeline(kit.status)} />

                  {detailQuery.isError ? (
                    <p className="text-[11px] text-surface-500">
                      Detay yenilenemedi: {getApiErrorMessage(detailQuery.error, { fallback: 'Bilinmeyen hata' })}
                    </p>
                  ) : null}

                  {kit.status === 'delivered' && (
                    <div className="pt-3 space-y-2 border-t border-surface-200">
                      <button
                        type="button"
                        className="w-full py-2.5 rounded-xl text-[12px] font-semibold transition-colors border"
                        style={{ color: '#A45F16', background: '#FFF7ED', borderColor: '#F3D6B4' }}
                        onClick={() => {
                          setReturnFormKitId(returnFormKitId === kit.id ? null : kit.id)
                          setReturnError('')
                        }}
                      >
                        <RotateCcw className="h-3.5 w-3.5 inline mr-1.5" />
                        Iade Talebi Olustur
                      </button>

                      {returnFormKitId === kit.id && (
                        <>
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
                            Foto ekle (zorunlu — hasar kaniti)
                            <input type="file" accept="image/*" className="hidden" onChange={handleReturnPhotoChange} />
                          </label>
                          {returnPhotoName && <p className="text-[10px] text-surface-500">Secilen: {returnPhotoName}</p>}
                          {returnPhotoUrl && (
                            <img src={returnPhotoUrl} alt="Iade" className="w-full h-24 object-cover rounded-lg border border-surface-200" />
                          )}
                          {returnError && <p className="text-xs font-medium text-red-600">{returnError}</p>}
                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setReturnFormKitId(null)
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
                              disabled={!returnPhotoUrl || !returnPhotoFile || createDamagedMutation.isPending}
                              onClick={() => {
                                const barcode = kit.kitBarcode
                                if (!barcode) {
                                  setReturnError('Kit barkodu bulunamadi.')
                                  return
                                }
                                submitReturnRequest(barcode)
                                setDetailModalKitId(null)
                              }}
                            >
                              {createDamagedMutation.isPending ? 'Gonderiliyor...' : 'Iade Talebini Gonder'}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {kit.description && kit.description.trim() ? (
                    <div className="pt-3 border-t border-surface-200">
                      <p className="text-[11px] font-semibold text-surface-500">Aciklama</p>
                      <p className="text-[13px] mt-1 text-surface-700 leading-snug">
                        {kit.description}
                      </p>
                    </div>
                  ) : null}
                </div>
              )
            })()}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
