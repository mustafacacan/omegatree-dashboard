import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { PdfViewer } from '@/components/shared/pdf-viewer'
import { TablePagination } from '@/components/shared/table-pagination'
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  Button,
  Badge,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
} from '@/components/ui'
import { FileText, Eye, Loader2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { getResultById, getResultsPage, type Result } from '@/services/results.service'

function isProbablyPdf(url?: string | null) {
  if (!url) return false
  return /\.pdf($|\?|#)/i.test(url)
}

function getResultMediaUrl(result: Result): string | null {
  return result.mediaResult?.url ?? result.resultMedia ?? null
}

function getResultStatusLabel(status?: string): string {
  if (status === 'pending') return 'Bekliyor'
  if (status === 'completed') return 'Sonuclandi'
  if (status === 'approved') return 'Onaylandi'
  if (status === 'rejected') return 'Reddedildi'
  return status || '—'
}

export function ReportsPage() {
  const [detailId, setDetailId] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const resultsQuery = useQuery({
    queryKey: ['results', 'dietitian', page, pageSize],
    queryFn: () => getResultsPage({ page, limit: pageSize }),
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

  const detailQuery = useQuery({
    queryKey: ['results', 'dietitian', 'detail', detailId],
    queryFn: () => getResultById(detailId as number),
    enabled: detailId != null,
    retry: 1,
  })

  const detailResult = detailQuery.data ?? null
  const detailMediaUrl = useMemo(() => {
    if (!detailResult) return null
    const url = getResultMediaUrl(detailResult)
    return typeof url === 'string' && url.trim() ? url : null
  }, [detailResult])

  const totalItems = resultsQuery.data?.totalItems ?? 0

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader />

      <Card className="border-surface-200 dark:border-surface-700">
        <CardHeader className="border-b border-surface-100 dark:border-surface-700">
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">Sonuclar</h2>
            <p className="text-sm text-surface-500 mt-0.5">
              Sonuclanan raporlari buradan goruntuleyebilirsiniz.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {resultsQuery.isLoading ? (
            <div className="py-14 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary-500" />
              <p className="text-sm text-surface-500">Sonuclar yukleniyor...</p>
            </div>
          ) : resultsQuery.isError ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-200/80">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-600 dark:text-surface-400">Sonuclar yuklenemedi</p>
              <p className="text-xs text-surface-500 mt-1">{getApiErrorMessage(resultsQuery.error, { fallback: 'Lutfen tekrar deneyin' })}</p>
              <div className="mt-4 flex justify-center">
                <Button variant="outline" size="sm" onClick={() => resultsQuery.refetch()}>
                  Yenile
                </Button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-200/80">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-600 dark:text-surface-400">Henuz sonuc yok</p>
              <p className="text-xs text-surface-500 mt-1">Sonuclanan raporlar burada listelenecek.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((r) => (
                <div
                  key={String(r.id ?? `${r.dieticianClientId ?? '0'}-${r.createdAt ?? ''}`)}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-100 p-4 transition-colors hover:border-primary-200 dark:hover:border-primary-800 hover:bg-surface-50/50 dark:hover:bg-surface-200/40"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-surface-200 bg-surface-50">
                      <FileText className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-surface-900 dark:text-surface-100">
                        <span className="font-mono text-sm">#{r.id ?? '-'}</span>
                        <Badge className="ml-2" variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : r.status === 'completed' ? 'info' : 'warning'} dot>
                          {getResultStatusLabel(r.status)}
                        </Badge>
                      </p>
                      <p className="mt-1 text-xs text-surface-500 truncate">
                        {r.updatedAt || r.createdAt ? formatDateTime(r.updatedAt || r.createdAt!) : '—'} · Eslesme: {r.dieticianClientId ?? '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDetailId(r.id ?? null)}
                      disabled={r.id == null}
                    >
                      <Eye className="h-4 w-4" /> Goruntule
                    </Button>
                  </div>
                </div>
              ))}

              <TablePagination
                totalItems={totalItems}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                  setPageSize(s)
                  setPage(1)
                }}
                className="rounded-xl"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Modal open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
        <ModalContent className={detailMediaUrl ? 'max-w-4xl w-full' : 'max-w-md'}>
          <ModalHeader>
            <ModalTitle>Sonuc Detayi</ModalTitle>
            <ModalDescription>{detailId != null ? `#${detailId}` : '—'}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {detailQuery.isLoading ? (
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-4 text-sm text-surface-600 dark:text-surface-400">
                Yukleniyor...
              </div>
            ) : detailQuery.isError ? (
              <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-4">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">Detay yuklenemedi</p>
                <p className="text-xs text-surface-500 mt-1">{getApiErrorMessage(detailQuery.error, { fallback: 'Lutfen daha sonra tekrar deneyin.' })}</p>
              </div>
            ) : detailResult ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-surface-500 text-xs">Durum</p>
                    <p>{getResultStatusLabel(detailResult.status)}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Eslesme</p>
                    <p className="font-mono font-semibold">{detailResult.dieticianClientId ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Olusturma</p>
                    <p>{detailResult.createdAt ? formatDateTime(detailResult.createdAt) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Guncelleme</p>
                    <p>{detailResult.updatedAt ? formatDateTime(detailResult.updatedAt) : '—'}</p>
                  </div>
                </div>

                {(detailResult.overall_evaluation || detailResult.nutrition_suggestions || detailResult.reinforcement_suggestions) ? (
                  <div className="space-y-3 rounded-xl border border-surface-200 bg-surface-50 p-4">
                    {detailResult.overall_evaluation ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Genel Degerlendirme</p>
                        <p className="text-sm text-surface-800 dark:text-surface-200 whitespace-pre-wrap">{detailResult.overall_evaluation}</p>
                      </div>
                    ) : null}
                    {detailResult.nutrition_suggestions ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Beslenme Onerileri</p>
                        <p className="text-sm text-surface-800 dark:text-surface-200 whitespace-pre-wrap">{detailResult.nutrition_suggestions}</p>
                      </div>
                    ) : null}
                    {detailResult.reinforcement_suggestions ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-surface-500 mb-1">Takviye Onerileri</p>
                        <p className="text-sm text-surface-800 whitespace-pre-wrap">{detailResult.reinforcement_suggestions}</p>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {detailMediaUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-medium text-surface-700">Sonuc Dosyasi</p>
                      <Button variant="link" onClick={() => window.open(detailMediaUrl, '_blank', 'noopener,noreferrer')}>
                        Linkten Ac
                      </Button>
                    </div>
                    {isProbablyPdf(detailMediaUrl) ? (
                      <PdfViewer file={detailMediaUrl} maxHeight="55vh" className="flex-1" />
                    ) : (
                      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-4">
                        <p className="text-sm text-surface-600 dark:text-surface-400">Dosya onizlemesi sadece PDF icin destekleniyor.</p>
                        <p className="text-xs text-surface-500 mt-1">Linkten acarak goruntuleyebilirsiniz.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-4">
                    <p className="text-sm text-surface-600 dark:text-surface-400">Sonuc dosyasi bulunamadi.</p>
                    <p className="text-xs text-surface-500 mt-1">Bu kayit icin medya yuklenmemis olabilir.</p>
                  </div>
                )}
              </>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
