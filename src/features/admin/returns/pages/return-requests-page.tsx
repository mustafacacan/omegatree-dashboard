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
import { Search, RotateCcw, CheckCircle, XCircle, History, Package, Eye } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { toast } from 'sonner'
import {
  getDamagedKits,
  getDamagedKitDetails,
  approveDamagedKit,
  assignReplacementKitToDamaged,
  type DamagedKit,
} from '@/services/damaged-kits.service'
import { PdfViewer } from '@/components/shared/pdf-viewer'
import { getStocks, type Stock } from '@/services/stocks.service'

const DAMAGED_KITS_QUERY_KEY = ['damaged-kits'] as const
const STOCKS_AVAILABLE_QUERY_KEY = ['stocks', 'available'] as const


function dietitianName(d: DamagedKit): string {
  const raw = d as unknown
  if (!raw || typeof raw !== 'object') return '—'
  const r = raw as Record<string, unknown>

  const dietician = (r.dietician ?? r.dietitian) as unknown
  if (dietician && typeof dietician === 'object') {
    const u = (dietician as Record<string, unknown>).user as unknown
    if (u && typeof u === 'object') {
      const user = u as { firstName?: unknown; lastName?: unknown }
      const firstName = typeof user.firstName === 'string' ? user.firstName : ''
      const lastName = typeof user.lastName === 'string' ? user.lastName : ''
      const full = [firstName, lastName].filter(Boolean).join(' ').trim()
      if (full) return full
    }
  }

  const dieticianIdObj = (r.dieticianId ?? r.dietitianId) as unknown
  if (dieticianIdObj && typeof dieticianIdObj === 'object') {
    const u = (dieticianIdObj as Record<string, unknown>).user as unknown
    if (u && typeof u === 'object') {
      const user = u as { firstName?: unknown; lastName?: unknown }
      const firstName = typeof user.firstName === 'string' ? user.firstName : ''
      const lastName = typeof user.lastName === 'string' ? user.lastName : ''
      const full = [firstName, lastName].filter(Boolean).join(' ').trim()
      if (full) return full
    }
  }

  const userLike = (r.dieticianId ?? r.dietitianId ?? r.dietician ?? r.dietitian) as unknown
  if (userLike && typeof userLike === 'object') {
    const u = userLike as { firstName?: unknown; lastName?: unknown }
    const firstName = typeof u.firstName === 'string' ? u.firstName : ''
    const lastName = typeof u.lastName === 'string' ? u.lastName : ''
    const full = [firstName, lastName].filter(Boolean).join(' ').trim()
    if (full) return full
  }

  return '—'
}

function kitBarcode(d: DamagedKit): string {
  const raw = d as unknown as Record<string, unknown>
  const kitObj = (raw.kitId ?? raw.kit) as unknown
  if (kitObj && typeof kitObj === 'object') {
    const k = kitObj as { barcode?: unknown; id?: unknown }
    if (typeof k.barcode === 'string' && k.barcode.trim() !== '') return k.barcode
    if (k.id != null) return String(k.id)
    return '—'
  }
  if (kitObj != null) return String(kitObj)
  return '—'
}

function kitIdValue(d: unknown): string | null {
  const raw = d as unknown as Record<string, unknown>
  const kitObj = (raw.kitId ?? raw.kit) as unknown
  if (kitObj && typeof kitObj === 'object') {
    const k = kitObj as { id?: unknown }
    if (k.id != null) return String(k.id)
    return null
  }
  if (typeof kitObj === 'string' && kitObj.trim() !== '') return kitObj
  if (typeof kitObj === 'number' && Number.isFinite(kitObj)) return String(kitObj)
  return null
}

function requestIdValue(d: unknown): string | null {
  if (!d || typeof d !== 'object') return null
  const r = d as Record<string, unknown>
  const id = r.id
  if (typeof id === 'string' && id.trim() !== '') return id
  if (typeof id === 'number' && Number.isFinite(id)) return String(id)
  return null
}

function dieticianIdValue(d: unknown): string | null {
  if (!d || typeof d !== 'object') return null
  const r = d as Record<string, unknown>
  const v = (r.dieticianId ?? r.dietitianId) as unknown
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'string' && v.trim() !== '') return v
  if (v && typeof v === 'object') {
    const id = (v as Record<string, unknown>).id
    if (typeof id === 'number' && Number.isFinite(id)) return String(id)
    if (typeof id === 'string' && id.trim() !== '') return id
  }
  const dietician = (r.dietician ?? r.dietitian) as unknown
  if (dietician && typeof dietician === 'object') {
    const id = (dietician as Record<string, unknown>).id
    if (typeof id === 'number' && Number.isFinite(id)) return String(id)
    if (typeof id === 'string' && id.trim() !== '') return id
  }
  return null
}

