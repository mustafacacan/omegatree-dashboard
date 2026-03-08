import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent, Button, Badge, Input,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Tabs, TabsList, TabsTrigger,
  Textarea,
} from '@/components/ui'
import { TestTubes, Search, Eye, Calendar, Check, X, Upload } from 'lucide-react'
import { ROUTES } from '@/utils/routes'
import { formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { toast } from 'sonner'
import { getLaboratoryKitsPage, updateLaboratoryKit, type LabKitStatus, type LaboratoryKit } from '@/services/laboratory-kits.service'

function getKitBarcode(kit: LaboratoryKit) {
  return kit.kitId?.kitBarcode ?? `#${kit.id}`
}

function getStatusLabel(status?: LabKitStatus) {
  if (status === 'pending') return 'Bekliyor'
  if (status === 'completed') return 'Tamamlandi'
  if (status === 'cancelled') return 'Iptal'
  if (status === 'in_progress') return 'Islemde'
  return 'Bilinmiyor'
}

function getStatusBadgeVariant(status?: LabKitStatus): 'warning' | 'info' | 'success' | 'danger' | 'default' {
  if (status === 'pending') return 'warning'
  if (status === 'in_progress') return 'info'
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  return 'default'
}

export function SamplePoolPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [actionKitId, setActionKitId] = useState<number | null>(null)
  const [activeStatus, setActiveStatus] = useState<Extract<LabKitStatus, 'pending' | 'cancelled'>>('pending')

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectKitId, setRejectKitId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeKitId, setCompleteKitId] = useState<number | null>(null)
  const [completeFile, setCompleteFile] = useState<File | null>(null)

  const kitsQuery = useQuery({
    queryKey: ['laboratory-kits', activeStatus, page],
    queryFn: () => getLaboratoryKitsPage({ page, status: activeStatus }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const pageData = kitsQuery.data
  const allKits = useMemo(() => pageData?.items ?? [], [pageData?.items])

  const visibleKits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return allKits
      .filter((k) => {
        if (!q) return true
        return getKitBarcode(k).toLowerCase().includes(q)
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [allKits, searchQuery])

  const selectedKit = useMemo(() => (detailId != null ? allKits.find((k) => k.id === detailId) ?? null : null), [allKits, detailId])
  const completeKit = useMemo(
    () => (completeKitId != null ? allKits.find((k) => k.id === completeKitId) ?? null : null),
    [allKits, completeKitId]
  )

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, reasonForCancellation }: { id: number; status: 'in_progress' | 'cancelled'; reasonForCancellation?: string }) =>
      updateLaboratoryKit(id, { status, reasonForCancellation }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laboratory-kits'] })
      toast.success(variables.status === 'in_progress' ? 'Numune onaylandi' : 'Numune reddedildi')
      setActionKitId(null)
      setRejectOpen(false)
      setRejectKitId(null)
      setRejectReason('')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Islem basarisiz' }))
      setActionKitId(null)
    },
  })

  const handleApprove = (id: number) => {
    setActionKitId(id)
    updateStatusMutation.mutate({ id, status: 'in_progress' })
  }

  const openRejectModal = (id: number) => {
    setRejectKitId(id)
    setRejectReason('')
    setRejectOpen(true)
  }

  const handleRejectSubmit = () => {
    if (rejectKitId == null) return
    const reason = rejectReason.trim()
    if (!reason) {
      toast.error('Iptal sebebi zorunludur')
      return
    }
    setActionKitId(rejectKitId)
    updateStatusMutation.mutate({ id: rejectKitId, status: 'cancelled', reasonForCancellation: reason })
  }

  const completeMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => updateLaboratoryKit(id, { status: 'completed', file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laboratory-kits'] })
      toast.success('Rapor tamamlandi')
      setActionKitId(null)
      setCompleteOpen(false)
      setCompleteKitId(null)
      setCompleteFile(null)
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Rapor tamamlanamadi' }))
      setActionKitId(null)
    },
  })

  const openCompleteModal = (id: number) => {
    setCompleteKitId(id)
    setCompleteFile(null)
    setCompleteOpen(true)
  }

  const handleCompleteSubmit = () => {
    if (completeKitId == null) return
    if (!completeFile) {
      toast.error('Dosya secmelisiniz')
      return
    }
    setActionKitId(completeKitId)
    completeMutation.mutate({ id: completeKitId, file: completeFile })
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Laboratuvar', href: ROUTES.LABORATUVAR },
          { label: 'Numune Havuzu', href: ROUTES.LABORATUVAR_HAVUZ },
        ]}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Input
          placeholder="Barkod ile ara..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setPage(1)
          }}
          leftIcon={<Search className="h-4 w-4" />}
          className="w-72"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR)}>
            Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_ANALIZ)}>
            Analizler
          </Button>
          <Badge variant="info" dot pulse>
            {visibleKits.length} numune
          </Badge>
        </div>
      </div>

      <Tabs
        value={activeStatus}
        onValueChange={(v) => {
          setActiveStatus(v as typeof activeStatus)
          setPage(1)
        }}
      >
        <TabsList>
          <TabsTrigger value="pending">Bekliyor</TabsTrigger>
          <TabsTrigger value="cancelled">Iptal</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {kitsQuery.isLoading ? (
            <div className="py-12 text-center text-surface-500">
              <TestTubes className="h-12 w-12 mx-auto mb-3 text-surface-300" />
              <p className="font-medium">Yukleniyor...</p>
            </div>
          ) : kitsQuery.isError ? (
            <div className="py-12 text-center text-surface-500">
              <TestTubes className="h-12 w-12 mx-auto mb-3 text-surface-300" />
              <p className="font-medium">Liste yuklenemedi</p>
              <p className="text-sm mt-1">Lutfen daha sonra tekrar deneyin.</p>
            </div>
          ) : visibleKits.length === 0 ? (
            <div className="py-12 text-center text-surface-500">
              <TestTubes className="h-12 w-12 mx-auto mb-3 text-surface-300" />
              <p className="font-medium">Kayit yok</p>
              <p className="text-sm mt-1">
                {searchQuery ? 'Arama kriterine uygun kayit bulunamadi.' : 'Bu sekmede gosterilecek kayit yok.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barkod</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Gelis</TableHead>
                  <TableHead className="text-right">Islemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleKits.map((kit) => (
                  <TableRow key={kit.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TestTubes className="h-4 w-4 text-amber-600" />
                        <code className="font-mono font-semibold text-surface-800">{getKitBarcode(kit)}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(kit.status)} dot>
                        {getStatusLabel(kit.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-surface-600">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDateTime(kit.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDetailId(kit.id)}
                          disabled={updateStatusMutation.isPending || completeMutation.isPending}
                        >
                          <Eye className="h-3.5 w-3.5" /> Detay
                        </Button>
                        {kit.status === 'pending' ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleApprove(kit.id)}
                            disabled={updateStatusMutation.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {actionKitId === kit.id && updateStatusMutation.isPending ? 'Onaylaniyor' : 'Onayla'}
                          </Button>
                        ) : null}

                        {kit.status === 'in_progress' ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openCompleteModal(kit.id)}
                            disabled={updateStatusMutation.isPending || completeMutation.isPending}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Uzmana Gonder
                          </Button>
                        ) : null}

                        {kit.status === 'pending' || kit.status === 'in_progress' ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => openRejectModal(kit.id)}
                            disabled={updateStatusMutation.isPending || completeMutation.isPending}
                          >
                            <X className="h-3.5 w-3.5" />
                            {actionKitId === kit.id && updateStatusMutation.isPending ? 'Reddediliyor' : 'Reddet'}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!kitsQuery.isLoading && !kitsQuery.isError && pageData && pageData.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-surface-200 bg-surface-50/50 p-4">
              <div className="text-sm text-surface-600">
                {pageData.currentPage} / {pageData.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageData.currentPage <= 1}>
                  Geri
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pageData.totalPages, p + 1))}
                  disabled={pageData.currentPage >= pageData.totalPages}
                >
                  Ileri
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detay modal */}
      <Modal open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Numune Detayi</ModalTitle>
            <ModalDescription>
              Barkod: {selectedKit ? getKitBarcode(selectedKit) : '-'} — Kör analiz: sadece barkod bilgisi gosterilir
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {selectedKit && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-surface-500 text-xs">Barkod</p>
                  <p className="font-mono font-semibold">{getKitBarcode(selectedKit)}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Durum</p>
                  <p>{getStatusLabel(selectedKit.status)}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Gelis Tarihi</p>
                  <p>{formatDateTime(selectedKit.createdAt)}</p>
                </div>
                {selectedKit.reasonForCancellation ? (
                  <div className="col-span-2">
                    <p className="text-surface-500 text-xs">Iptal Sebebi</p>
                    <p className="text-surface-700">{selectedKit.reasonForCancellation}</p>
                  </div>
                ) : null}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Rapor tamamlama modal */}
      <Modal
        open={completeOpen}
        onOpenChange={(open) => {
          setCompleteOpen(open)
          if (!open) {
            setCompleteKitId(null)
            setCompleteFile(null)
          }
        }}
      >
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Uzmana Gonder</ModalTitle>
            <ModalDescription>
              Barkod: {completeKit ? getKitBarcode(completeKit) : '-'}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-surface-700 mb-2">Sonuc Dosyasi</label>
              <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                <Upload className="h-4 w-4" />
                <span>Dosya sec</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setCompleteFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {completeFile ? (
                <p className="text-xs text-surface-500 mt-1">Secilen: {completeFile.name}</p>
              ) : (
                <p className="text-xs text-surface-500 mt-1">Rapor tamamlamak icin dosya yukleyin.</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={completeMutation.isPending}>
              Iptal
            </Button>
            <Button
              variant="default"
              onClick={handleCompleteSubmit}
              disabled={completeMutation.isPending || !completeFile}
            >
              {actionKitId === completeKitId && completeMutation.isPending ? 'Yukleniyor...' : 'Tamamla'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Iptal / Reddet modal */}
      <Modal
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open)
          if (!open) {
            setRejectKitId(null)
            setRejectReason('')
          }
        }}
      >
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Iptal Et</ModalTitle>
            <ModalDescription>
              Barkod: {rejectKitId != null ? (allKits.find((k) => k.id === rejectKitId) ? getKitBarcode(allKits.find((k) => k.id === rejectKitId)!) : `#${rejectKitId}`) : '-'}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-3">
            <div>
              <label className="block text-[13px] font-medium text-surface-700 mb-2">Iptal Sebebi *</label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Orn: Numune hasarli / barkod okunmuyor / eksik bilgi"
                rows={4}
              />
              <p className="text-xs text-surface-500 mt-1">Bu alan zorunludur.</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={updateStatusMutation.isPending}>
              Vazgec
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectSubmit}
              disabled={updateStatusMutation.isPending || !rejectReason.trim()}
            >
              {actionKitId === rejectKitId && updateStatusMutation.isPending ? 'Iptal ediliyor...' : 'Iptal Et'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
