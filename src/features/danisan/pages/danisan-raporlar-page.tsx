import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { ReportViewModal } from '@/components/shared/report-view-modal'
import { Card, CardContent, Button } from '@/components/ui'
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

      {myReports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-surface-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-surface-600">Henuz rapor yok</p>
            <p className="text-xs text-surface-400 mt-1">Analiz tamamlandiginda raporunuz burada gorunecek</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {myReports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center">
                    <FileText className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-surface-800">{r.title}</p>
                    <p className="text-sm text-surface-500">{formatDate(r.date)} — {r.barcode}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setViewReport(r)}
                  >
                    <Eye className="h-4 w-4" />
                    Sistem icinde goruntule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.success('Rapor indiriliyor...')}
                    title="PDF indir (istege bagli)"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ReportViewModal
        open={!!viewReport}
        onOpenChange={(open) => !open && setViewReport(null)}
        title={viewReport ? `${viewReport.title} — ${viewReport.barcode}` : ''}
        barcode={viewReport?.barcode}
      />
    </div>
  )
}
