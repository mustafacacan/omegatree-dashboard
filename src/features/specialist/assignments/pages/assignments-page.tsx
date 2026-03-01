import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { ReportViewModal } from '@/components/shared/report-view-modal'
import {
  Card, CardContent, Button, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { PenTool, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { formatDate } from '@/lib/utils'
import { raporDuzenleyiciPath } from '@/utils/routes'
import { useWorkflowStore } from '@/stores/workflow.store'
import { TablePagination } from '@/components/shared/table-pagination'

type AssignmentRow = {
  barcode: string
  assignedAt: string
  status: 'pending' | 'in_progress' | 'completed'
}

export function AssignmentsPage() {
  const navigate = useNavigate()
  const { kits } = useWorkflowStore()

  const assignments = useMemo(() => {
    return kits
      .filter(
        (k) =>
          k.reportStatus === 'SPECIALIST_POOL' ||
          k.reportStatus === 'ADMIN_APPROVAL' ||
          k.reportStatus === 'APPROVED'
      )
      .map((k): AssignmentRow => ({
        barcode: k.barcode,
        assignedAt: k.createdAt,
        status:
          k.reportStatus === 'SPECIALIST_POOL'
            ? 'pending'
            : k.reportStatus === 'ADMIN_APPROVAL'
              ? 'in_progress'
              : 'completed',
      }))
  }, [kits])

  const pendingCount = assignments.filter((a) => a.status === 'pending').length
  const progressCount = assignments.filter((a) => a.status === 'in_progress').length
  const completedCount = assignments.filter((a) => a.status === 'completed').length

  const pendingList = useMemo(() => assignments.filter((a) => a.status === 'pending'), [assignments])
  const progressList = useMemo(() => assignments.filter((a) => a.status === 'in_progress'), [assignments])
  const completedList = useMemo(() => assignments.filter((a) => a.status === 'completed'), [assignments])

  const [viewBarcode, setViewBarcode] = useState<string | null>(null)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Atanan Analizler"
        description="Size atanan analizler: bekleyenlerden baslayin, raporu yazin ve onaya gonderin. Devam eden veya tamamlananlari da buradan takip edebilirsiniz."
      />

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pending">
            Bekleyen ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="progress">
            Devam Eden ({progressCount})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Tamamlanan ({completedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <AssignmentList
            rows={pendingList}
            statusLabel="Bekliyor"
            statusBadge={<Badge variant="warning" dot>Bekliyor</Badge>}
            renderAction={(a) => (
              <>
                <Button variant="ghost" size="sm" onClick={() => toast.success(`${a.barcode} verileri goruntuleniyor`)}>
                  <Eye className="h-4 w-4" /> Verileri Gor
                </Button>
                <Button variant="default" size="sm" onClick={() => navigate(raporDuzenleyiciPath(a.barcode))}>
                  <PenTool className="h-4 w-4" /> Basla
                </Button>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <AssignmentList
            rows={progressList}
            statusLabel="Hazirlaniyor"
            statusBadge={<Badge variant="info" dot pulse>Hazirlaniyor</Badge>}
            renderAction={(a) => (
              <Button variant="default" size="sm" onClick={() => navigate(raporDuzenleyiciPath(a.barcode))}>
                <PenTool className="h-4 w-4" /> Devam Et
              </Button>
            )}
          />
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <AssignmentList
            rows={completedList}
            statusLabel="Tamamlandi"
            statusBadge={<Badge variant="success" dot>Tamamlandi</Badge>}
            renderAction={(a) => (
              <Button variant="outline" size="sm" onClick={() => setViewBarcode(a.barcode)}>
                <Eye className="h-4 w-4" /> Raporu Gor
              </Button>
            )}
          />
        </TabsContent>
      </Tabs>

      <ReportViewModal
        open={!!viewBarcode}
        onOpenChange={(open) => !open && setViewBarcode(null)}
        title={viewBarcode ?? ''}
        barcode={viewBarcode ?? undefined}
      />
    </div>
  )
}

function AssignmentList({
  rows,
  statusBadge,
  renderAction,
}: {
  rows: AssignmentRow[]
  statusLabel: string
  statusBadge: ReactNode
  renderAction: (row: AssignmentRow) => ReactNode
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const paginated = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [rows.length])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
    if (page > totalPages) setPage(totalPages)
  }, [rows.length, page])

  return (
    <Card>
      <CardContent className="p-0">
        {/* Masaustu: tablo */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barkod</TableHead>
                <TableHead>Atanma Tarihi</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-surface-500">
                    Bu sekmede kayit yok.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row) => (
                  <TableRow key={row.barcode}>
                    <TableCell>
                      <code className="font-mono font-semibold">{row.barcode}</code>
                    </TableCell>
                    <TableCell className="text-surface-500">{formatDate(row.assignedAt)}</TableCell>
                    <TableCell>{statusBadge}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {renderAction(row)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={rows.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next)
              setPage(1)
            }}
          />
        </div>

        {/* Mobil: kart listesi — tablo yok, acilip kapanan yapi yok */}
        <div className="md:hidden">
          {paginated.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-surface-500">
              Bu sekmede kayit yok.
            </div>
          ) : (
            <div className="divide-y divide-surface-100">
              {paginated.map((row) => (
                <div key={row.barcode} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <code className="font-mono text-sm font-semibold text-surface-800 block">
                        {row.barcode}
                      </code>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {formatDate(row.assignedAt)}
                      </p>
                      <div className="mt-2">{statusBadge}</div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {renderAction(row)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {rows.length > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 text-sm text-surface-500">
              <span>
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} / {rows.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Önceki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= Math.ceil(rows.length / pageSize)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
