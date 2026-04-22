import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
 

import { PageHeader } from '@/components/shared/page-header'
import { PageLoader } from '@/components/shared/page-loader'
import { TablePagination } from '@/components/shared/table-pagination'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatDate } from '@/lib/utils'
import { getExpertTasks, updateExpert } from '@/services/experts.service'

type AnalysisRow = {
  expertId: number
  barcode: string
  assignedAt?: string
  status: 'pending' | 'in_progress' | 'completed'
}

function statusBadgeVariant(status: AnalysisRow['status']): 'warning' | 'info' | 'success' {
  if (status === 'pending') return 'warning'
  if (status === 'in_progress') return 'info'
  return 'success'
}

function statusLabel(status: AnalysisRow['status']): string {
  if (status === 'pending') return 'Bekliyor'
  if (status === 'in_progress') return 'Hazirlaniyor'
  return 'Tamamlandi'
}

function normalizeStatus(v: unknown): AnalysisRow['status'] {
  if (v === 'pending' || v === 'in_progress' || v === 'completed') return v
  return 'pending'
}

export function SpecialistAnalysesPage() {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const expertsQuery = useQuery({
    queryKey: ['experts', 'analyses', 'in_progress', page, pageSize],
    queryFn: () => getExpertTasks({ page, limit: pageSize, status: 'in_progress' }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const [approvingExpertId, setApprovingExpertId] = useState<number | null>(null)
  const [completingExpertId, setCompletingExpertId] = useState<number | null>(null)

  const approveMutation = useMutation({
    mutationFn: (id: number) => updateExpert(id, { status: 'in_progress' }),
    onMutate: (id) => setApprovingExpertId(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['experts', 'analyses'] })
      toast.success('Analiz onaylandi')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Onay islemi basarisiz' }))
    },
    onSettled: () => setApprovingExpertId(null),
  })

  const completeMutation = useMutation({
    mutationFn: (id: number) => updateExpert(id, { status: 'completed' }),
    onMutate: (id) => setCompletingExpertId(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['experts', 'analyses'] })
      toast.success('Rapor tamamlandi')
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, { fallback: 'Tamamlama islemi basarisiz' }))
    },
    onSettled: () => setCompletingExpertId(null),
  })

  useEffect(() => {
    if (expertsQuery.isError) {
      toast.error(getApiErrorMessage(expertsQuery.error, { fallback: 'Analizler yuklenemedi' }))
    }
  }, [expertsQuery.isError, expertsQuery.error])

  const rows = useMemo<AnalysisRow[]>(() => {
    const list = expertsQuery.data?.experts ?? []
    return list
      .filter((e) => !!e.kitBarcode && e.status !== 'cancelled')
      .map((e) => ({
        expertId: e.id,
        barcode: e.kitBarcode!,
        assignedAt: e.assignedAt,
        status: normalizeStatus(e.status),
      }))
      .sort((a, b) => {
        const at = new Date(a.assignedAt ?? 0).getTime()
        const bt = new Date(b.assignedAt ?? 0).getTime()
        return bt - at
      })
  }, [expertsQuery.data?.experts])

  const totalItems = expertsQuery.data?.totalItems ?? rows.length

  if (expertsQuery.isLoading) return <PageLoader />

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Analizler"
        description="Devam eden analizleriniz. Raporu duzenlemek icin listeden devam edebilirsiniz."
      />

      <AnalysesList
        rows={rows}
        totalItems={totalItems}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next)
          setPage(1)
        }}
        renderStatus={(row) => (
          <Badge variant={statusBadgeVariant(row.status)} dot pulse={row.status === 'in_progress'}>
            {statusLabel(row.status)}
          </Badge>
        )}
        renderAction={(row) => {
          if (row.status === 'pending') {
            return (
              <Button
                variant="default"
                size="sm"
                disabled={approveMutation.isPending && approvingExpertId === row.expertId}
                onClick={() => approveMutation.mutate(row.expertId)}
              >
                {(approveMutation.isPending && approvingExpertId === row.expertId) ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size="sm" className="text-white" /> Onaylaniyor...
                  </span>
                ) : (
                  'Onayla'
                )}
              </Button>
            )
          }

          if (row.status === 'in_progress') {
            return (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={completeMutation.isPending && completingExpertId === row.expertId}
                  onClick={() => completeMutation.mutate(row.expertId)}
                >
                  {(completeMutation.isPending && completingExpertId === row.expertId) ? (
                    <span className="inline-flex items-center gap-2">
                      <Spinner size="sm" /> Tamamlaniyor...
                    </span>
                  ) : (
                    'Raporu Tamamla'
                  )}
                </Button>
              </>
            )
          }

          return (
            <span className="text-xs text-surface-500">—</span>
          )
        }}
      />
    </div>
  )
}

function AnalysesList({
  rows,
  totalItems,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  renderStatus,
  renderAction,
}: {
  rows: AnalysisRow[]
  totalItems: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  renderStatus: (row: AnalysisRow) => ReactNode
  renderAction: (row: AnalysisRow) => ReactNode
}) {
  const paginated = useMemo(() => rows, [rows])

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
                    Kayit yok.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row) => (
                  <TableRow key={row.expertId}>
                    <TableCell>
                      <code className="font-mono font-semibold">{row.barcode}</code>
                    </TableCell>
                    <TableCell className="text-surface-500">{formatDate(row.assignedAt)}</TableCell>
                    <TableCell>
                      {renderStatus(row)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2 justify-end">{renderAction(row)}</div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={totalItems}
            page={page}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>

        {/* Mobil: kart listesi */}
        <div className="md:hidden">
          {paginated.length === 0 ? (
            <div className="py-10 px-4 text-center text-sm text-surface-500">Kayit yok.</div>
          ) : (
            <div className="divide-y divide-surface-100">
              {paginated.map((row) => (
                <div key={row.expertId} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <code className="font-mono text-sm font-semibold text-surface-800 block">{row.barcode}</code>
                      <p className="text-xs text-surface-500 mt-0.5">{formatDate(row.assignedAt)}</p>
                      <div className="mt-2">
                        {renderStatus(row)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">{renderAction(row)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <TablePagination
            totalItems={totalItems}
            page={page}
            pageSize={pageSize}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
