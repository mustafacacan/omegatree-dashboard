import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
  Button, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody,
} from '@/components/ui'
import { KitStatus, KIT_STATUS_LABELS } from '@/utils/constants'
import { ROUTES } from '@/utils/routes'
import { Upload, Clock, CheckCircle, Eye } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { TablePagination } from '@/components/shared/table-pagination'
import { formatDate, formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

const LAB_ACTOR = 'Lab Teknisyen'

const ANALYSIS_PIPELINE = [KitStatus.SAMPLE_SENT, KitStatus.LAB_PENDING, KitStatus.IN_ANALYSIS, KitStatus.REJECTED, KitStatus.ANALYSIS_COMPLETE, KitStatus.SPECIALIST_POOL, KitStatus.COMPLETED] as const

export function AnalysisPage() {
  const navigate = useNavigate()
  const { kits, labAcceptSample, labCompleteAnalysis } = useWorkflowStore()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [detailBarcode, setDetailBarcode] = useState<string | null>(null)

  const analyses = useMemo(
    () =>
      kits
        .filter((k) => (ANALYSIS_PIPELINE as readonly KitStatus[]).includes(k.status))
        .map((k) => ({
          ...k,
          progress: k.analysisProgress ?? (k.status === KitStatus.ANALYSIS_COMPLETE || k.status === KitStatus.COMPLETED ? 100 : k.status === KitStatus.IN_ANALYSIS ? 50 : 0),
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [kits]
  )

  const paginatedAnalyses = useMemo(
    () => analyses.slice((page - 1) * pageSize, page * pageSize),
    [analyses, page, pageSize]
  )

  const selectedKit = useMemo(() => (detailBarcode ? kits.find((k) => k.barcode === detailBarcode) : null), [kits, detailBarcode])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(analyses.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [analyses.length, page, pageSize])

  const handleAccept = (barcode: string) => {
    labAcceptSample(barcode, LAB_ACTOR)
    toast.success('Numune kabul edildi, analiz baslatildi')
  }

  const handleComplete = (barcode: string) => {
    labCompleteAnalysis(barcode, LAB_ACTOR)
    toast.success('Analiz tamamlandi, uzman havuzuna aktarildi')
  }

  const statusBadgeVariant = (status: KitStatus): 'warning' | 'info' | 'success' | 'danger' | 'default' => {
    if (status === KitStatus.SAMPLE_SENT || status === KitStatus.LAB_PENDING) return 'warning'
    if (status === KitStatus.IN_ANALYSIS) return 'info'
    if (status === KitStatus.REJECTED) return 'danger'
    return 'success'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Laboratuvar', href: ROUTES.LABORATUVAR },
          { label: 'Analizler', href: ROUTES.LABORATUVAR_ANALIZ },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR)}>Dashboard</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_HAVUZ)}>Numune Havuzu</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_SONUCLAR)}>Sonuclar</Button>
            <Button variant="outline" onClick={() => toast.success('Excel dosya secici aciliyor...')}>
              <Upload className="h-4 w-4" />
              Excel Yukle
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Analiz Tablosu</CardTitle>
          <CardDescription>Numune kabul, analiz ilerlemesi ve tamamlama. Sonuclari Excel ile yukleyebilirsiniz.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barkod</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Baslangic</TableHead>
                <TableHead>Ilerleme</TableHead>
                <TableHead className="w-40">Islem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAnalyses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-surface-500">
                    Listelenecek analiz kaydi bulunamadi. Numune havuzundan kabul edin.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAnalyses.map((item) => (
                  <TableRow key={item.barcode}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setDetailBarcode(item.barcode)}
                        className="font-mono font-semibold text-primary-600 hover:underline text-left"
                      >
                        {item.barcode}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(item.status)} dot>
                        {KIT_STATUS_LABELS[item.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-surface-500">{formatDateTime(item.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden min-w-[80px]">
                          <div
                            className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-surface-500 w-8">{item.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setDetailBarcode(item.barcode)} title="Detay">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {(item.status === KitStatus.SAMPLE_SENT || item.status === KitStatus.LAB_PENDING) && (
                          <Button variant="outline" size="sm" onClick={() => handleAccept(item.barcode)}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Kabul Et
                          </Button>
                        )}
                        {item.status === KitStatus.IN_ANALYSIS && (
                          <Button variant="default" size="sm" onClick={() => handleComplete(item.barcode)}>
                            <CheckCircle className="h-3.5 w-3.5" />
                            Tamamla
                          </Button>
                        )}
                        {(item.status === KitStatus.ANALYSIS_COMPLETE || item.status === KitStatus.COMPLETED) && (
                          <Badge variant="success">Bitti</Badge>
                        )}
                        {item.status === KitStatus.IN_ANALYSIS && item.progress < 100 && (
                          <span className="text-xs text-surface-400 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
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

      {/* Detay modal */}
      <Modal open={!!detailBarcode} onOpenChange={(open) => !open && setDetailBarcode(null)}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Analiz Detayi</ModalTitle>
            <ModalDescription>{selectedKit?.barcode}</ModalDescription>
          </ModalHeader>
          <ModalBody>
            {selectedKit && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-surface-500 text-xs">Barkod</p>
                  <p className="font-mono font-semibold">{selectedKit.barcode}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Durum</p>
                  <p>{KIT_STATUS_LABELS[selectedKit.status]}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Konum</p>
                  <p>{selectedKit.location}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Ilerleme</p>
                  <p>%{selectedKit.analysisProgress ?? 0}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Gelis / Baslangic</p>
                  <p>{formatDateTime(selectedKit.createdAt)}</p>
                </div>
                {/* Kör analiz: Lab sadece barkod görür; danışan/diyetisyen adı gösterilmez */}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
