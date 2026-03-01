import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { ReportViewModal } from '@/components/shared/report-view-modal'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { FileText, Eye, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'
import { KitStatus } from '@/utils/constants'

export function DanisanRaporlarPage() {
  const user = useCurrentUser()
  const { kits } = useWorkflowStore()
  const [viewReport, setViewReport] = useState<{ id: string; title: string; barcode: string; date: string } | null>(null)

  const myReports = useMemo(() => {
    return kits
      .filter(
        (k) =>
          k.assignedClientId === user?.id &&
          k.status === KitStatus.COMPLETED &&
          k.reportStatus === 'APPROVED'
      )
      .map((k) => ({
        id: `RPT-${k.barcode.split('-').pop()}`,
        title: 'Omega-3 Index Raporu',
        barcode: k.barcode,
        date: k.createdAt,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [kits, user?.id])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card className="border-surface-200">
        <CardHeader className="border-b border-surface-100">
          <CardTitle>Raporlarim</CardTitle>
          <CardDescription>
            Analiz tamamlandiktan sonra onaylanan raporlariniz burada listelenir.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {myReports.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-600">Henuz rapor yok</p>
              <p className="text-xs text-surface-500 mt-1">Analiz tamamlandiginda raporunuz burada gorunecek</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myReports.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-surface-200 bg-white p-4 transition-colors hover:border-primary-200 hover:bg-surface-50/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                      <FileText className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium text-surface-800">{r.title}</p>
                      <p className="text-sm text-surface-500">{formatDate(r.date)} · <code className="font-mono text-xs">{r.barcode}</code></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="primary" size="sm" onClick={() => setViewReport(r)}>
                      <Eye className="h-4 w-4" />
                      Görüntüle
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success('Rapor indiriliyor...')}
                      title="PDF indir"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ReportViewModal
        open={!!viewReport}
        onOpenChange={(open) => !open && setViewReport(null)}
        title={viewReport ? `${viewReport.title} — ${viewReport.barcode}` : ''}
        barcode={viewReport?.barcode}
      />
    </div>
  )
}
