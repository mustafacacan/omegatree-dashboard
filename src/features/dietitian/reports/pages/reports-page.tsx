import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { ReportViewModal } from '@/components/shared/report-view-modal'
import { ReportShareModal } from '@/features/dietitian/clients/components/report-share-modal'
import { Card, CardHeader, CardContent, Button, Badge, Input } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { FileText, Download, Share2, Eye, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'
import { KitStatus } from '@/utils/constants'

type ReportRow = {
  id: string
  client: string
  barcode: string
  date: string
  status: 'ready'
}

export function ReportsPage() {
  const user = useCurrentUser()
  const { kits } = useWorkflowStore()
  const [search, setSearch] = useState('')
  const [viewReport, setViewReport] = useState<ReportRow | null>(null)
  const [shareReport, setShareReport] = useState<ReportRow | null>(null)

  const completedReports = useMemo(() => {
    return kits
      .filter((k) => 
        k.assignedDietitianId === user?.id &&
        k.status === KitStatus.COMPLETED &&
        k.reportStatus === 'APPROVED' &&
        k.assignedClientName
      )
      .map((k) => ({
        id: `RPT-${k.barcode.split('-').pop()}`,
        client: k.assignedClientName || 'Bilinmeyen',
        barcode: k.barcode,
        date: k.createdAt,
        status: 'ready' as const,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [kits, user?.id])

  const filteredReports = useMemo(() => {
    if (!search.trim()) return completedReports
    const q = search.toLowerCase()
    return completedReports.filter(
      (r) =>
        r.client.toLowerCase().includes(q) ||
        r.barcode.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
    )
  }, [completedReports, search])

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader />

      <Card className="border-surface-200">
        <CardHeader className="border-b border-surface-100">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-surface-900">Raporlar</h2>
              <p className="text-sm text-surface-500 mt-0.5">
                Onaylanmis analiz raporlarini goruntuleyin, paylasin veya indirin.
              </p>
            </div>
            <Input
              placeholder="Danisan veya barkod ara..."
              leftIcon={<Search className="h-4 w-4" />}
              className="w-full sm:w-72"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
      {filteredReports.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-600">
                {search ? 'Arama sonucu bulunamadi' : 'Henuz rapor yok'}
              </p>
              <p className="text-xs text-surface-500 mt-1">
                {search ? 'Farkli bir arama deneyin' : 'Tamamlanan analiz raporlari burada gorunecek'}
              </p>
            </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div key={report.barcode} className="group rounded-xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:border-primary-200 hover:shadow-md">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 transition-colors group-hover:bg-primary-100">
                  <FileText className="h-6 w-6 text-primary-600" />
                </div>
                <Badge variant="success" dot>Hazir</Badge>
              </div>

              <h3 className="font-semibold text-surface-800">{report.client}</h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-surface-500">
                <code className="font-mono">{report.barcode}</code>
                <span>·</span>
                <span>{formatDate(report.date)}</span>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button variant="default" size="sm" className="flex-1 min-w-0" onClick={() => setViewReport(report)}>
                  <Eye className="h-3.5 w-3.5 shrink-0" />
                  Görüntüle
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShareReport(report)} title="Guvenli link veya QR ile paylas">
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => toast.success(`${report.id} indiriliyor...`)} title="PDF indir">
                  <Download className="h-3.5 w-3.5" />
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
        title={viewReport ? `${viewReport.client} — ${viewReport.barcode}` : ''}
        barcode={viewReport?.barcode}
      />
      <ReportShareModal
        open={!!shareReport}
        onOpenChange={(open) => !open && setShareReport(null)}
        reportId={shareReport?.id ?? ''}
        clientName={shareReport?.client ?? ''}
      />
    </div>
  )
}
