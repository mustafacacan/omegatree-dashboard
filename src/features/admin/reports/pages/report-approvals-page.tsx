import { useMemo } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, Button } from '@/components/ui'
import { FileText, Check, User, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'
import { KitStatus } from '@/utils/constants'
import { formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'

const W = {
  olive: '#8B9A4B',
  oliveLight: '#EEF2DE',
  orange: '#E8913A',
  orangeLight: '#FDF0E2',
  cream: '#F9F7F3',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
}

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

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

      <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
        <div
          className="rounded-2xl p-4 flex items-start gap-3 border"
          style={{ background: W.cream, borderColor: W.warmBorder }}
        >
          <FileText className="h-5 w-5 shrink-0 mt-0.5" style={{ color: W.olive }} />
          <div>
            <p className="text-[13px] font-medium" style={{ color: W.dark }}>
              Rapor onaylari
            </p>
            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: W.text }}>
              Uzman tarafindan gonderilen raporlar burada listelenir. Onayladiginizda kit tamamlanir ve diyetisyen/danisan raporu gorebilir.
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.05 }}>
        <Card className="overflow-hidden border-0 shadow-sm" style={{ border: `1px solid ${W.warmBorder}`, borderRadius: '1rem' }}>
          <CardContent className="p-5">
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: W.dark }}>
              Onay bekleyen raporlar ({pendingApproval.length})
            </h3>

            {pendingApproval.length === 0 ? (
              <div className="py-12 text-center" style={{ color: W.textLight }}>
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-[13px]">Onay bekleyen rapor yok</p>
                <p className="text-[12px] mt-1">Uzman rapor gonderdiginde burada gorunecek</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApproval.map((kit) => (
                  <div
                    key={kit.barcode}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl border flex-wrap"
                    style={{ background: W.orangeLight, borderColor: W.warmBorder }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}
                      >
                        <FileText className="h-6 w-6" style={{ color: W.orange }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[14px]" style={{ color: W.dark }}>
                          <code className="font-mono">{kit.barcode}</code>
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-[12px]" style={{ color: W.textLight }}>
                          {kit.assignedDietitianName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> Diyetisyen: {kit.assignedDietitianName}
                            </span>
                          )}
                          {kit.assignedClientName && (
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" /> Danisan: {kit.assignedClientName}
                            </span>
                          )}
                          <span>{formatDate(kit.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleApprove(kit.barcode)}
                      style={{ background: W.olive }}
                    >
                      <Check className="h-4 w-4" />
                      Raporu Onayla
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
