import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent, Button, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import { PenTool, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { TablePagination } from '@/components/shared/table-pagination'

export function AssignmentsPage() {
  const navigate = useNavigate()
  const { kits } = useWorkflowStore()
  const assignments = kits
    .filter(
      (k) =>
        k.reportStatus === 'SPECIALIST_POOL' ||
        k.reportStatus === 'ADMIN_APPROVAL' ||
        k.reportStatus === 'APPROVED'
    )
    .map((k) => ({
      barcode: k.barcode,
      assignedAt: k.createdAt,
      status:
        k.reportStatus === 'SPECIALIST_POOL'
          ? 'pending'
          : k.reportStatus === 'ADMIN_APPROVAL'
            ? 'in_progress'
            : 'completed',
    }))
  const pendingCount = assignments.filter((a) => a.status === 'pending').length
  const progressCount = assignments.filter((a) => a.status === 'in_progress').length
  const completedCount = assignments.filter((a) => a.status === 'completed').length
  const pendingAssignments = useMemo(
    () => assignments.filter((a) => a.status === 'pending'),
    [assignments]
  )
  const progressAssignments = useMemo(
    () => assignments.filter((a) => a.status === 'in_progress'),
    [assignments]
  )
  const completedAssignments = useMemo(
    () => assignments.filter((a) => a.status === 'completed'),
    [assignments]
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Bekleyen ({pendingCount})</TabsTrigger>
          <TabsTrigger value="progress">Devam Eden ({progressCount})</TabsTrigger>
          <TabsTrigger value="completed">Tamamlanan ({completedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <AssignmentTable
            rows={pendingAssignments}
            renderStatus={() => <Badge variant="warning" dot>Bekliyor</Badge>}
            renderAction={(a) => (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => toast.success(`${a.barcode} verileri goruntuleniyor`)}><Eye className="h-4 w-4" /> Verileri Gor</Button>
                <Button variant="default" size="sm" onClick={() => navigate(`/specialist/reports/editor?barcode=${a.barcode}`)}><PenTool className="h-4 w-4" /> Basla</Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="progress">
          <AssignmentTable
            rows={progressAssignments}
            renderStatus={() => <Badge variant="info" dot pulse>Hazirlaniyor</Badge>}
            renderAction={(a) => (
              <Button variant="default" size="sm" onClick={() => navigate(`/specialist/reports/editor?barcode=${a.barcode}`)}><PenTool className="h-4 w-4" /> Devam Et</Button>
            )}
          />
        </TabsContent>

        <TabsContent value="completed">
          <AssignmentTable
            rows={completedAssignments}
            renderStatus={() => <Badge variant="success" dot>Tamamlandi</Badge>}
            renderAction={(a) => (
              <Button variant="ghost" size="sm" onClick={() => toast.success(`${a.barcode} raporu goruntuleniyor`)}><Eye className="h-4 w-4" /> Raporu Gor</Button>
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AssignmentTable({
  rows,
  renderStatus,
  renderAction,
}: {
  rows: { barcode: string; assignedAt: string }[]
  renderStatus: () => ReactNode
  renderAction: (row: { barcode: string; assignedAt: string }) => ReactNode
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const paginatedRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [rows.length])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [rows.length, page, pageSize])

  return (
    <Card>
      <CardContent className="p-0">
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
            {paginatedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-surface-500">
                  Bu sekmede kayit bulunamadi.
                </TableCell>
              </TableRow>
            )}
            {paginatedRows.map((row) => (
              <TableRow key={row.barcode}>
                <TableCell><code className="font-mono font-semibold">{row.barcode}</code></TableCell>
                <TableCell className="text-surface-500">{row.assignedAt}</TableCell>
                <TableCell>{renderStatus()}</TableCell>
                <TableCell>{renderAction(row)}</TableCell>
              </TableRow>
            ))}
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
      </CardContent>
    </Card>
  )
}
