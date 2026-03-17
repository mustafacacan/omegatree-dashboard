import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent } from '@/components/ui'
import { Package, Loader2 } from 'lucide-react'
import { useCurrentUser } from '@/stores/auth.store'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { getDieticianClientKits } from '@/services/dietician-client-kits.service'
import type { DieticianClientKit } from '@/services/dietician-client-kits.service'
import { getDieticianClientKitStatusLabel } from '@/utils/constants'

function kitBelongsToCurrentUser(kit: DieticianClientKit, user: ReturnType<typeof useCurrentUser>): boolean {
  if (!user) return false

  const userEmail = typeof user.email === 'string' ? user.email.trim().toLowerCase() : ''
  const kitEmail = typeof kit.clientEmail === 'string' ? kit.clientEmail.trim().toLowerCase() : ''
  if (userEmail && kitEmail && userEmail === kitEmail) return true

  const n = typeof user.id === 'number' ? user.id : Number(user.id)
  if (!Number.isFinite(n)) return false

  return kit.clientUserId === n || kit.clientId === n
}

export function DanisanKitPage() {
  const user = useCurrentUser()

  const apiKitsQuery = useQuery({
    queryKey: ['dietician-client-kits', 'danisan', 'page-1', 'limit-200', user?.id ?? null, user?.email ?? null],
    queryFn: () => getDieticianClientKits(1, 200),
    enabled: user != null,
    retry: 1,
    staleTime: 30_000,
  })

  const apiKits = (apiKitsQuery.data ?? []).filter((k) => kitBelongsToCurrentUser(k, user))

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader />

      {/* API: dietician-client-kits?page=1&limit=200 */}
      <Card className="border-surface-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-surface-100 flex items-center justify-center shrink-0">
              <Package className="h-6 w-6 text-surface-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-surface-900 mb-1">Kitlerim</h3>
              <p className="text-sm text-surface-600 mb-4">Sistemdeki kit durumlariniz burada listelenir.</p>

              {apiKitsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-surface-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Yukleniyor...
                </div>
              ) : apiKitsQuery.isError ? (
                <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-surface-200 bg-surface-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-surface-700">Kitler yuklenemedi</p>
                    <p className="text-xs text-surface-500 mt-1">Lutfen tekrar deneyin.</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => apiKitsQuery.refetch()}>
                    Yenile
                  </Button>
                </div>
              ) : apiKits.length === 0 ? (
                <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 text-sm text-surface-600">
                  Henuz kit kaydi bulunamadi.
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKits.map((k) => (
                    <div
                      key={String(k.id ?? `${k.kitBarcode ?? ''}-${k.createdAt ?? ''}`)}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-surface-200 bg-panel p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-surface-900">
                          <span className="font-mono">{k.kitBarcode ?? '—'}</span>
                          <span className="ml-2 text-xs font-medium text-surface-500">{getDieticianClientKitStatusLabel(k.status)}</span>
                        </p>
                        <p className="text-xs text-surface-500 mt-1">
                          {k.kitName ?? '—'} · Diyetisyen: {k.dieticianName ?? '—'}
                        </p>
                      </div>
                      <div className="text-xs text-surface-500">
                        {k.updatedAt || k.createdAt ? formatDate(k.updatedAt || k.createdAt!) : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

