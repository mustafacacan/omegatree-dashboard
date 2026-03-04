import { useMemo } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button } from '@/components/ui'
import { FileText, Check, User, Package } from 'lucide-react'
import { toast } from 'sonner'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'
import { KitStatus } from '@/utils/constants'
import { formatDate } from '@/lib/utils'

export function ReportApprovalsPage() {
  const user = useCurrentUser()
  const { kits, adminApproveReport } = useWorkflowStore()

  const pendingApproval = useMemo(
    () =>
      kits.filter(
        (k) => k.status === KitStatus.ADMIN_APPROVAL && (k.reportStatus === 'ADMIN_APPROVAL' || !k.reportStatus)
      ),
    [kits]
  )

  const handleApprove = (barcode: string) => {
    const actor = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Admin' : 'Admin'
    adminApproveReport(barcode, actor)
    toast.success(`${barcode} raporu onaylandi. Kit tamamlandi.`)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card className="border-surface-200">
        <CardHeader className="border-b border-surface-100">
          <CardTitle>Rapor Onaylari</CardTitle>
          <CardDescription>
            Uzman tarafindan gonderilen raporlar burada listelenir. Onayladiginizda kit tamamlanir ve diyetisyen/danisan raporu gorebilir.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {pendingApproval.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100">
                <FileText className="h-7 w-7 text-surface-400" />
              </div>
              <p className="text-sm font-medium text-surface-600">Onay bekleyen rapor yok</p>
              <p className="text-xs text-surface-500 mt-1">Uzman rapor gonderdiginde burada gorunecek</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-surface-500 mb-1">{pendingApproval.length} rapor onay bekliyor</p>
              {pendingApproval.map((kit) => (
                <div
                  key={kit.barcode}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-surface-200 bg-amber-50/50 p-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-surface-200 bg-white">
                      <FileText className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-surface-900">
                        <code className="font-mono text-sm">{kit.barcode}</code>
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-500">
                        {kit.assignedDietitianName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {kit.assignedDietitianName}
                          </span>
                        )}
                        {kit.assignedClientName && (
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" /> {kit.assignedClientName}
                          </span>
                        )}
                        <span>{formatDate(kit.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => handleApprove(kit.barcode)}>
                    <Check className="h-4 w-4" />
                    Raporu Onayla
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
