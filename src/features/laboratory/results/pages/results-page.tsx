import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/shared/page-header'
import { PdfViewer } from '@/components/shared/pdf-viewer'
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
  Button, Badge,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody,
} from '@/components/ui'
import { Check, Eye } from 'lucide-react'
import { ROUTES } from '@/utils/routes'
import { formatDateTime } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { getLaboratoryKitById, getLaboratoryKitsPage, type LaboratoryKit } from '@/services/laboratory-kits.service'

function getKitBarcode(kit: LaboratoryKit) {
  return kit.kitId?.kitBarcode ?? `#${kit.id}`
}

function isProbablyPdf(url?: string | null) {
  if (!url) return false
  return url.toLowerCase().includes('.pdf')
}

export function ResultsPage() {
  const navigate = useNavigate()
  const [detailId, setDetailId] = useState<number | null>(null)
  const [page, setPage] = useState(1)

  const kitsQuery = useQuery({
    queryKey: ['laboratory-kits', 'completed', page],
    queryFn: () => getLaboratoryKitsPage({ page, status: 'completed' }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const completedKits = useMemo(() => {
    const items = kitsQuery.data?.items ?? []
    return items
      .filter((k) => k.status === 'completed')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
  }, [kitsQuery.data?.items])

  const detailQuery = useQuery({
    queryKey: ['laboratory-kits', 'detail', detailId],
    queryFn: () => getLaboratoryKitById(detailId as number),
    enabled: detailId != null,
    retry: 1,
  })

  const detailKit = detailQuery.data ?? null
  const detailTitleBarcode = useMemo(() => {
    if (detailKit) return getKitBarcode(detailKit)
    if (detailId == null) return '—'
    const fromList = completedKits.find((k) => k.id === detailId)
    return fromList ? getKitBarcode(fromList) : `#${detailId}`
  }, [completedKits, detailId, detailKit])

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Laboratuvar', href: ROUTES.LABORATUVAR },
          { label: 'Sonuclar', href: ROUTES.LABORATUVAR_SONUCLAR },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR)}>Dashboard</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_HAVUZ)}>Numune Havuzu</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_ANALIZ)}>Analizler</Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Analiz Tamamlanan / Sonuclar</CardTitle>
          <CardDescription>Analizi tamamlanmis numuneler ve uzman havuzuna gecmis kayitlar</CardDescription>
        </CardHeader>
        <CardContent>
          {kitsQuery.isLoading ? (
            <div className="py-12 text-center text-surface-500">
              <Check className="h-12 w-12 mx-auto mb-3 text-surface-300" />
              <p>Yukleniyor...</p>
            </div>
          ) : kitsQuery.isError ? (
            <div className="py-12 text-center text-surface-500">
              <Check className="h-12 w-12 mx-auto mb-3 text-surface-300" />
              <p>Liste yuklenemedi.</p>
              <p className="text-sm mt-1">Lutfen daha sonra tekrar deneyin.</p>
            </div>
          ) : completedKits.length === 0 ? (
            <div className="py-12 text-center text-surface-500">
              <Check className="h-12 w-12 mx-auto mb-3 text-surface-300" />
              <p>Henuz tamamlanmis analiz sonucu yok.</p>
              <p className="text-sm mt-1">Analizler sayfasindan numune tamamlandiginda burada listelenir.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedKits.map((kit) => (
                <div
                  key={kit.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:border-primary-200 hover:bg-surface-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setDetailId(kit.id)}
                        className="font-mono font-semibold text-primary-600 hover:underline text-left block"
                      >
                        {getKitBarcode(kit)}
                      </button>
                      <p className="text-xs text-surface-500">
                        {formatDateTime(kit.updatedAt || kit.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setDetailId(kit.id)}>
                      <Eye className="h-4 w-4" /> Detay
                    </Button>
                    <Badge variant="success" dot>
                      Tamamlandi
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!kitsQuery.isLoading && !kitsQuery.isError && kitsQuery.data && kitsQuery.data.totalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between border-t border-surface-200 pt-4">
              <div className="text-sm text-surface-600">
                {kitsQuery.data.currentPage} / {kitsQuery.data.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={kitsQuery.data.currentPage <= 1}
                >
                  Geri
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(kitsQuery.data!.totalPages, p + 1))}
                  disabled={kitsQuery.data.currentPage >= kitsQuery.data.totalPages}
                >
                  Ileri
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Detay modal */}
      <Modal open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
        <ModalContent className={detailKit?.resultMediaId?.url ? 'max-w-4xl w-full' : 'max-w-md'}>
          <ModalHeader>
            <ModalTitle>Sonuc Detayi</ModalTitle>
            <ModalDescription>{detailTitleBarcode}</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {detailQuery.isLoading ? (
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
                Yukleniyor...
              </div>
            ) : detailQuery.isError ? (
              <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                <p className="text-sm font-medium text-surface-700">Detay yuklenemedi</p>
                <p className="text-xs text-surface-500 mt-1">{getApiErrorMessage(detailQuery.error, { fallback: 'Lutfen daha sonra tekrar deneyin.' })}</p>
              </div>
            ) : detailKit ? (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-surface-500 text-xs">Barkod</p>
                    <p className="font-mono font-semibold">{getKitBarcode(detailKit)}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Durum</p>
                    <p>Tamamlandi</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Olusturma</p>
                    <p>{formatDateTime(detailKit.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Guncelleme</p>
                    <p>{formatDateTime(detailKit.updatedAt)}</p>
                  </div>
                  {/* Kor analiz: Lab sadece barkod gorur; diyetisyen/danisan adi gosterilmez */}
                </div>

                {detailKit.resultMediaId?.url ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm font-medium text-surface-700">Sonuc Dosyasi</p>
                      <Button
                        variant="link"
                        onClick={() => window.open(detailKit.resultMediaId!.url!, '_blank', 'noopener,noreferrer')}
                      >
                        Rapor Goster
                      </Button>
                    </div>
                    {isProbablyPdf(detailKit.resultMediaId.url) ? (
                      <PdfViewer file={detailKit.resultMediaId.url} maxHeight="55vh" className="flex-1" />
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
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
