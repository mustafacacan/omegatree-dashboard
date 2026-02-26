import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent,
  Button, Input, Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
} from '@/components/ui'
import { useWorkflowStore } from '@/stores/workflow.store'
import { Search, RotateCcw, CheckCircle, XCircle, History, Package } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import toast from 'react-hot-toast'
import { KitStatus } from '@/utils/constants'

const W = {
  olive: '#8B9A4B',
  cream: '#F9F7F3',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
}

export function ReturnRequestsPage() {
  const { kits, auditLogs, adminApproveReturn, adminRejectReturn, assignKitsToDietitian, markDamagedCompensationAssigned } = useWorkflowStore()
  const [query, setQuery] = useState('')
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
  const [compensationForBarcode, setCompensationForBarcode] = useState<string | null>(null)
  const [compensationSelectedBarcode, setCompensationSelectedBarcode] = useState('')

  const returnRequests = useMemo(
    () =>
      kits.filter((k) => k.status === KitStatus.RETURN_REQUESTED).filter((k) => {
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

  const damagedAwaitingCompensation = useMemo(
    () =>
      kits.filter(
        (k) => k.status === KitStatus.DAMAGED && k.assignedDietitianId && k.assignedDietitianName
      ),
    [kits]
  )
  const inStockBarcodes = useMemo(
    () => kits.filter((k) => k.status === KitStatus.IN_STOCK).map((k) => k.barcode),
    [kits]
  )

  const handleAssignCompensation = (damagedBarcode: string) => {
    const damaged = kits.find((k) => k.barcode === damagedBarcode && k.status === KitStatus.DAMAGED)
    if (!damaged?.assignedDietitianId || !damaged?.assignedDietitianName) return
    if (!compensationSelectedBarcode || !inStockBarcodes.includes(compensationSelectedBarcode)) {
      toast.error('Stoktan bir barkod secin')
      return
    }
    assignKitsToDietitian(damaged.assignedDietitianId, damaged.assignedDietitianName, [compensationSelectedBarcode], '', 'Admin')
    markDamagedCompensationAssigned(damagedBarcode, 'Admin')
    toast.success('Telafi kiti atandi')
    setCompensationForBarcode(null)
    setCompensationSelectedBarcode('')
  }

  const returnHistory = useMemo(
    () =>
      auditLogs.filter(
        (log) => log.action === 'RETURN_APPROVED' || log.action === 'RETURN_REJECTED'
      ),
    [auditLogs]
  )

  const filteredHistory = useMemo(() => {
    if (!query.trim()) return returnHistory
    const q = query.toLowerCase()
    return returnHistory.filter(
      (log) =>
        log.entityId.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.user.toLowerCase().includes(q)
    )
  }, [returnHistory, query])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle>Iade Talepleri</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-surface-200 p-0.5 bg-surface-50">
                <button
                  type="button"
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'pending'
                      ? 'bg-white text-surface-900 shadow-sm'
                      : 'text-surface-600 hover:text-surface-900'
                  }`}
                >
                  Bekleyen ({returnRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === 'history'
                      ? 'bg-white text-surface-900 shadow-sm'
                      : 'text-surface-600 hover:text-surface-900'
                  }`}
                >
                  <History className="h-4 w-4" />
                  Iade Gecmisi ({returnHistory.length})
                </button>
                {damagedAwaitingCompensation.length > 0 && (
                  <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    Telafi atanacak: {damagedAwaitingCompensation.length}
                  </span>
                )}
              </div>
              <Input
                placeholder={
                  activeTab === 'pending'
                    ? 'Barkod, diyetisyen veya neden ile ara...'
                    : 'Barkod, kullanici veya detay ile ara...'
                }
                leftIcon={<Search className="h-4 w-4" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeTab === 'pending' && (
            <div className="p-5 space-y-3">
              {damagedAwaitingCompensation.length > 0 && (
                <div className="mb-4 rounded-xl p-4 border border-amber-200 bg-amber-50/50">
                  <p className="text-sm font-semibold text-amber-800 mb-2">Telafi kiti atanacak (hasar onaylandi)</p>
                  <div className="space-y-2">
                    {damagedAwaitingCompensation.map((kit) => (
                      <div key={kit.barcode} className="flex items-center justify-between gap-3 py-2 border-b border-amber-100 last:border-0">
                        <span className="font-mono text-sm">{kit.barcode}</span>
                        <span className="text-sm text-surface-600">{kit.assignedDietitianName}</span>
                        <Button variant="outline" size="sm" onClick={() => { setCompensationForBarcode(kit.barcode); setCompensationSelectedBarcode('') }}>
                          <Package className="h-3.5 w-3.5" />
                          Telafi kiti ata
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {returnRequests.length === 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}
                >
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
                      <span className="font-medium">Neden:</span>{' '}
                      {kit.returnRequest?.reason || '-'}
                    </p>
                    <p className="text-xs" style={{ color: W.textLight }}>
                      Talep Tarihi:{' '}
                      {kit.returnRequest?.requestedAt
                        ? formatDateTime(kit.returnRequest.requestedAt)
                        : '-'}
                    </p>
                    {kit.returnRequest?.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoModalUrl(kit.returnRequest!.photoUrl!)}
                        className="block mt-1 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg overflow-hidden"
                      >
                        <img
                          src={kit.returnRequest.photoUrl}
                          alt="Iade kanit gorseli"
                          className="h-24 w-40 object-cover rounded-lg border border-surface-200 hover:border-primary-300 transition-colors cursor-pointer"
                        />
                        <span className="text-xs text-surface-500 mt-0.5 block">
                          Goruntuyu buyutmek icin tiklayin
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const result = adminRejectReturn(kit.barcode, 'Admin')
                        if (result.ok) toast.success(result.message)
                        else toast.error(result.message)
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                      Reddet
                    </Button>
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
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-5 space-y-3">
              {filteredHistory.length === 0 && (
                <div
                  className="rounded-xl p-4"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}
                >
                  <p className="text-sm font-medium" style={{ color: W.text }}>
                    Iade gecmisi kaydi bulunmuyor.
                  </p>
                </div>
              )}

              {filteredHistory.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                  style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {log.action === 'RETURN_APPROVED' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold" style={{ color: W.dark }}>
                        {log.entityId}
                        <span className="ml-2 font-normal text-surface-500">
                          {log.action === 'RETURN_APPROVED' ? 'Iade onaylandi' : 'Iade reddedildi'}
                        </span>
                      </p>
                      <p className="text-sm" style={{ color: W.text }}>
                        {log.details}
                      </p>
                      <p className="text-xs mt-1" style={{ color: W.textLight }}>
                        {log.user} · {formatDateTime(log.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Telafi kiti ata modal */}
      <Modal open={!!compensationForBarcode} onOpenChange={(open) => !open && (setCompensationForBarcode(null), setCompensationSelectedBarcode(''))}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Telafi kiti ata</ModalTitle>
            <ModalDescription>
              Hasarlı kit: <code className="font-mono">{compensationForBarcode}</code>. Stoktan bir barkod secip bu diyetisyene atayin.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            <label className="block text-sm font-medium text-surface-700 mb-2">Stoktaki barkod</label>
            <select
              value={compensationSelectedBarcode}
              onChange={(e) => setCompensationSelectedBarcode(e.target.value)}
              className="w-full rounded-lg border border-surface-200 px-3 py-2 text-sm"
            >
              <option value="">Secin...</option>
              {inStockBarcodes.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            {inStockBarcodes.length === 0 && (
              <p className="text-xs text-amber-600 mt-2">Stokta barkod yok. Once uretimden barkod uretin.</p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => { setCompensationForBarcode(null); setCompensationSelectedBarcode('') }}>Iptal</Button>
            <Button
              variant="primary"
              onClick={() => compensationForBarcode && handleAssignCompensation(compensationForBarcode)}
              disabled={!compensationSelectedBarcode}
            >
              Telafi kiti ata
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Fotoğraf büyütme modalı */}
      <Modal open={!!photoModalUrl} onOpenChange={(open) => !open && setPhotoModalUrl(null)}>
        <ModalContent className="max-w-4xl">
          <ModalHeader>
            <ModalTitle>Iade kanit gorseli</ModalTitle>
          </ModalHeader>
          <ModalBody className="p-0">
            {photoModalUrl && (
              <img
                src={photoModalUrl}
                alt="Iade kanit gorseli buyuk"
                className="w-full h-auto max-h-[80vh] object-contain rounded-b-xl"
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
