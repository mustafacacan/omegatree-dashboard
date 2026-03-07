import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { ReportViewModal } from '@/components/shared/report-view-modal'
import { Card, CardHeader, CardContent, Button, Badge, Input } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { FileText, Eye, Search, PenTool } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWorkflowStore } from '@/stores/workflow.store'
import { raporDuzenleyiciPath } from '@/utils/routes'

type ReportItem = {
  barcode: string
  clientName: string
  date: string
  status: 'onay_bekliyor' | 'tamamlandi'
}

export function SpecialistReportsListPage() {
  const navigate = useNavigate()
  const { kits } = useWorkflowStore()
  const [search, setSearch] = useState('')
  const [viewBarcode, setViewBarcode] = useState<string | null>(null)

  const reports = useMemo(() => {
    return kits
      .filter(
        (k) =>
          k.reportStatus === 'ADMIN_APPROVAL' || k.reportStatus === 'APPROVED'
      )
      .map((k): ReportItem => ({
        barcode: k.barcode,
        clientName: k.assignedClientName ?? '—',
        date: k.createdAt,
        status:
          k.reportStatus === 'ADMIN_APPROVAL' ? 'onay_bekliyor' : 'tamamlandi',
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [kits])

  const filtered = useMemo(() => {
    if (!search.trim()) return reports
    const q = search.toLowerCase()
    return reports.filter(
      (r) =>
        r.clientName.toLowerCase().includes(q) ||
        r.barcode.toLowerCase().includes(q)
    )
  }, [reports, search])

  const pendingCount = reports.filter((r) => r.status === 'onay_bekliyor').length
  const completedCount = reports.filter((r) => r.status === 'tamamlandi').length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Raporlarim"
        description="Yazdiginiz ve onaylanan raporlarin listesi. Onay bekleyen raporlari duzenleyebilir, tamamlananlari goruntuleyebilirsiniz."
      />

      <Card className="border-surface-200">
        <CardHeader className="border-b border-surface-100 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-surface-500">
                Onay bekleyen: <strong className="text-surface-700">{pendingCount}</strong>
                {' · '}
                Tamamlanan: <strong className="text-surface-700">{completedCount}</strong>
              </p>
            </div>
            <Input
              placeholder="Barkod veya danisan ara..."
              leftIcon={<Search className="h-4 w-4" />}
              className="w-full sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-600">
                {search ? 'Arama sonucu bulunamadi' : 'Henuz rapor yok'}
              </p>
              <p className="text-xs text-surface-500 mt-1">
                {search
                  ? 'Farkli bir arama deneyin'
                  : 'Atanan Analizlerden bir rapor yazip gonderdikten sonra burada gorunecek'}
              </p>
            </div>
          ) : (
            <>
              {/* Masaustu: tablo */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 bg-surface-100 dark:bg-surface-200/80">
                      <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-4 py-3">
                        Barkod
                      </th>
                      <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-4 py-3">
                        Danisan
                      </th>
                      <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-4 py-3">
                        Tarih
                      </th>
                      <th className="text-left text-xs font-semibold text-surface-500 uppercase tracking-wider px-4 py-3">
                        Durum
                      </th>
                      <th className="text-right text-xs font-semibold text-surface-500 uppercase tracking-wider px-4 py-3 w-40">
                        Islem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr
                        key={r.barcode}
                        className="border-b border-surface-200 hover:bg-surface-50 dark:hover:bg-surface-200/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <code className="font-mono text-sm font-semibold text-surface-800 dark:text-surface-200">
                            {r.barcode}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-700 dark:text-surface-300">
                          {r.clientName}
                        </td>
                        <td className="px-4 py-3 text-sm text-surface-500">
                          {formatDate(r.date)}
                        </td>
                        <td className="px-4 py-3">
                          {r.status === 'onay_bekliyor' ? (
                            <Badge variant="info" dot pulse>
                              Onay bekliyor
                            </Badge>
                          ) : (
                            <Badge variant="success" dot>
                              Tamamlandi
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.status === 'onay_bekliyor' ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() =>
                                navigate(raporDuzenleyiciPath(r.barcode))
                              }
                            >
                              <PenTool className="h-3.5 w-3.5" />
                              Duzenle
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewBarcode(r.barcode)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Görüntüle
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobil: kart listesi */}
              <div className="md:hidden divide-y divide-surface-100">
                {filtered.map((r) => (
                  <div
                    key={r.barcode}
                    className="flex flex-col gap-3 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <code className="font-mono text-sm font-semibold text-surface-800 block truncate">
                          {r.barcode}
                        </code>
                        <p className="text-sm text-surface-600 mt-0.5 truncate">
                          {r.clientName}
                        </p>
                        <p className="text-xs text-surface-500 mt-0.5">
                          {formatDate(r.date)}
                        </p>
                      </div>
                      {r.status === 'onay_bekliyor' ? (
                        <Badge variant="info" dot pulse>
                          Onay bekliyor
                        </Badge>
                      ) : (
                        <Badge variant="success" dot>
                          Tamamlandi
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {r.status === 'onay_bekliyor' ? (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            navigate(raporDuzenleyiciPath(r.barcode))
                          }
                        >
                          <PenTool className="h-3.5 w-3.5" />
                          Duzenle
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setViewBarcode(r.barcode)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Görüntüle
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ReportViewModal
        open={!!viewBarcode}
        onOpenChange={(open) => !open && setViewBarcode(null)}
        title={viewBarcode ?? ''}
        barcode={viewBarcode ?? undefined}
      />
    </div>
  )
}
