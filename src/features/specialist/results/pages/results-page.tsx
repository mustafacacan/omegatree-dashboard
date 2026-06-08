import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { PdfViewer } from '@/components/shared/pdf-viewer'
import { TablePagination } from '@/components/shared/table-pagination'
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Badge, Input, Textarea,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Spinner,
} from '@/components/ui'
import { CheckCircle, Clock, Eye, Upload } from 'lucide-react'
import { ROUTES } from '@/utils/routes'
import { formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { getResultsPage, updateResult, type Result, type ResultStatus, type UpdateResultInput } from '@/services/results.service'
import { invalidateAdminSidebarCounts } from '@/lib/admin-sidebar-counts'

function isProbablyPdf(url?: string | null) {
  if (!url) return false
  return /\.pdf($|\?|#)/i.test(url)
}

function getResultStatusLabel(status?: string): string {
  if (status === 'pending') return 'Bekliyor'
  if (status === 'completed') return 'Sonuclandi'
  if (status === 'approved') return 'Onaylandi'
  return status || '—'
}

function getResultMediaUrl(result: Result): string | null {
  return result.mediaResult?.url ?? result.resultMedia ?? null
}

export function SpecialistResultsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<ResultStatus>('pending')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [uploadId, setUploadId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [uploadOverallEvaluation, setUploadOverallEvaluation] = useState<string>('')
  const [uploadNutritionSuggestions, setUploadNutritionSuggestions] = useState('')
  const [uploadReinforcementSuggestions, setUploadReinforcementSuggestions] = useState('')
  const [uploadResultMedia, setUploadResultMedia] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  const resetUploadForm = () => {
    setUploadOverallEvaluation('')
    setUploadNutritionSuggestions('')
    setUploadReinforcementSuggestions('')
    setUploadResultMedia('')
    setUploadFile(null)
  }

  const resultsQuery = useQuery({
    queryKey: ['results', 'specialist', activeTab, page, pageSize],
    queryFn: () => getResultsPage({ page, limit: pageSize, status: activeTab }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const items = useMemo(() => {
    const list = resultsQuery.data?.items ?? []
    return [...list].sort((a, b) => {
      const aT = new Date(a.updatedAt || a.createdAt || 0).getTime()
      const bT = new Date(b.updatedAt || b.createdAt || 0).getTime()
      return bT - aT
    })
  }, [resultsQuery.data?.items])

  const detailResult = useMemo(() => {
    if (detailId == null) return null
    return items.find((r) => r.id === detailId) ?? null
  }, [detailId, items])

  const detailTitle = useMemo(() => {
    if (detailResult?.id != null) return `#${detailResult.id}`
    if (detailId == null) return '—'
    return `#${detailId}`
  }, [detailId, detailResult])

  const detailMediaUrl = useMemo(() => {
    if (!detailResult) return null
    const url = getResultMediaUrl(detailResult)
    return typeof url === 'string' && url.trim() ? url : null
  }, [detailResult])

  const totalItems = resultsQuery.data?.totalItems ?? 0

  const uploadMutation = useMutation({
    mutationFn: async (params: { id: number; input: UpdateResultInput }) => updateResult(params.id, params.input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['results'] })
      await invalidateAdminSidebarCounts(queryClient)
      setUploadId(null)
      resetUploadForm()
    },
  })

  const canSubmitUpload = Boolean(uploadId != null && uploadFile && !uploadMutation.isPending)

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Uzman', href: ROUTES.UZMAN },
          { label: 'Sonuclar', href: ROUTES.UZMAN_SONUCLAR },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.UZMAN)}>Dashboard</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.UZMAN_ANALIZLER)}>Analizler</Button>
          </div>
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          setActiveTab(v as ResultStatus)
          setPage(1)
          setDetailId(null)
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Sonuc Bekleyen
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Sonuclanan Raporlar
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sonuc Bekleyen</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {resultsQuery.isLoading ? (
                <div className="py-12 text-center text-surface-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-surface-300" />
                  <p>Yukleniyor...</p>
                </div>
              ) : resultsQuery.isError ? (
                <div className="py-12 text-center text-surface-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-surface-300" />
                  <p>Liste yuklenemedi.</p>
                  <p className="text-sm mt-1">{getApiErrorMessage(resultsQuery.error, { fallback: 'Lutfen daha sonra tekrar deneyin.' })}</p>
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-surface-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-surface-300" />
                  <p>Bekleyen sonuc yok.</p>
                </div>
              ) : (
                <div className="p-5 space-y-3">
                  {items.map((r) => (
                    <div
                      key={r.id ?? `${r.dieticianClientId ?? '0'}-${r.createdAt ?? ''}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:border-primary-200 hover:bg-surface-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                          <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDetailId(r.id ?? null)}
                            className="font-mono font-semibold text-primary-600 hover:underline text-left block truncate"
                            disabled={r.id == null}
                          >
                            #{r.id ?? '—'}
                          </button>
                          <p className="text-xs text-surface-500 truncate">
                            Olusturma: {r.createdAt ? formatDateTime(r.createdAt) : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (r.id == null) return
                            setDetailId(null)
                            setUploadId(r.id)
                          }}
                          disabled={r.id == null}
                        >
                          <Upload className="h-4 w-4" /> Rapor Yükle
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDetailId(r.id ?? null)} disabled={r.id == null}>
                          <Eye className="h-4 w-4" /> Detay
                        </Button>
                        <Badge variant="warning" dot>
                          {getResultStatusLabel(r.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!resultsQuery.isLoading && !resultsQuery.isError ? (
                <TablePagination
                  totalItems={totalItems}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => {
                    setPageSize(s)
                    setPage(1)
                  }}
                />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sonuclanan Raporlar</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {resultsQuery.isLoading ? (
                <div className="py-12 text-center text-surface-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-surface-300" />
                  <p>Yukleniyor...</p>
                </div>
              ) : resultsQuery.isError ? (
                <div className="py-12 text-center text-surface-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-surface-300" />
                  <p>Liste yuklenemedi.</p>
                  <p className="text-sm mt-1">{getApiErrorMessage(resultsQuery.error, { fallback: 'Lutfen daha sonra tekrar deneyin.' })}</p>
                </div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-surface-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-surface-300" />
                  <p>Henuz sonuclanan rapor yok.</p>
                </div>
              ) : (
                <div className="p-5 space-y-3">
                  {items.map((r) => (
                    <div
                      key={r.id ?? `${r.dieticianClientId ?? '0'}-${r.createdAt ?? ''}`}
                      className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:border-primary-200 hover:bg-surface-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDetailId(r.id ?? null)}
                            className="font-mono font-semibold text-primary-600 hover:underline text-left block truncate"
                            disabled={r.id == null}
                          >
                            #{r.id ?? '—'}
                          </button>
                          <p className="text-xs text-surface-500 truncate">
                            Guncelleme: {r.updatedAt ? formatDateTime(r.updatedAt) : (r.createdAt ? formatDateTime(r.createdAt) : '—')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => setDetailId(r.id ?? null)} disabled={r.id == null}>
                          <Eye className="h-4 w-4" /> Detay
                        </Button>
                        <Badge variant="success" dot>
                          {getResultStatusLabel(r.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!resultsQuery.isLoading && !resultsQuery.isError ? (
                <TablePagination
                  totalItems={totalItems}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={(s) => {
                    setPageSize(s)
                    setPage(1)
                  }}
                />
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Modal open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
        <ModalContent className={detailMediaUrl ? 'max-w-4xl w-full' : 'max-w-md'}>
          <ModalHeader>
            <ModalTitle>Sonuc Detayi</ModalTitle>
            <ModalDescription>{detailTitle}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {detailResult ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-surface-500 text-xs">ID</p>
                    <p className="font-mono font-semibold">#{detailResult.id ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Durum</p>
                    <p>{getResultStatusLabel(detailResult.status)}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Olusturma</p>
                    <p>{detailResult.createdAt ? formatDateTime(detailResult.createdAt) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Guncelleme</p>
                    <p>{detailResult.updatedAt ? formatDateTime(detailResult.updatedAt) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">DieticianClientId</p>
                    <p className="font-mono font-semibold">{detailResult.dieticianClientId ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Degerlendirme</p>
                    <p>{detailResult.overall_evaluation ?? '—'}</p>
                  </div>
                </div>

                {getResultMediaUrl(detailResult) ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-medium text-surface-700">Sonuc Dosyasi</p>
                      <Button
                        variant="link"
                        onClick={() => window.open(getResultMediaUrl(detailResult)!, '_blank', 'noopener,noreferrer')}
                      >
                        Rapor Goster
                      </Button>
                    </div>
                    {isProbablyPdf(getResultMediaUrl(detailResult)) ? (
                      <PdfViewer file={getResultMediaUrl(detailResult)!} maxHeight="55vh" className="flex-1" />
                    ) : (
                      <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                        <p className="text-sm text-surface-600">Dosya onizlemesi sadece PDF icin destekleniyor.</p>
                        <p className="text-xs text-surface-500 mt-1">Linkten acarak goruntuleyebilirsiniz.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                    <p className="text-sm text-surface-600">Sonuc dosyasi bulunamadi.</p>
                    <p className="text-xs text-surface-500 mt-1">Bu kayit icin medya yuklenmemis olabilir.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
                Detay yuklenemedi.
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal
        open={uploadId != null}
        onOpenChange={(open) => {
          if (!open) {
            setUploadId(null)
            resetUploadForm()
            uploadMutation.reset()
          }
        }}
      >
        <ModalContent className="max-w-2xl w-full">
          <ModalHeader>
            <ModalTitle>Rapor Yükle</ModalTitle>
            <ModalDescription>{uploadId != null ? `#${uploadId}` : ''}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {uploadMutation.isError ? (
              <div className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                {getApiErrorMessage(uploadMutation.error, { fallback: 'Rapor yuklenemedi.' })}
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={uploadOverallEvaluation}
                onValueChange={(v) => setUploadOverallEvaluation(v)}
                disabled={uploadMutation.isPending}
              >
                <SelectTrigger label="Genel Değerlendirme">
                  <SelectValue placeholder="Seçiniz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Pozitif</SelectItem>
                  <SelectItem value="negative">Negatif</SelectItem>
                  <SelectItem value="inconclusive">Belirsiz</SelectItem>
                </SelectContent>
              </Select>

            
            </div>

            <Textarea
              label="Beslenme Önerileri"
              placeholder="..."
              value={uploadNutritionSuggestions}
              onChange={(e) => setUploadNutritionSuggestions(e.target.value)}
              disabled={uploadMutation.isPending}
            />
            <Textarea
              label="Takviye Önerileri"
              placeholder="..."
              value={uploadReinforcementSuggestions}
              onChange={(e) => setUploadReinforcementSuggestions(e.target.value)}
              disabled={uploadMutation.isPending}
            />

            <Input
              label="Dosya"
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setUploadFile(file)
              }}
              disabled={uploadMutation.isPending}
              hint="PDF veya görsel (multipart/form-data)"
            />
          </ModalBody>
          <ModalFooter className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUploadId(null)
                resetUploadForm()
                uploadMutation.reset()
              }}
              disabled={uploadMutation.isPending}
            >
              Vazgeç
            </Button>
            <Button
              onClick={() => {
                if (uploadId == null || !uploadFile) return

                const input: UpdateResultInput = {
                  status: 'completed',
                  file: uploadFile,
                  ...(uploadOverallEvaluation ? { overall_evaluation: uploadOverallEvaluation as UpdateResultInput['overall_evaluation'] } : undefined),
                  ...(uploadNutritionSuggestions.trim() ? { nutrition_suggestions: uploadNutritionSuggestions } : undefined),
                  ...(uploadReinforcementSuggestions.trim() ? { reinforcement_suggestions: uploadReinforcementSuggestions } : undefined),
                  ...(uploadResultMedia.trim() ? { resultMedia: uploadResultMedia } : undefined),
                }

                uploadMutation.mutate({ id: uploadId, input })
              }}
              disabled={!canSubmitUpload}
            >
              {uploadMutation.isPending ? <Spinner className="h-4 w-4" /> : null}
              Gönder
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
