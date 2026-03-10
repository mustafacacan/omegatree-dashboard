import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { PageLoader } from '@/components/shared/page-loader'
import { ReportViewModal } from '@/components/shared/report-view-modal'
import { PdfViewer } from '@/components/shared/pdf-viewer'
import {
  Card, CardContent, Button, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Spinner,
} from '@/components/ui'
import { PenTool, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { raporDuzenleyiciPath } from '@/utils/routes'
import { TablePagination } from '@/components/shared/table-pagination'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-error'
import { getExpertById, getExperts, updateExpert } from '@/services/experts.service'

type AssignmentRow = {
  expertId: number
  barcode: string
  assignedAt?: string
  status: 'pending' | 'in_progress' | 'completed'
}

function statusBadgeVariant(status: AssignmentRow['status']): 'warning' | 'info' | 'success' {
  if (status === 'pending') return 'warning'
  if (status === 'in_progress') return 'info'
  return 'success'
}

function statusLabel(status: AssignmentRow['status']) {
  if (status === 'pending') return 'Bekliyor'
  if (status === 'in_progress') return 'Hazirlaniyor'
  return 'Tamamlandi'
}

function normalizeStatus(v: unknown): AssignmentRow['status'] {
  if (v === 'pending' || v === 'in_progress' || v === 'completed') return v
  return 'pending'
}

function isProbablyPdf(url?: string | null) {
  if (!url) return false
  return url.toLowerCase().includes('.pdf')
}

function isProbablyImage(url?: string | null) {
  if (!url) return false
  const u = url.toLowerCase()
  return u.includes('.png') || u.includes('.jpg') || u.includes('.jpeg') || u.includes('.webp') || u.includes('.gif')
}

export function AssignmentsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const expertsQuery = useQuery({
    queryKey: ['experts', 'assignments', 'pending', page, pageSize],
    queryFn: () => getExperts({ page, limit: pageSize, status: 'pending' }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  useEffect(() => {
    if (expertsQuery.isError) {
      toast.error(getApiErrorMessage(expertsQuery.error, { fallback: 'Atamalar yuklenemedi' }))
    }
  }, [expertsQuery.isError, expertsQuery.error])

  const assignments = useMemo(() => {
    const list = expertsQuery.data?.experts ?? []
    return list
      .filter((e) => !!e.kitBarcode && e.status !== 'cancelled')
      .map((e): AssignmentRow | null => {
        if (!e.kitBarcode) return null
        if (e.status !== 'pending' && e.status !== 'in_progress' && e.status !== 'completed') return null
        return {
          expertId: e.id,
          barcode: e.kitBarcode,
          assignedAt: e.assignedAt,
          status: e.status,
        }
      })
      .filter((x): x is AssignmentRow => x != null)
      .sort((a, b) => {
        const at = new Date(a.assignedAt ?? 0).getTime()
        const bt = new Date(b.assignedAt ?? 0).getTime()
        return bt - at
      })
  }, [expertsQuery.data?.experts])

  const pendingCount = expertsQuery.data?.totalItems ?? assignments.filter((a) => a.status === 'pending').length
  const progressCount = 0
  const completedCount = 0

  const pendingList = useMemo(() => assignments.filter((a) => a.status === 'pending'), [assignments])
  const progressList = useMemo(() => assignments.filter((a) => a.status === 'in_progress'), [assignments])
  const completedList = useMemo(() => assignments.filter((a) => a.status === 'completed'), [assignments])

  const [viewBarcode, setViewBarcode] = useState<string | null>(null)

  const [dataExpertId, setDataExpertId] = useState<number | null>(null)
  const [dataBarcode, setDataBarcode] = useState<string | null>(null)
  const [approvingExpertId, setApprovingExpertId] = useState<number | null>(null)
  const expertDetailQuery = useQuery({
    queryKey: ['expert', dataExpertId],
    queryFn: () => {
      if (dataExpertId == null) throw new Error('Expert id is required')
      return getExpertById(dataExpertId)
    },
    enabled: dataExpertId != null,
    retry: 1,
  })

  useEffect(() => {
    if (expertDetailQuery.isError) {
      toast.error(getApiErrorMessage(expertDetailQuery.error, { fallback: 'Detay yuklenemedi' }))
    }
  }, [expertDetailQuery.isError, expertDetailQuery.error])

  const approveMutation = useMutation({
    mutationFn: (id: number) => updateExpert(id, { status: 'in_progress' }),
    onMutate: (id) => {
      setApprovingExpertId(id)
    },
    onSuccess: async (_res, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['experts', 'assignments', 'pending'] }),
        queryClient.invalidateQueries({ queryKey: ['expert', id] }),
      ])
      toast.success('Analiz onaylandi')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Onay islemi basarisiz' }))
    },
    onSettled: () => {
      setApprovingExpertId(null)
    },
  })

  if (expertsQuery.isLoading) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Atanan Analizler"
        description="Size atanan analizler: bekleyenlerden baslayin, raporu yazin ve onaya gonderin. Devam eden veya tamamlananlari da buradan takip edebilirsiniz."
      />

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pending">
            Bekleyen ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="progress">
            Devam Eden ({progressCount})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Tamamlanan ({completedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <AssignmentList
            rows={pendingList}
            totalItems={pendingCount}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
            statusLabel="Bekliyor"
            statusBadge={<Badge variant="warning" dot>Bekliyor</Badge>}
            renderAction={(a) => (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDataExpertId(a.expertId)
                    setDataBarcode(a.barcode)
                  }}
                >
                  <Eye className="h-4 w-4" /> Verileri Gor
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={approveMutation.isPending && approvingExpertId === a.expertId}
                  onClick={() => approveMutation.mutate(a.expertId)}
                >
                  {(approveMutation.isPending && approvingExpertId === a.expertId) ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" className="text-white" /> Onaylaniyor...
                    </span>
                  ) : (
                    'Onayla'
                  )}
                </Button>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <AssignmentList
            rows={progressList}
            totalItems={progressList.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
            statusLabel="Hazirlaniyor"
            statusBadge={<Badge variant="info" dot pulse>Hazirlaniyor</Badge>}
            renderAction={(a) => (
              <Button variant="default" size="sm" onClick={() => navigate(raporDuzenleyiciPath(a.barcode))}>
                <PenTool className="h-4 w-4" /> Devam Et
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <AssignmentList
            rows={completedList}
            totalItems={completedList.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
            statusLabel="Tamamlandi"
            statusBadge={<Badge variant="success" dot>Tamamlandi</Badge>}
            renderAction={(a) => (
              <Button variant="outline" size="sm" onClick={() => setViewBarcode(a.barcode)}>
                <Eye className="h-4 w-4" /> Raporu Gor
              </Button>
            )}
          />
        </TabsContent>
      </Tabs>

      <ReportViewModal
        open={!!viewBarcode}
        onOpenChange={(open) => !open && setViewBarcode(null)}
        title={viewBarcode ?? ''}
        barcode={viewBarcode ?? undefined}
      />

      <Modal
        open={dataExpertId != null}
        onOpenChange={(open) => {
          if (!open) {
            setDataExpertId(null)
            setDataBarcode(null)
          }
        }}
      >
        <ModalContent className={expertDetailQuery.data?.resultMediaUrl ? 'max-w-4xl w-full' : 'max-w-lg'}>
          <ModalHeader>
            <ModalTitle>Analiz Verileri</ModalTitle>
            <ModalDescription>{dataBarcode ? `Barkod: ${dataBarcode}` : ''}</ModalDescription>
          </ModalHeader>
          <ModalBody>
            {expertDetailQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-surface-500">
                <Spinner size="sm" /> Yukleniyor...
              </div>
            ) : expertDetailQuery.data ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-surface-200 bg-panel p-3">
                    <p className="text-xs text-surface-500">Durum</p>
                    <div className="mt-2">
                      <Badge variant={statusBadgeVariant(normalizeStatus(expertDetailQuery.data.status))} dot>
                        {statusLabel(normalizeStatus(expertDetailQuery.data.status))}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-xl border border-surface-200 bg-panel p-3">
                    <p className="text-xs text-surface-500">Atanma Tarihi</p>
                    <p className="mt-2 text-sm font-medium text-surface-800">
                      {formatDate(expertDetailQuery.data.assignedAt)}
                    </p>
                  </div>
                </div>

                {expertDetailQuery.data.resultMediaUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-medium text-surface-700">Sonuc Dosyasi</p>
                      <Button
                        variant="link"
                        onClick={() => window.open(expertDetailQuery.data!.resultMediaUrl!, '_blank', 'noopener,noreferrer')}
                      >
                        Rapor Goster
                      </Button>
                    </div>

                    {isProbablyPdf(expertDetailQuery.data.resultMediaUrl) ? (
                      <PdfViewer file={expertDetailQuery.data.resultMediaUrl} maxHeight="55vh" className="flex-1" />
                    ) : isProbablyImage(expertDetailQuery.data.resultMediaUrl) ? (
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                        <img
                          src={expertDetailQuery.data.resultMediaUrl}
                          alt="Sonuc Dosyasi"
                          className="w-full max-h-[55vh] object-contain rounded-lg"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                        <p className="text-sm text-surface-600">Dosya onizlemesi sadece PDF ve resimler icin destekleniyor.</p>
                        <p className="text-xs text-surface-500 mt-1 break-all">
                          {expertDetailQuery.data.resultMediaUrl}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                    <p className="text-sm text-surface-600">Sonuc dosyasi bulunamadi.</p>
                    <p className="text-xs text-surface-500 mt-1">Bu kayit icin medya yuklenmemis olabilir.</p>
                  </div>
                )}

                <div className="rounded-xl border border-surface-200 bg-panel p-3">
                  <p className="text-xs text-surface-500">Laboratuvar Durumu</p>
                  <p className="mt-2 text-sm font-medium text-surface-800">
                    {expertDetailQuery.data.laboratoryKitStatus ?? '—'}
                  </p>
                </div>

                {expertDetailQuery.data.reason ? (
                  <div className="rounded-xl border border-surface-200 bg-panel p-3">
                    <p className="text-xs text-surface-500">Aciklama</p>
                    <p className="mt-2 text-sm text-surface-700">{expertDetailQuery.data.reason}</p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm text-surface-500">Detay bulunamadi.</div>
            )}
          </ModalBody>
          <ModalFooter>
            {dataExpertId != null && normalizeStatus(expertDetailQuery.data?.status) === 'pending' ? (
              <Button
                variant="default"
                disabled={approveMutation.isPending}
                onClick={() => approveMutation.mutate(dataExpertId)}
              >
                {approveMutation.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" className="text-white" /> Onaylaniyor...
                  </span>
                ) : (
                  'Onayla'
                )}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                setDataExpertId(null)
                setDataBarcode(null)
              }}
            >
              Kapat
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

function AssignmentList({
  rows,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  statusBadge,
  renderAction,
}: {
  rows: AssignmentRow[]
  totalItems: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  statusLabel: string
  statusBadge: ReactNode
  renderAction: (row: AssignmentRow) => ReactNode
}) {
  const paginated = useMemo(() => rows, [rows])

  return (
    <Card>
      <CardContent className="p-0">
        {/* Masaustu: tablo */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barkod</TableHead>
                <TableHead>Atanma Tarihi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-surface-500">
                    Bu sekmede kayit yok.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row) => (
                  <TableRow key={row.barcode}>
                    <TableCell>
                      <code className="font-mono font-semibold">{row.barcode}</code>
                    </TableCell>
                    <TableCell className="text-surface-500">{formatDate(row.assignedAt)}</TableCell>
                    <TableCell>{statusBadge}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {renderAction(row)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={totalItems}
            page={page}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>

        {/* Mobil: kart listesi — tablo yok, acilip kapanan yapi yok */}
        <div className="md:hidden">
          {paginated.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-surface-500">
              Bu sekmede kayit yok.
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {paginated.map((row) => (
                <div key={row.barcode} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <code className="font-mono text-sm font-semibold text-surface-800 block">
                        {row.barcode}
                      </code>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {formatDate(row.assignedAt)}
                      </p>
                      <div className="mt-2">{statusBadge}</div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {renderAction(row)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <TablePagination
            totalItems={totalItems}
            page={page}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
