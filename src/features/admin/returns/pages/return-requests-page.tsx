import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button, Input } from '@/components/ui'
import { useWorkflowStore } from '@/stores/workflow.store'
import { Search, RotateCcw } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'

const W = {
  olive: '#8B9A4B',
  cream: '#F9F7F3',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
}

export function ReturnRequestsPage() {
  const { kits, adminApproveReturn } = useWorkflowStore()
  const [query, setQuery] = useState('')

  const returnRequests = useMemo(
    () =>
      kits.filter((k) => k.status === 'RETURN_REQUESTED').filter((k) => {
        if (!query.trim()) return true
        const q = query.toLowerCase()
        return (
          k.barcode.toLowerCase().includes(q) ||
          (k.assignedDietitianName || '').toLowerCase().includes(q) ||
          (k.returnRequest?.reason || '').toLowerCase().includes(q)
        )
      }),
    [kits, query]
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
        <div className="p-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100">
          <Input
            placeholder="Barkod, diyetisyen veya neden ile ara..."
            leftIcon={<Search className="h-4 w-4" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-96"
          />
          <p className="text-sm" style={{ color: W.textLight }}>
            {returnRequests.length} talep
          </p>
        </div>

        <div className="p-5 space-y-3">
          {returnRequests.length === 0 && (
            <div className="rounded-xl p-4" style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}>
              <p className="text-sm font-medium" style={{ color: W.text }}>
                Bekleyen iade talebi bulunmuyor.
              </p>
            </div>
          )}

          {returnRequests.map((kit) => (
            <div
              key={kit.barcode}
              className="rounded-xl p-4 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between"
              style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}
            >
              <div className="space-y-1.5">
                <p className="text-sm font-semibold" style={{ color: W.dark }}>
                  {kit.barcode} - {kit.assignedDietitianName}
                </p>
                <p className="text-sm" style={{ color: W.text }}>
                  <span className="font-medium">Neden:</span> {kit.returnRequest?.reason || '-'}
                </p>
                <p className="text-xs" style={{ color: W.textLight }}>
                  Talep Tarihi: {kit.returnRequest?.requestedAt ? formatDateTime(kit.returnRequest.requestedAt) : '-'}
                </p>
                {kit.returnRequest?.photoUrl && (
                  <img
                    src={kit.returnRequest.photoUrl}
                    alt="Iade kanit gorseli"
                    className="h-24 w-40 object-cover rounded-lg border border-surface-200 mt-1"
                  />
                )}
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const result = adminApproveReturn(kit.barcode, 'Admin')
                  if (result.ok) toast.success(result.message)
                  else toast.error(result.message)
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Iadeyi Kabul Et
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
