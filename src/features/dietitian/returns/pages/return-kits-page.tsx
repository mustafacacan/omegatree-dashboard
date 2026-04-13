import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { RotateCcw, Search } from 'lucide-react'

import { PageHeader } from '@/components/shared/page-header'
import { TablePagination } from '@/components/shared/table-pagination'
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { getDamagedKitsWithPagination, type DamagedKit } from '@/services/damaged-kits.service'

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } }

function kitBarcode(item: DamagedKit): string {
  const k = item?.kitId
  if (k && typeof k === 'object' && 'barcode' in k) {
    const b = (k as { barcode?: unknown }).barcode
    if (typeof b === 'string' && b.trim()) return b.trim()
  }
  return item?.kitId != null ? String((item as unknown as { kitId?: unknown }).kitId) : '—'
}

function statusBadge(item: DamagedKit) {
  const approved = (item as unknown as { approved?: unknown }).approved
  if (approved === true) return <Badge variant="success" dot>Onaylandı</Badge>
  if (approved === false) return <Badge variant="warning" dot>İnceleniyor</Badge>
  return <Badge variant="info" dot>—</Badge>
}

export function ReturnKitsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const trimmed = useMemo(() => search.trim(), [search])

  const query = useQuery({
    queryKey: ['dietitian', 'return-kits', { page, pageSize }],
    queryFn: () =>
      getDamagedKitsWithPagination({
        page: { page, limit: pageSize },
      }),
    placeholderData: keepPreviousData,
    retry: 1,
  })

  const items = query.data?.items ?? []
  const totalItems = query.data?.totalItems ?? items.length

  // Keep page within bounds when total changes.
  useEffect(() => {
    const safeSize = Math.max(1, pageSize)
    const totalPages = Math.max(1, Math.ceil(totalItems / safeSize))
    const next = Math.min(Math.max(1, page), totalPages)
    if (next !== page) setPage(next)
  }, [totalItems, page, pageSize])

  const filtered = useMemo(() => {
    if (!trimmed) return items
    const q = trimmed.toLowerCase()
    return items.filter((it) => {
      const barcode = kitBarcode(it).toLowerCase()
      const reason = String((it as unknown as { reason?: unknown }).reason ?? '').toLowerCase()
      return barcode.includes(q) || reason.includes(q) || String((it as unknown as { id?: unknown }).id ?? '').includes(q)
    })
  }, [items, trimmed])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <motion.div {...fadeUp} transition={{ duration: 0.35, delay: 0.05 }}>
        <div className="panel">
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-200">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-primary-500" />
                <h3 className="text-[15px] font-semibold text-surface-900 truncate">İade Kitler</h3>
              </div>
              <p className="text-[12px] mt-0.5 text-surface-500 truncate">
                {query.isLoading ? 'Yükleniyor...' : `İade taleplerim (${totalItems})`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Barkod / açıklama ara..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-56 outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="p-5 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barkod</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-surface-500 text-sm">
                      Yükleniyor...
                    </TableCell>
                  </TableRow>
                ) : query.isError ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-surface-500 text-sm">
                      {getApiErrorMessage(query.error, { fallback: 'İade kitler yüklenemedi.' })}
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-surface-500 text-sm">
                      Kayıt bulunamadı.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const id = (item as unknown as { id?: unknown }).id
                    const reason = (item as unknown as { reason?: unknown }).reason
                    const createdAt = (item as unknown as { createdAt?: unknown }).createdAt
                    return (
                      <TableRow key={String(id ?? kitBarcode(item))}>
                        <TableCell className="font-mono text-[12px] font-semibold text-surface-900">
                          {kitBarcode(item)}
                        </TableCell>
                        <TableCell className="text-[12px] text-surface-700 max-w-[420px] truncate">
                          {typeof reason === 'string' && reason.trim() ? reason : '—'}
                        </TableCell>
                        <TableCell>{statusBadge(item)}</TableCell>
                        <TableCell className="text-[12px] text-surface-500 whitespace-nowrap">
                          {typeof createdAt === 'string' && createdAt ? formatDate(createdAt) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

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
        </div>
      </motion.div>
    </div>
  )
}

