import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
  Button, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { ROUTES } from '@/utils/routes'
import { Upload, Clock, CheckCircle, Eye } from 'lucide-react'
import { TablePagination } from '@/components/shared/table-pagination'
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

function statusBadgeVariant(status?: LabKitStatus): 'warning' | 'info' | 'success' | 'danger' | 'default' {
  if (status === 'pending') return 'warning'
  if (status === 'in_progress') return 'info'
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  return 'default'
}

export function AnalysisPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [actionKitId, setActionKitId] = useState<number | null>(null)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeKitId, setCompleteKitId] = useState<number | null>(null)
  const [completeFile, setCompleteFile] = useState<File | null>(null)

  const kitsQuery = useQuery({
    queryKey: ['laboratory-kits', page],
    queryFn: () => getLaboratoryKitsPage({ page }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const pageData = kitsQuery.data
  const allKits = useMemo(() => pageData?.items ?? [], [pageData?.items])

  const analyses = useMemo(
    () =>
      allKits
        .filter((k) => k.status === 'in_progress')
        .map((k) => ({
          ...k,
          progress: 50,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [allKits]
  )

  const paginatedAnalyses = useMemo(
    () => analyses.slice(0, pageSize),
    [analyses, pageSize]
  )

  const selectedKit = useMemo(
    () => (detailId != null ? allKits.find((k) => k.id === detailId) ?? null : null),
    [allKits, detailId]
  )
  const completeKit = useMemo(
    () => (completeKitId != null ? allKits.find((k) => k.id === completeKitId) ?? null : null),
    [allKits, completeKitId]
  )

  const completeMutation = useMutation({
    mutationFn: ({ id, file }: { id: number; file: File }) => updateLaboratoryKit(id, { status: 'completed', file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laboratory-kits'] })
      toast.success('Uzmana gonderildi')
      setActionKitId(null)
      setCompleteOpen(false)
      setCompleteKitId(null)
      setCompleteFile(null)
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Gonderim basarisiz' }))
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
          { label: 'Analizler', href: ROUTES.LABORATUVAR_ANALIZ },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR)}>Dashboard</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_HAVUZ)}>Numune Havuzu</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_SONUCLAR)}>Sonuclar</Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Analiz Tablosu</CardTitle>
          <CardDescription>Numune kabul, analiz ilerlemesi ve tamamlama. Sonuclari Excel ile yukleyebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barkod</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Baslangic</TableHead>
                <TableHead>Ilerleme</TableHead>
                <TableHead className="w-40">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAnalyses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-surface-500">
                    Islemde analiz kaydi bulunamadi.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAnalyses.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setDetailId(item.id)}
                        className="font-mono font-semibold text-primary-600 hover:underline text-left"
                      >
                        {getKitBarcode(item)}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(item.status)} dot>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-surface-500">{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden min-w-[80px]">
                          <div
                            className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-surface-500 w-8">{item.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setDetailId(item.id)} title="Detay" disabled={completeMutation.isPending}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {item.status === 'in_progress' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openCompleteModal(item.id)}
                            disabled={completeMutation.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Uzmana Gonder
                          </Button>
                        )}
                        {item.status === 'in_progress' && item.progress < 100 && (
                          <span className="text-xs text-surface-400 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={pageData?.totalItems ?? 0}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={[10]}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>

      {/* Detay modal */}
      <Modal open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Analiz Detayi</ModalTitle>
            <ModalDescription>{selectedKit ? getKitBarcode(selectedKit) : ''}</ModalDescription>
          </ModalHeader>
          <ModalBody>
            {selectedKit && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-surface-500 text-xs">Barkod</p>
                  <p className="font-mono font-semibold">{getKitBarcode(selectedKit)}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Durum</p>
                  <p>{getStatusLabel(selectedKit.status)}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Laboratuvar</p>
                  <p>#{selectedKit.laboratoryId ?? '-'}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Ilerleme</p>
                  <p>%50</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Gelis / Baslangic</p>
                  <p>{formatDateTime(selectedKit.createdAt)}</p>
                </div>
                {/* Kör analiz: Lab sadece barkod görür; danışan/diyetisyen adı gösterilmez */}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Uzmana gonder modal */}
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
            <ModalDescription>Barkod: {completeKit ? getKitBarcode(completeKit) : '-'}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-surface-700 mb-2">Sonuc Dosyasi</label>
              <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                <Upload className="h-4 w-4" />
                <span>Dosya sec</span>
                <input type="file" className="hidden" onChange={(e) => setCompleteFile(e.target.files?.[0] ?? null)} />
              </label>
              {completeFile ? (
                <p className="text-xs text-surface-500 mt-1">Secilen: {completeFile.name}</p>
              ) : (
                <p className="text-xs text-surface-500 mt-1">Gondermek icin dosya yukleyin.</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)} disabled={completeMutation.isPending}>
              Iptal
            </Button>
            <Button variant="default" onClick={handleCompleteSubmit} disabled={completeMutation.isPending || !completeFile}>
              {actionKitId === completeKitId && completeMutation.isPending ? 'Yukleniyor...' : 'Gonder'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
