import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import toast from 'react-hot-toast'
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
  Button, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui'
import { SampleStatus } from '@/utils/constants'
import { Upload, Clock, CheckCircle } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { TablePagination } from '@/components/shared/table-pagination'

const statusBadge: Record<SampleStatus, { variant: 'warning' | 'info' | 'success' | 'danger' | 'default'; label: string }> = {
  [SampleStatus.PENDING]: { variant: 'warning', label: 'Bekliyor' },
  [SampleStatus.ACCEPTED]: { variant: 'info', label: 'Kabul Edildi' },
  [SampleStatus.REJECTED]: { variant: 'danger', label: 'Reddedildi' },
  [SampleStatus.IN_ANALYSIS]: { variant: 'info', label: 'Analizde' },
  [SampleStatus.COMPLETED]: { variant: 'success', label: 'Tamamlandi' },
}

export function AnalysisPage() {
  const { kits, labAcceptSample, labCompleteAnalysis } = useWorkflowStore()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const analyses = kits
    .filter((k) => [SampleStatus.PENDING, SampleStatus.ACCEPTED, SampleStatus.IN_ANALYSIS, SampleStatus.COMPLETED, 'SAMPLE_SENT', 'ANALYSIS_COMPLETE'].includes(k.status))
    .map((k) => ({
      barcode: k.barcode,
      status:
        k.status === 'SAMPLE_SENT'
          ? SampleStatus.PENDING
          : k.status === 'ANALYSIS_COMPLETE'
            ? SampleStatus.COMPLETED
            : (k.status as SampleStatus),
      startedAt: k.createdAt,
      progress: k.analysisProgress ?? (k.status === 'ANALYSIS_COMPLETE' ? 100 : 60),
    }))
  const paginatedAnalyses = useMemo(
    () => analyses.slice((page - 1) * pageSize, page * pageSize),
    [analyses, page, pageSize]
  )

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(analyses.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [analyses.length, page, pageSize])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Analiz Tablosu</CardTitle>
              <CardDescription>Sonuclari Excel ile yukleyebilirsiniz</CardDescription>
            </div>
            <Button variant="outline" onClick={() => toast.success('Excel dosya secici aciliyor...')}>
              <Upload className="h-4 w-4" />
              Excel Yukle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barkod</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Baslangic</TableHead>
                <TableHead>Ilerleme</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAnalyses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-surface-500">
                    Listelenecek analiz kaydi bulunamadi.
                  </TableCell>
                </TableRow>
              )}
              {paginatedAnalyses.map((item) => (
                <TableRow key={item.barcode}>
                  <TableCell>
                    <code className="text-sm font-mono font-semibold">{item.barcode}</code>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusBadge[item.status].variant} dot>
                      {statusBadge[item.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-surface-500">{item.startedAt}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-surface-500 w-8">{item.progress}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.status === SampleStatus.PENDING ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          labAcceptSample(item.barcode, 'Lab Tek.')
                          toast.success('Numune kabul edildi, analiz baslatildi')
                        }}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Kabul Et
                      </Button>
                    ) : item.status === SampleStatus.IN_ANALYSIS && item.progress >= 90 ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          labCompleteAnalysis(item.barcode, 'Lab Tek.')
                          toast.success('Analiz tamamlandi, uzman havuzuna aktarildi')
                        }}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Tamamla
                      </Button>
                    ) : item.status === SampleStatus.COMPLETED ? (
                      <Badge variant="success">Bitti</Badge>
                    ) : (
                      <span className="text-xs text-surface-400 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Devam Ediyor
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={analyses.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}
