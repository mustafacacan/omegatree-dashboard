import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, Button, Badge, Input } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { FileText, Download, Share2, Eye, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'
import { KitStatus } from '@/utils/constants'

export function ReportsPage() {
  const user = useCurrentUser()
  const { kits } = useWorkflowStore()
  const [search, setSearch] = useState('')

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
    <div className="space-y-5 animate-fade-in">
      <PageHeader />

      <Card className="border-surface-200">
        <CardContent className="p-4">
          <Input
            placeholder="Rapor, danisan veya barkod ile ara..."
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardContent>
      </Card>

      {filteredReports.length === 0 ? (
        <Card className="border-surface-200">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 text-surface-300" />
            <p className="text-sm font-medium text-surface-600">Henuz rapor yok</p>
            <p className="text-xs text-surface-400 mt-1">
              {search ? 'Arama sonucu bulunamadi' : 'Tamamlanan analiz raporlari burada gorunecek'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReports.map((report) => (
            <Card key={report.barcode} className="group border-surface-200 hover:border-primary-200 hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                    <FileText className="h-6 w-6 text-primary-600" />
                  </div>
                  <Badge variant="success" dot>Hazir</Badge>
                </div>

                <h3 className="font-semibold text-surface-800">{report.client}</h3>
                <div className="flex items-center gap-2 text-xs text-surface-400 mt-1">
                  <code>{report.barcode}</code>
                  <span>·</span>
                  <span>{formatDate(report.date)}</span>
                </div>

                <div className="flex items-center gap-2 mt-5">
                  <Button variant="default" size="sm" className="flex-1" onClick={() => toast.success(`${report.client} raporu goruntuleniyor`)}>
                    <Eye className="h-3.5 w-3.5" />
                    Gor
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast.success(`${report.id} indiriliyor...`)}>
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toast.success(`${report.client} icin paylasim linki olusturuldu`)}>
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
