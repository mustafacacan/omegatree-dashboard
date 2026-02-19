import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent, Badge, Avatar,
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
  Button, Input,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { Search, TrendingUp, TrendingDown } from 'lucide-react'
import { useUsersStore } from '@/stores/users.store'
import { useWorkflowStore } from '@/stores/workflow.store'
import { UserRole } from '@/utils/constants'
import { TablePagination } from '@/components/shared/table-pagination'

export function CariPage() {
  const { users } = useUsersStore()
  const { kits } = useWorkflowStore()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const demoCari = useMemo(
    () =>
      users
        .filter((u) => u.role === UserRole.DIETITIAN)
        .map((u) => {
          const name = `${u.firstName} ${u.lastName}`.trim()
          const userKits = kits.filter((k) => k.assignedDietitianId === u.id)
          const totalPurchased = userKits.length * (userKits[0]?.price || 1500)
          const deliveredCount = userKits.filter((k) =>
            ['DELIVERED', 'SAMPLE_SENT', 'IN_ANALYSIS', 'COMPLETED'].includes(k.status)
          ).length
          const totalPaid = deliveredCount * (userKits[0]?.price || 1500)
          return {
            id: u.id,
            name,
            email: u.email,
            totalPaid,
            totalPurchased,
            balance: totalPaid - totalPurchased,
          }
        }),
    [kits, users]
  )
  const filteredCari = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return demoCari
    return demoCari.filter(
      (item) => item.name.toLowerCase().includes(q) || item.email.toLowerCase().includes(q)
    )
  }, [demoCari, search])
  const paginatedCari = useMemo(
    () => filteredCari.slice((page - 1) * pageSize, page * pageSize),
    [filteredCari, page, pageSize]
  )

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredCari.length / pageSize))
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [filteredCari.length, page, pageSize])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cari Hesap Listesi</CardTitle>
            <Input
              placeholder="Diyetisyen ara..."
              leftIcon={<Search className="h-4 w-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Diyetisyen</TableHead>
                <TableHead>Toplam Odeme</TableHead>
                <TableHead>Toplam Alis</TableHead>
                <TableHead>Bakiye</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCari.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-surface-500">
                    Filtreye uygun cari kaydi bulunamadi.
                  </TableCell>
                </TableRow>
              )}
              {paginatedCari.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={item.name} size="sm" />
                      <div>
                        <p className="font-medium text-surface-800">{item.name}</p>
                        <p className="text-xs text-surface-400">{item.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-primary-700">
                    {formatCurrency(item.totalPaid)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(item.totalPurchased)}
                  </TableCell>
                  <TableCell>
                    <span className={item.balance >= 0 ? 'font-semibold text-primary-700' : 'font-semibold text-danger'}>
                      {formatCurrency(item.balance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {item.balance > 0 ? (
                      <Badge variant="success" dot><TrendingUp className="h-3 w-3" /> Alacakli</Badge>
                    ) : item.balance < 0 ? (
                      <Badge variant="danger" dot><TrendingDown className="h-3 w-3" /> Borclu</Badge>
                    ) : (
                      <Badge variant="default">Dengeli</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            totalItems={filteredCari.length}
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
