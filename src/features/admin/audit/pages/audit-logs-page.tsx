import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Input, Button,
} from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import { Search, Download, Filter, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { TablePagination } from '@/components/shared/table-pagination'

const actionColors: Record<string, 'success' | 'info' | 'warning' | 'primary'> = {
  USER_APPROVED: 'success',
  PRICE_UPDATED: 'warning',
  KIT_RECEIVED: 'info',
  SAMPLE_ACCEPTED: 'info',
  REPORT_SUBMITTED: 'primary',
  REPORT_APPROVED: 'success',
}

export function AuditLogsPage() {
  const { auditLogs } = useWorkflowStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const logs = auditLogs.length
    ? auditLogs
    : [
        { id: 'seed-1', user: 'Sistem', action: 'SYSTEM_READY', entity: 'System', entityId: 'BOOT', details: 'Is akis kayit sistemi aktif', ip: '127.0.0.1', timestamp: new Date().toISOString() },
      ]
  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((log) =>
      [log.user, log.action, log.entity, log.entityId, log.details, log.ip]
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [logs, search])
  const paginatedLogs = useMemo(
    () => filteredLogs.slice((page - 1) * pageSize, page * pageSize),
    [filteredLogs, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [filteredLogs.length, page, pageSize])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card>
        <div className="p-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100">
          <h3 className="text-[15px] font-semibold text-surface-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary-500" />
            Aktivite Loglari
          </h3>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Input
              placeholder="Log ara..."
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => toast.info('Disa aktarma ozelligi yakinda eklenecek')}>
              <Download className="h-4 w-4" />
              Disa Aktar
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Kullanici</TableHead>
                <TableHead>Islem</TableHead>
                <TableHead>Varlik</TableHead>
                <TableHead>Detay</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-surface-500">
                    Filtreye uygun log bulunamadi.
                  </TableCell>
                </TableRow>
              )}
              {paginatedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-surface-500 whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{log.user}</TableCell>
                  <TableCell>
                    <Badge variant={actionColors[log.action] || 'default'}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-surface-50 px-2 py-0.5 rounded">
                      {log.entity}#{log.entityId}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-surface-600 max-w-xs truncate">
                    {log.details}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-surface-400">{log.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={filteredLogs.length}
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