function assignedKitIdValue(d: unknown): string | null {
  if (!d || typeof d !== 'object') return null
  const r = d as Record<string, unknown>
  const v = r.assignedKitId
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  if (typeof v === 'string' && v.trim() !== '') return v
  if (typeof v === 'object') {
    const id = (v as Record<string, unknown>).id
    if (typeof id === 'number' && Number.isFinite(id)) return String(id)
    if (typeof id === 'string' && id.trim() !== '') return id
    const barcode = (v as Record<string, unknown>).barcode
    if (typeof barcode === 'string' && barcode.trim() !== '') return barcode
  }
  return null
}

function dietitianPhone(d: unknown): string {
  if (!d || typeof d !== 'object') return '—'
  const r = d as Record<string, unknown>
  const dietician = (r.dietician ?? r.dietitian) as unknown
  const u1 =
    dietician && typeof dietician === 'object'
      ? (dietician as Record<string, unknown>).user
      : undefined
  const dieticianIdObj = (r.dieticianId ?? r.dietitianId) as unknown
  const u2 =
    dieticianIdObj && typeof dieticianIdObj === 'object'
      ? (dieticianIdObj as Record<string, unknown>).user
      : undefined
  const u = (u1 ?? u2) as unknown
  if (!u || typeof u !== 'object') return '—'
  const phone = (u as Record<string, unknown>).phone
  return typeof phone === 'string' && phone.trim() !== '' ? phone : '—'
}

function dietitianEmail(d: unknown): string {
  if (!d || typeof d !== 'object') return '—'
  const r = d as Record<string, unknown>
  const dietician = (r.dietician ?? r.dietitian) as unknown
  const u1 =
    dietician && typeof dietician === 'object'
      ? (dietician as Record<string, unknown>).user
      : undefined
  const dieticianIdObj = (r.dieticianId ?? r.dietitianId) as unknown
  const u2 =
    dieticianIdObj && typeof dieticianIdObj === 'object'
      ? (dieticianIdObj as Record<string, unknown>).user
      : undefined
  const u = (u1 ?? u2) as unknown
  if (!u || typeof u !== 'object') return '—'
  const email = (u as Record<string, unknown>).email
  return typeof email === 'string' && email.trim() !== '' ? email : '—'
}

function damagedStatusLabel(d: unknown): string {
  if (!d || typeof d !== 'object') return '—'
  const r = d as Record<string, unknown>
  const status = r.status
  if (typeof status === 'string' && status.trim() !== '') return status
  const approved = r.approved
  if (typeof approved === 'boolean') return approved ? 'Onaylandı' : 'Bekliyor'
  return '—'
}

function damagedStatusValue(d: DamagedKit): string {
  const raw = d as unknown as { status?: unknown; approved?: unknown }
  if (typeof raw.status === 'string' && raw.status.trim() !== '') return raw.status
  // Backward-compatible fallback
  return raw.approved ? 'approved' : 'pending'
}

function isDamagedPending(d: DamagedKit): boolean {
  const raw = d as unknown as { approved?: unknown }
  const status = damagedStatusValue(d)
  if (typeof raw.approved === 'boolean') return raw.approved === false
  return status.toLowerCase().includes('pending')
}

function isDamagedHistory(d: DamagedKit): boolean {
  const raw = d as unknown as { approved?: unknown }
  const status = damagedStatusValue(d)
  if (typeof raw.approved === 'boolean') return raw.approved === true
  return !status.toLowerCase().includes('pending')
}

