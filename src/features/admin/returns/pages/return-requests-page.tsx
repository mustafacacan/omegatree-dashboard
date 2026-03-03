import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Badge,
} from '@/components/ui'
import { useWorkflowStore } from '@/stores/workflow.store'
import { Search, RotateCcw, CheckCircle, XCircle, History, Package } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { KitStatus } from '@/utils/constants'
import {
  getDamagedKits,
  approveDamagedKit,
  assignReplacementForDamaged,
  type DamagedKit,
} from '@/services/damaged-kits.service'

const DAMAGED_KITS_QUERY_KEY = ['damaged-kits'] as const

const W = {
  olive: '#8B9A4B',
  cream: '#F9F7F3',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
}

function dietitianName(d: DamagedKit): string {
  const u = d.dieticianId
  if (!u) return '—'
  return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—'
}

function kitBarcode(d: DamagedKit): string {
  return d.kitId?.barcode ?? String(d.kitId?.id ?? '—')
}

export function ReturnRequestsPage() {
  const queryClient = useQueryClient()
  const { kits, auditLogs, adminApproveReturn, adminRejectReturn, assignKitsToDietitian, markDamagedCompensationAssigned } = useWorkflowStore()
  const [query, setQuery] = useState('')
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [compensationForDamaged, setCompensationForDamaged] = useState<DamagedKit | null>(null)
  const [compensationSelectedBarcode, setCompensationSelectedBarcode] = useState('')

  const { data: damagedList = [], isLoading: damagedLoading } = useQuery({
    queryKey: DAMAGED_KITS_QUERY_KEY,
    queryFn: getDamagedKits,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDamagedKit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DAMAGED_KITS_QUERY_KEY })
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({
      damagedId,
      barcode,
      dietitianId,
      dietitianNameVal,
      damagedBarcode,
    }: {
      damagedId: string
      barcode: string
      dietitianId: string
      dietitianNameVal: string
      damagedBarcode: string
    }) => assignReplacementForDamaged(damagedId, barcode),
    onSuccess: (_, { barcode, dietitianId, dietitianNameVal, damagedBarcode }) => {
      queryClient.invalidateQueries({ queryKey: DAMAGED_KITS_QUERY_KEY })
      if (dietitianId && dietitianNameVal) {
        assignKitsToDietitian(dietitianId, dietitianNameVal, [barcode], 'Admin')
        if (damagedBarcode) markDamagedCompensationAssigned(damagedBarcode, 'Admin')
      }
      toast.success('Telafi kiti atandi')
      setCompensationForDamaged(null)
      setCompensationSelectedBarcode('')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Telafi atamasi yapilamadi.')
    },
  })

  const returnRequests = useMemo(() => {
    const pending = damagedList.filter((d) => !d.approved)
    if (!query.trim()) return pending
    const q = query.toLowerCase()
    return pending.filter(
      (d) =>
        kitBarcode(d).toLowerCase().includes(q) ||
        dietitianName(d).toLowerCase().includes(q) ||
        (d.reason ?? '').toLowerCase().includes(q)
    )
  }, [damagedList, query])

  const damagedAwaitingCompensation = useMemo(
    () =>
      damagedList.filter(
        (d) => Boolean(d.approved) && !d.assignedKitId && d.dieticianId?.id != null
      ),
    [damagedList]
  )

  const inStockBarcodes = useMemo(
    () => kits.filter((k) => k.status === KitStatus.IN_STOCK).map((k) => k.barcode),
    [kits]
  )

  /** İade geçmişi: API'den approved === true olanlar (onaylananlar) */
  const returnHistoryFromApi = useMemo(
    () => damagedList.filter((d) => Boolean(d.approved)),
    [damagedList]
  )

  const filteredHistory = useMemo(() => {
    if (!query.trim()) return returnHistoryFromApi
    const q = query.toLowerCase()
    return returnHistoryFromApi.filter(
      (d) =>
        kitBarcode(d).toLowerCase().includes(q) ||
        dietitianName(d).toLowerCase().includes(q) ||
        (d.reason ?? '').toLowerCase().includes(q)
    )
  }, [returnHistoryFromApi, query])

  const handleApprove = (d: DamagedKit) => {
    const id = d.id != null ? String(d.id) : ''
    if (!id) return
    const barcode = kitBarcode(d)
    if (barcode) adminApproveReturn(barcode, 'Admin')
    approveMutation.mutate(id, {
      onSuccess: () => {
        toast.success('Iade onaylandi, kit hasarli olarak isaretlendi.')
      },
    })
  }

  const handleAssignCompensation = () => {
    if (!compensationForDamaged) return
    const id = compensationForDamaged.id != null ? String(compensationForDamaged.id) : ''
    if (!id || !compensationSelectedBarcode || !inStockBarcodes.includes(compensationSelectedBarcode)) {
      toast.error('Stoktan bir barkod secin')
      return
    }
    const dietitianId = compensationForDamaged.dieticianId?.id != null ? String(compensationForDamaged.dieticianId.id) : ''
    const dietitianNameVal = dietitianName(compensationForDamaged)
    const damagedBarcode = kitBarcode(compensationForDamaged)
    assignMutation.mutate({
      damagedId: id,
      barcode: compensationSelectedBarcode,
      dietitianId,
      dietitianNameVal,
      damagedBarcode,
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Iade Talepleri</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-surface-200 p-0.5 bg-surface-50">
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-white text-surface-900 shadow-sm'
                      : 'text-surface-600 hover:text-surface-900'
                  }`}
                >
                  Bekleyen ({returnRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-white text-surface-900 shadow-sm'
                      : 'text-surface-600 hover:text-surface-900'
                  }`}
                >
                  <History className="h-4 w-4" />
                  Iade Gecmisi ({returnHistoryFromApi.length})
                </button>
                {damagedAwaitingCompensation.length > 0 && (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    Telafi atanacak: {damagedAwaitingCompensation.length}
                  </span>
                )}
              </div>
              <Input
                placeholder={
                  activeTab === 'pending'
                    ? 'Barkod, diyetisyen veya neden ile ara...'
                    : 'Barkod, kullanici veya detay ile ara...'
                }
                leftIcon={<Search className="h-4 w-4" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeTab === 'pending' && (
            <div className="p-5 space-y-3">
              {damagedAwaitingCompensation.length > 0 && (
                <div className="mb-4 rounded-xl p-4 border border-amber-200 bg-amber-50/50">
                  <p className="text-sm font-semibold text-amber-800 mb-2">Telafi kiti atanacak (hasar onaylandi)</p>
                  <div className="space-y-2">
                    {damagedAwaitingCompensation.map((d) => (
                      <div key={d.id ?? kitBarcode(d)} className="flex items-center justify-between gap-3 py-2 border-b border-amber-100 last:border-0">
                        <span className="font-mono text-sm">{kitBarcode(d)}</span>
                        <span className="text-sm text-surface-600">{dietitianName(d)}</span>
                        <Button variant="outline" size="sm" onClick={() => { setCompensationForDamaged(d); setCompensationSelectedBarcode('') }}>
                          <Package className="h-3.5 w-3.5" />
                          Telafi kiti ata
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {damagedLoading && (
                <div className="rounded-xl p-4" style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}>
                  <p className="text-sm" style={{ color: W.textLight }}>Yukleniyor...</p>
                </div>
              )}

              {!damagedLoading && returnRequests.length === 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}
                >
                  <p className="text-sm font-medium" style={{ color: W.text }}>
                    Bekleyen iade talebi bulunmuyor.
                  </p>
                </div>
              )}

              {returnRequests.map((d) => (
                <div
                  key={d.id ?? kitBarcode(d)}
                  className="rounded-xl p-4 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}
                >
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold" style={{ color: W.dark }}>
                      {kitBarcode(d)} - {dietitianName(d)}
                    </p>
                    <p className="text-sm" style={{ color: W.text }}>
                      <span className="font-medium">Neden:</span>{' '}
                      {d.reason || '-'}
                    </p>
                    <p className="text-xs" style={{ color: W.textLight }}>
                      Talep Tarihi:{' '}
                      {d.createdAt ? formatDateTime(d.createdAt) : '-'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const barcode = kitBarcode(d)
                        const result = adminRejectReturn(barcode, 'Admin')
                        if (result.ok) toast.success(result.message)
                        else toast.error(result.message)
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      Reddet
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={approveMutation.isPending}
                      onClick={() => handleApprove(d)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Iadeyi Kabul Et
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-5 space-y-3">
              {damagedLoading && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}
                >
                  <p className="text-sm" style={{ color: W.textLight }}>Yukleniyor...</p>
                </div>
              )}

              {!damagedLoading && filteredHistory.length === 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}
                >
                  <p className="text-sm font-medium" style={{ color: W.text }}>
                    Iade gecmisi kaydi bulunmuyor. Onaylanan talepler burada listelenir.
                  </p>
                </div>
              )}

              {!damagedLoading && filteredHistory.map((d) => (
                <div
                  key={d.id ?? kitBarcode(d)}
                  className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: W.dark }}>
                        {kitBarcode(d)} · {dietitianName(d)}
                        <span className="ml-2 font-normal text-surface-500">Onaylandi</span>
                      </p>
                      <p className="text-sm mt-0.5" style={{ color: W.text }}>
                        <span className="font-medium">Neden:</span> {d.reason || '-'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: W.textLight }}>
                        Talep: {d.createdAt ? formatDateTime(d.createdAt) : '-'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="success" dot>Onaylandi</Badge>
                        {d.assignedKitId && (
                          <Badge variant="primary" dot>
                            Telafi atandi: {typeof d.assignedKitId === 'object' && d.assignedKitId?.barcode
                              ? d.assignedKitId.barcode
                              : '—'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telafi kiti ata modal */}
      <Modal open={!!compensationForDamaged} onOpenChange={(open) => !open && (setCompensationForDamaged(null), setCompensationSelectedBarcode(''))}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Telafi kiti ata</ModalTitle>
            <ModalDescription>
              Hasarlı kit: <code className="font-mono">{compensationForDamaged ? kitBarcode(compensationForDamaged) : ''}</code>. Stoktan bir barkod secip bu diyetisyene atayin.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            <Select value={compensationSelectedBarcode || '_empty'} onValueChange={(v) => setCompensationSelectedBarcode(v === '_empty' ? '' : v)}>
              <SelectTrigger label="Stoktaki barkod" className="w-full">
                <SelectValue placeholder="Secin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_empty">Secin...</SelectItem>
                {inStockBarcodes.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {inStockBarcodes.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">Stokta barkod yok. Once uretimden barkod uretin.</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setCompensationForDamaged(null); setCompensationSelectedBarcode('') }}>Iptal</Button>
            <Button
              variant="primary"
              onClick={handleAssignCompensation}
              disabled={!compensationSelectedBarcode || assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Ataniyor...' : 'Telafi kiti ata'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Fotoğraf büyütme modalı */}
      <Modal open={!!photoModalUrl} onOpenChange={(open) => !open && setPhotoModalUrl(null)}>
        <ModalContent className="max-w-4xl">
          <ModalHeader>
            <ModalTitle>Iade kanit gorseli</ModalTitle>
          </ModalHeader>
          <ModalBody className="p-0">
            {photoModalUrl && (
              <img
                src={photoModalUrl}
                alt="Iade kanit gorseli buyuk"
                className="w-full h-auto max-h-[80vh] object-contain rounded-b-xl"
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
