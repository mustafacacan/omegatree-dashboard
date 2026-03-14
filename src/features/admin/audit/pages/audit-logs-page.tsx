import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent, Badge,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Input, Button,
} from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import { Search, Filter, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { TablePagination } from '@/components/shared/table-pagination'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api-error'
import { getAuditLogById, getAuditLogsWithPagination, type AuditLogItem } from '@/services/audit-logs.service'
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui'

const actionColors: Record<string, 'success' | 'info' | 'warning' | 'primary'> = {
  USER_APPROVED: 'success',
  PRICE_UPDATED: 'warning',
  KIT_RECEIVED: 'info',
  SAMPLE_ACCEPTED: 'info',
  REPORT_SUBMITTED: 'primary',
  REPORT_APPROVED: 'success',
}

export function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [detailLogId, setDetailLogId] = useState<number | string | null>(null)
  const trimmedSearch = useMemo(() => search.trim(), [search])

  const auditQuery = useQuery({
    queryKey: ['audit-logs', { page, pageSize, search: trimmedSearch }],
    queryFn: () =>
      getAuditLogsWithPagination({
        page,
        limit: pageSize,
        search: trimmedSearch || undefined,
        sortField: 'timestamp',
        sortDirection: 'desc',
      }),
    placeholderData: keepPreviousData,
  })

  const items = auditQuery.data?.items ?? []
  const totalItems = auditQuery.data?.totalItems ?? items.length

  const paginatedLogs = items

  const detailQuery = useQuery({
    queryKey: ['audit-log', detailLogId],
    queryFn: () => getAuditLogById(detailLogId as number | string),
    enabled: detailLogId !== null,
    placeholderData: keepPreviousData,
  })

  const formatUser = (log: AuditLogItem): string => {
    if (log.userName) return log.userName
    const full = [log.user?.firstName, log.user?.lastName].filter(Boolean).join(' ').trim()
    if (full) return full
    if (log.user?.email) return log.user.email
    if (log.userId != null) return String(log.userId)
    return '—'
  }

  const formatEntity = (log: AuditLogItem): string => {
    const entity = log.entity ?? '—'
    const id = log.entityId != null ? String(log.entityId) : '—'
    return `${entity}#${id}`
  }

  const formatDetails = (log: AuditLogItem): string => {
    if (log.details && String(log.details).trim()) return String(log.details)
    const data = log.data
    if (!data || typeof data !== 'object') return '—'

    const entries = Object.entries(data)
    if (entries.length === 0) return '—'

    const toText = (v: unknown): string => {
      if (v === null) return 'null'
      if (v === undefined) return '—'
      if (typeof v === 'string') return v
      if (typeof v === 'number' || typeof v === 'boolean') return String(v)
      try {
        return JSON.stringify(v)
      } catch {
        return String(v)
      }
    }

    const parts = entries.slice(0, 3).map(([key, val]) => {
      if (val && typeof val === 'object' && !Array.isArray(val) && ('oldValue' in (val as Record<string, unknown>) || 'newValue' in (val as Record<string, unknown>))) {
        const vv = val as Record<string, unknown>
        return `${key}: ${toText(vv.oldValue)} → ${toText(vv.newValue)}`
      }
      return `${key}: ${toText(val)}`
    })

    const suffix = entries.length > 3 ? ` (+${entries.length - 3})` : ''
    return parts.join(' · ') + suffix
  }

  const formatJson = (value: unknown): string => {
    if (value === null) return 'null'
    if (value === undefined) return ''
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

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
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-64"
            />
            <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
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
                <TableHead className="text-right">Islemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditQuery.isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-surface-500">
                    Yukleniyor...
                  </TableCell>
                </TableRow>
              )}
              {auditQuery.isError && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-surface-500">
                    {getApiErrorMessage(auditQuery.error, { fallback: 'Loglar yuklenemedi' })}
                  </TableCell>
                </TableRow>
              )}
              {!auditQuery.isLoading && !auditQuery.isError && paginatedLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-surface-500">
                    Filtreye uygun log bulunamadi.
                  </TableCell>
                </TableRow>
              )}
              {!auditQuery.isLoading && !auditQuery.isError && paginatedLogs.map((log) => {
                const action = log.action ?? '—'
                return (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-surface-500 whitespace-nowrap">
                    {formatDateTime(log.timestamp ?? log.createdAt ?? '')}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{formatUser(log)}</TableCell>
                  <TableCell>
                    <Badge variant={actionColors[action] || 'default'}>
                      {action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-surface-50 px-2 py-0.5 rounded">
                      {formatEntity(log)}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm text-surface-600 max-w-xs truncate">
                    {formatDetails(log)}
                  </TableCell>
                  <TableCell className="text-xs font-mono text-surface-400">{log.ipAddress ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-[12px]"
                      onClick={() => setDetailLogId(log.id)}
                    >
                      Goruntule
                    </Button>
                  </TableCell>
                </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={totalItems}
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

      <Modal open={detailLogId !== null} onOpenChange={(open) => !open && setDetailLogId(null)}>
        <ModalContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <ModalHeader>
            <ModalTitle>
              Log {detailLogId != null ? `#${detailLogId}` : ''}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="flex-1 min-h-0 overflow-y-auto space-y-4">
            {detailQuery.isLoading && (
              <div className="py-10 text-center text-sm text-surface-500">Yukleniyor...</div>
            )}
            {detailQuery.isError && (
              <div className="py-10 text-center text-sm text-surface-500">
                {getApiErrorMessage(detailQuery.error, { fallback: 'Log detayi yuklenemedi' })}
              </div>
            )}
            {!detailQuery.isLoading && !detailQuery.isError && detailQuery.data && (() => {
              const log = detailQuery.data
              const action = log.action ?? '—'
              return (
                <div className="space-y-4">
                  <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Tarih</div>
                        <div className="text-sm text-surface-800 mt-1">{formatDateTime(log.timestamp ?? log.createdAt ?? '')}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Kullanici</div>
                        <div className="text-sm text-surface-800 mt-1">{formatUser(log)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Islem</div>
                        <div className="mt-1">
                          <Badge variant={actionColors[action] || 'default'}>{action}</Badge>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Varlik</div>
                        <div className="text-sm text-surface-800 mt-1">
                          <code className="text-xs bg-white px-2 py-0.5 rounded border border-surface-200">{formatEntity(log)}</code>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">IP</div>
                        <div className="text-sm font-mono text-surface-700 mt-1">{log.ipAddress ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">User Agent</div>
                        <div className="text-xs text-surface-700 mt-1 break-words whitespace-pre-wrap">{log.userAgent ?? '—'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-surface-200 bg-white p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-surface-500">Data</div>
                    {log.data ? (
                      <pre className="mt-2 text-xs leading-relaxed text-surface-800 whitespace-pre-wrap break-words">{formatJson(log.data)}</pre>
                    ) : (
                      <div className="mt-2 text-sm text-surface-500">—</div>
                    )}
                  </div>
                </div>
              )
            })()}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setDetailLogId(null)}>
              Kapat
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