export function ReturnRequestsPage() {
  const queryClient = useQueryClient()
  const { adminApproveReturn, adminRejectReturn, assignKitsToDietitian, markDamagedCompensationAssigned } = useWorkflowStore()
  const [query, setQuery] = useState('')
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [compensationForDamaged, setCompensationForDamaged] = useState<DamagedKit | null>(null)
  const [compensationSelectedKitId, setCompensationSelectedKitId] = useState('')

  const [selectedReturnRequest, setSelectedReturnRequest] = useState<DamagedKit | null>(null)

  const selectedReturnRequestId = selectedReturnRequest?.id != null ? String(selectedReturnRequest.id) : null

  const {
    data: selectedReturnRequestDetails,
    isLoading: selectedReturnRequestDetailsLoading,
    isError: selectedReturnRequestDetailsError,
  } = useQuery({
    queryKey: ['damaged-kits', 'details', selectedReturnRequestId],
    queryFn: async () => {
      if (!selectedReturnRequestId) return null
      return getDamagedKitDetails(selectedReturnRequestId)
    },
    enabled: selectedReturnRequestId !== null,
  })

  const modalRequest = useMemo((): Record<string, unknown> | null => {
    if (!selectedReturnRequest) return null
    const details = selectedReturnRequestDetails as unknown
    if (details && typeof details === 'object') return details as Record<string, unknown>
    return selectedReturnRequest as unknown as Record<string, unknown>
  }, [selectedReturnRequest, selectedReturnRequestDetails])

  const { data: damagedList = [], isLoading: damagedLoading } = useQuery<DamagedKit[]>({
    queryKey: DAMAGED_KITS_QUERY_KEY,
    queryFn: () => getDamagedKits(),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveDamagedKit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DAMAGED_KITS_QUERY_KEY })
    },
  })

  const assignMutation = useMutation({
    mutationFn: (vars: {
      damagedId: string
      assignedKitId: number
      barcode: string
      dietitianId: string
      dietitianNameVal: string
      damagedBarcode: string
    }) => assignReplacementKitToDamaged(vars.damagedId, vars.assignedKitId),
    onSuccess: (_, { barcode, dietitianId, dietitianNameVal, damagedBarcode }) => {
      queryClient.invalidateQueries({ queryKey: DAMAGED_KITS_QUERY_KEY })
      if (dietitianId && dietitianNameVal) {
        assignKitsToDietitian(dietitianId, dietitianNameVal, [barcode], 'Admin')
        if (damagedBarcode) markDamagedCompensationAssigned(damagedBarcode, 'Admin')
      }
      toast.success('Telafi kiti atandi')
      setCompensationForDamaged(null)
      setCompensationSelectedKitId('')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Telafi atamasi yapilamadi.' }))
    },
  })

  const { data: stocksResult } = useQuery({
    queryKey: [...STOCKS_AVAILABLE_QUERY_KEY, compensationForDamaged ? String(compensationForDamaged.id ?? '') : ''],
    queryFn: () => getStocks({ limit: 200 }),
    enabled: compensationForDamaged !== null,
  })

  const availableReplacementKits = useMemo(() => {
    const list = (stocksResult?.data ?? []) as Stock[]
    const items = list
      .filter((s) => s.status === 'available' && s.kitId?.id != null && s.kitId?.barcode)
      .map((s) => ({ id: String(s.kitId!.id), barcode: s.kitId!.barcode }))
    items.sort((a, b) => a.barcode.localeCompare(b.barcode, 'tr'))
    return items
  }, [stocksResult?.data])

  const requestMediaUrl = useMemo((): string | null => {
    if (!modalRequest) return null
    const d = modalRequest as Record<string, unknown>
    const url =
      (d.damageImage && typeof d.damageImage === 'object' && d.damageImage !== null
        ? (d.damageImage as Record<string, unknown>).url
        : undefined) ??
      (d.mediaId && typeof d.mediaId === 'object' && d.mediaId !== null
        ? (d.mediaId as Record<string, unknown>).url
        : undefined) ??
      (d.media && typeof d.media === 'object' && d.media !== null
        ? (d.media as Record<string, unknown>).url
        : undefined) ??
      (d.imageData && typeof d.imageData === 'object' && d.imageData !== null
        ? (d.imageData as Record<string, unknown>).url
        : undefined)

    return typeof url === 'string' && url.trim().length > 0 ? url : null
  }, [modalRequest])

  const requestMediaIsPdf = useMemo(() => {
    if (!requestMediaUrl) return false
    return /\.pdf($|\?|#)/i.test(requestMediaUrl)
  }, [requestMediaUrl])

  const returnRequests = useMemo(() => {
    const pending = damagedList.filter((d) => isDamagedPending(d))
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
        (d) => isDamagedHistory(d) && assignedKitIdValue(d) == null && dieticianIdValue(d) != null
      ),
    [damagedList]
  )

  /** İade geçmişi: API'den approved === true olanlar (onaylananlar) */
  const returnHistoryFromApi = useMemo(
    () => damagedList.filter((d) => isDamagedHistory(d)),
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
    const selected = availableReplacementKits.find((k) => k.id === compensationSelectedKitId) ?? null
    if (!id || !selected) {
      toast.error('Stoktan bir kit secin')
      return
    }
    const dietitianId = dieticianIdValue(compensationForDamaged)
    if (!dietitianId) {
      toast.error('Diyetisyen bilgisi bulunamadi')
      return
    }
    const dietitianNameVal = dietitianName(compensationForDamaged)
    const damagedBarcode = kitBarcode(compensationForDamaged)
    assignMutation.mutate({
      damagedId: id,
      assignedKitId: Number(selected.id),
      barcode: selected.barcode,
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
                        <Button variant="outline" size="sm" onClick={() => { setCompensationForDamaged(d); setCompensationSelectedKitId('') }}>
                          <Package className="h-3.5 w-3.5" />
                          Telafi kiti ata
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {damagedLoading && (
                <div className="rounded-xl p-4 bg-panel border border-surface-200">
                  <p className="text-sm text-surface-500">Yukleniyor...</p>
                </div>
              )}

              {!damagedLoading && returnRequests.length === 0 && (
                <div
                  className="rounded-xl p-4"
                  className="rounded-xl p-4 bg-panel border border-surface-200"
                >
                  <p className="text-sm font-medium text-surface-700">
                    Bekleyen iade talebi bulunmuyor.
                  </p>
                </div>
              )}

              {returnRequests.map((d) => (
                <div
                  key={d.id ?? kitBarcode(d)}
                  className="rounded-xl p-4 bg-panel border border-surface-200 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedReturnRequest(d)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedReturnRequest(d)
                    }
                  }}
                >
                  <div className="space-y-1.5">
                    <p className="text-sm font-semibold text-surface-900">
                      {kitBarcode(d)} - {dietitianName(d)}
                    </p>
                    <p className="text-xs text-surface-500">
                      Durum: <span className="font-semibold text-surface-700">{damagedStatusValue(d)}</span>
                    </p>
                    <p className="text-sm text-surface-700">
                      <span className="font-medium">Neden:</span>{' '}
                      {d.reason || '-'}
                    </p>
                    <p className="text-xs text-surface-500">
                      Talep Tarihi:{' '}
                      {d.createdAt ? formatDateTime(d.createdAt) : '-'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedReturnRequest(d)
                      }}
                      disabled={d.id == null}
                      title={d.id == null ? 'Detay için id bulunamadı' : 'Detayı görüntüle'}
                    >
                      <Eye className="h-4 w-4" />
                      Gör
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
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
                      onClick={(e) => {
                        e.stopPropagation()
                        setCompensationForDamaged(d)
                        setCompensationSelectedKitId('')
                        handleApprove(d)
                      }}
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
                  className="rounded-xl p-4 bg-panel border border-surface-200"
                >
                  <p className="text-sm text-surface-500">Yukleniyor...</p>
                </div>
              )}

              {!damagedLoading && filteredHistory.length === 0 && (
                <div
                  className="rounded-xl p-4"
                  className="rounded-xl p-4 bg-panel border border-surface-200"
                >
                  <p className="text-sm font-medium text-surface-700">
                    Iade gecmisi kaydi bulunmuyor. Onaylanan talepler burada listelenir.
                  </p>
                </div>
              )}

              {!damagedLoading && filteredHistory.map((d) => (
                <div
                  key={d.id ?? kitBarcode(d)}
                  className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                  className="rounded-xl p-4 bg-panel border border-surface-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-surface-900">
                        {kitBarcode(d)} · {dietitianName(d)}
                        <span className="ml-2 font-normal text-surface-500">{damagedStatusValue(d)}</span>
                      </p>
                      <p className="text-sm mt-0.5 text-surface-700">
                        <span className="font-medium">Neden:</span> {d.reason || '-'}
                      </p>
                      <p className="text-xs mt-1 text-surface-500">
                        Talep: {d.createdAt ? formatDateTime(d.createdAt) : '-'}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="success" dot>{damagedStatusValue(d)}</Badge>
                        {d.assignedKitId && (
                          <Badge variant="primary" dot>
                            Telafi atandi: {assignedKitIdValue(d) ?? '—'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReturnRequest(d)
                      }}
                      disabled={d.id == null}
                      title={d.id == null ? 'Detay için id bulunamadı' : 'Detayı görüntüle'}
                    >
                      <Eye className="h-4 w-4" />
                      Gör
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telafi kiti ata modal */}
      <Modal open={!!compensationForDamaged} onOpenChange={(open) => !open && (setCompensationForDamaged(null), setCompensationSelectedKitId(''))}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Kit ata</ModalTitle>
            <ModalDescription>
              Hasarlı kit: <code className="font-mono">{compensationForDamaged ? kitBarcode(compensationForDamaged) : ''}</code>. Stoktan bir barkod secip bu diyetisyene atayin.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            <Select value={compensationSelectedKitId || '_empty'} onValueChange={(v) => setCompensationSelectedKitId(v === '_empty' ? '' : v)}>
              <SelectTrigger label="Stoktaki kit" className="w-full">
                <SelectValue placeholder="Secin..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_empty">Secin...</SelectItem>
                {availableReplacementKits.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.barcode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableReplacementKits.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">Stokta uygun kit bulunamadi.</p>
            )}

            {compensationForDamaged && (
              <div className="mt-3 rounded-xl p-3 border border-surface-200 bg-surface-50/50">
                <p className="text-xs text-surface-500">Diyetisyen</p>
                <p className="text-sm font-semibold text-surface-800">{dietitianName(compensationForDamaged)}</p>
                <p className="text-xs text-surface-500 mt-2">Talep</p>
                <p className="text-sm text-surface-700">{compensationForDamaged.reason ?? '—'}</p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setCompensationForDamaged(null); setCompensationSelectedKitId('') }}>Iptal</Button>
            <Button
              variant="primary"
              onClick={handleAssignCompensation}
              disabled={!compensationSelectedKitId || assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Ataniyor...' : 'Kiti ata'}
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

      {/* İade talebi detayı modalı */}
      <Modal
        open={!!selectedReturnRequest}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedReturnRequest(null)
          }
        }}
      >
        <ModalContent className="max-w-3xl">
          <ModalHeader>
            <ModalTitle>Iade talebi detayı</ModalTitle>
            <ModalDescription>
              {modalRequest
                ? `Talep #${requestIdValue(modalRequest) ?? '—'} · Kit ${kitIdValue(modalRequest) ?? kitBarcode(modalRequest as unknown as DamagedKit)} · ${dietitianName(modalRequest as unknown as DamagedKit)}`
                : ''}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {modalRequest && (
              <>
                {(selectedReturnRequestDetailsLoading || selectedReturnRequestDetailsError) && (
                  <div
                    className="rounded-xl p-4"
                    className="rounded-xl p-4 bg-panel border border-surface-200"
                  >
                    {selectedReturnRequestDetailsLoading ? (
                      <p className="text-sm text-surface-500">Detay yukleniyor...</p>
                    ) : (
                      <p className="text-sm text-surface-500">Detay alinamadi. Liste verisi gosteriliyor.</p>
                    )}
                  </div>
                )}

                <div className="rounded-xl p-4 bg-panel border border-surface-200">
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-surface-500">
                    Talep bilgileri
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-surface-500">Talep No</p>
                      <p className="font-semibold text-surface-900">#{requestIdValue(modalRequest) ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500">Durum</p>
                      <p className="font-semibold text-surface-700">{damagedStatusLabel(modalRequest)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500">Kit</p>
                      <p className="font-semibold text-surface-900">ID: {kitIdValue(modalRequest) ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500">Talep tarihi</p>
                      <p className="font-semibold text-surface-700">
                        {typeof modalRequest.createdAt === 'string' && modalRequest.createdAt
                          ? formatDateTime(modalRequest.createdAt)
                          : '—'}
                      </p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-surface-500">Neden</p>
                      <p className="font-semibold text-surface-700">
                        {typeof modalRequest.reason === 'string' && modalRequest.reason.trim() !== ''
                          ? modalRequest.reason
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-4 bg-panel border border-surface-200">
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 text-surface-500">
                    Diyetisyen bilgileri
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-surface-500">Ad Soyad</p>
                      <p className="font-semibold text-surface-900">{dietitianName(modalRequest as unknown as DamagedKit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-surface-500">Telefon</p>
                      <p className="font-semibold text-surface-700">{dietitianPhone(modalRequest)}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-surface-500">E-posta</p>
                      <p className="font-semibold text-surface-700">{dietitianEmail(modalRequest)}</p>
                    </div>
                  </div>
                </div>

                {/* Kanıt medya (backend döndürüyorsa) */}
                <div className="rounded-xl p-4 bg-panel border border-surface-200">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-500">
                      Kanıt
                    </h4>
                    {requestMediaUrl && (
                      <Button variant="outline" size="sm" onClick={() => setPhotoModalUrl(requestMediaUrl)}>
                        Goruntule
                      </Button>
                    )}
                  </div>
                  {!requestMediaUrl ? (
                    <p className="text-sm text-surface-500">Kanıt dosyası bulunmuyor.</p>
                  ) : requestMediaIsPdf ? (
                    <PdfViewer file={requestMediaUrl} maxHeight="40vh" />
                  ) : (
                    <img
                      src={requestMediaUrl}
                      alt="Iade kanit"
                      className="w-full h-auto max-h-[40vh] object-contain rounded-lg"
                    />
                  )}
                </div>
              </>
            )}
          </ModalBody>
          <ModalFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedReturnRequest(null)}>
              Kapat
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
