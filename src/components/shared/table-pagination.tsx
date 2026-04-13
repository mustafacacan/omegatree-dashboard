import { Button, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface TablePaginationProps {
  totalItems: number
  page: number
  pageSize: number
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  className?: string
}

export function TablePagination({
  totalItems,
  page,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationProps) {
  const safePageSize = Math.max(1, pageSize)
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize))
  const currentPage = Math.min(Math.max(1, page), totalPages)

  const start = totalItems === 0 ? 0 : (currentPage - 1) * safePageSize + 1
  const end = Math.min(currentPage * safePageSize, totalItems)

  return (
    <div
      className={`flex flex-col gap-3 border-t border-surface-200 bg-surface-50/50 p-4 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 text-sm text-surface-600">
        <span>Sayfa basina</span>
        <Select value={String(safePageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
          <SelectTrigger className="h-9 w-16 border-surface-200 bg-white px-2 text-surface-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((opt) => (
              <SelectItem key={opt} value={String(opt)}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>
          {start}-{end} / {totalItems}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Geri
        </Button>
        <span className="min-w-20 text-center text-sm text-surface-600">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Ileri
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
