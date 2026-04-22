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
import { Eye } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { TablePagination } from '@/components/shared/table-pagination'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-error'
import { getExpertById, getExpertTasks, updateExpert } from '@/services/experts.service'
import { getApiOrigin } from '@/lib/env'

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
  return /\.pdf($|\?|#)/i.test(url)
}

function isProbablyImage(url?: string | null) {
  if (!url) return false
  const u = url.toLowerCase()
  return u.includes('.png') || u.includes('.jpg') || u.includes('.jpeg') || u.includes('.webp') || u.includes('.gif')
}

function resolveMediaUrl(raw?: string | null): string | null {
  if (!raw) return null
  const url = String(raw).trim()
  if (!url) return null
  if (/^(data:|blob:|https?:\/\/)/i.test(url)) return url

  const origin = getApiOrigin()

  if (url.startsWith('/')) return `${origin}${url}`
  return `${origin}/${url}`
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-200 bg-panel p-3">
      <p className="text-xs text-surface-500">{label}</p>
      <div className="mt-2 text-sm font-medium text-surface-800 break-words">{value}</div>
    </div>
  )
}

export function AssignmentsPage() {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const expertsQuery = useQuery({
    queryKey: ['experts', 'assignments', 'pending', page, pageSize],
    queryFn: () => getExpertTasks({ page, limit: pageSize, status: 'pending' }),
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
    queryKey: ['expert', dataExpertId, 'detail'],
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
        queryClient.invalidateQueries({ queryKey: ['expert', id, 'detail'] }),
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
            renderAction={() => null}
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
                    <p className="text-sm font-medium text-surface-700">Sonuc Dosyasi</p>

                    {isProbablyPdf(expertDetailQuery.data.resultMediaUrl) ? (
                      <PdfViewer
                        file={resolveMediaUrl(expertDetailQuery.data.resultMediaUrl)}
                        maxHeight="55vh"
                        className="flex-1"
                        mode="iframe"
                      />
                    ) : isProbablyImage(expertDetailQuery.data.resultMediaUrl) ? (
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-3">
                        <img
                          src={resolveMediaUrl(expertDetailQuery.data.resultMediaUrl) ?? undefined}
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

                {(expertDetailQuery.data.anamnezForm || expertDetailQuery.data.foodConsumptionRecord || (expertDetailQuery.data.sleepQualityRecords?.length ?? 0) > 0) ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-medium text-surface-700">Danışan Bilgileri</p>
                    </div>

                    {expertDetailQuery.data.anamnezForm ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Anamnez</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DetailField label="Kronik Hastalık" value={expertDetailQuery.data.anamnezForm.chronic_illness || '—'} />
                          <DetailField label="Kullanılan İlaç" value={expertDetailQuery.data.anamnezForm.medication_used || '—'} />
                          <DetailField label="Gıda Alerjisi" value={expertDetailQuery.data.anamnezForm.food_allergy || '—'} />
                          <DetailField label="Meslek" value={expertDetailQuery.data.anamnezForm.profession || '—'} />
                          <DetailField label="Eğitim" value={expertDetailQuery.data.anamnezForm.education || '—'} />
                          <DetailField
                            label="Boy / Kilo"
                            value={
                              [
                                expertDetailQuery.data.anamnezForm.body_height != null ? `${expertDetailQuery.data.anamnezForm.body_height} cm` : null,
                                expertDetailQuery.data.anamnezForm.body_weight ? `${expertDetailQuery.data.anamnezForm.body_weight} kg` : null,
                              ].filter(Boolean).join(' / ') || '—'
                            }
                          />
                          <DetailField label="Bel Çevresi" value={expertDetailQuery.data.anamnezForm.waist_circumference || '—'} />
                          <DetailField label="Kalça Çevresi" value={expertDetailQuery.data.anamnezForm.hip_circumference || '—'} />
                        </div>
                      </div>
                    ) : null}

                    {expertDetailQuery.data.foodConsumptionRecord ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Beslenme Kaydı</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <DetailField label="Öğün Sayısı (Günlük)" value={expertDetailQuery.data.foodConsumptionRecord.mealsPerDay ?? '—'} />
                          <DetailField label="Günlük Su (L)" value={expertDetailQuery.data.foodConsumptionRecord.dailyWaterLiters || '—'} />
                          <DetailField label="Alkol" value={expertDetailQuery.data.foodConsumptionRecord.alcoholFrequency || '—'} />
                          <DetailField label="Sigara" value={expertDetailQuery.data.foodConsumptionRecord.smokingFrequency || '—'} />
                          <DetailField label="Kaçınılan Gıdalar" value={expertDetailQuery.data.foodConsumptionRecord.avoidedFoods || '—'} />
                          <DetailField label="Rahatsız Eden Gıdalar" value={expertDetailQuery.data.foodConsumptionRecord.discomfortFoods || '—'} />
                          <DetailField label="Fast Food (Günlük)" value={expertDetailQuery.data.foodConsumptionRecord.fastFoodMealsPerDay ?? '—'} />
                          <DetailField label="Dışkılama Sıklığı" value={expertDetailQuery.data.foodConsumptionRecord.defecationFrequency || '—'} />
                          <DetailField label="Bağırsak Sorunu" value={expertDetailQuery.data.foodConsumptionRecord.bowelIssue || '—'} />
                          <DetailField label="Gastrointestinal" value={expertDetailQuery.data.foodConsumptionRecord.gastrointestinalDisea || '—'} />
                          <DetailField label="Gece Yeme Alışkanlığı" value={expertDetailQuery.data.foodConsumptionRecord.nightEatingHabit == null ? '—' : (expertDetailQuery.data.foodConsumptionRecord.nightEatingHabit ? 'Evet' : 'Hayır')} />
                          <DetailField label="Yeme Bozukluğu Davranışı" value={expertDetailQuery.data.foodConsumptionRecord.eatingDisorderBehavio == null ? '—' : (expertDetailQuery.data.foodConsumptionRecord.eatingDisorderBehavio ? 'Evet' : 'Hayır')} />
                        </div>
                        {expertDetailQuery.data.foodConsumptionRecord.notes ? (
                          <div className="rounded-xl border border-surface-200 bg-panel p-3">
                            <p className="text-xs text-surface-500">Not</p>
                            <p className="mt-2 text-sm text-surface-700 whitespace-pre-wrap">{expertDetailQuery.data.foodConsumptionRecord.notes}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {(expertDetailQuery.data.sleepQualityRecords?.length ?? 0) > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-surface-600 uppercase tracking-wider">Uyku Kaydı</p>
                        <div className="space-y-3">
                          {(expertDetailQuery.data.sleepQualityRecords ?? []).map((r, idx) => (
                            <div key={String(r.id ?? idx)} className="rounded-xl border border-surface-200 bg-panel p-3">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <p className="text-sm font-semibold text-surface-800">{r.recordDate || `Kayıt #${idx + 1}`}</p>
                                <p className="text-xs text-surface-500">
                                  {(r.usualBedTime || r.usualWakeTime) ? `${r.usualBedTime || '—'} → ${r.usualWakeTime || '—'}` : ''}
                                </p>
                              </div>
                              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <DetailField label="Uyku Saati" value={r.sleepHours || '—'} />
                                <DetailField label="Uykuya Dalma (dk)" value={r.sleepLatencyMinutes ?? '—'} />
                                <DetailField label="Öznel Kalite" value={r.subjectiveSleepQuality ?? '—'} />
                              </div>
                              {r.notes ? (
                                <div className="mt-3 rounded-xl border border-surface-200 bg-surface-50 p-3">
                                  <p className="text-xs text-surface-500">Not</p>
                                  <p className="mt-1 text-sm text-surface-700 whitespace-pre-wrap">{r.notes}</p>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

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
