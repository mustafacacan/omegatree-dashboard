import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription,
  Button, Badge,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody,
} from '@/components/ui'
import { Upload, FileSpreadsheet, Check, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { KitStatus, KIT_STATUS_LABELS } from '@/utils/constants'
import { formatDate, formatDateTime } from '@/lib/utils'

export function ResultsPage() {
  const navigate = useNavigate()
  const { kits } = useWorkflowStore()
  const [detailBarcode, setDetailBarcode] = useState<string | null>(null)

  const completedKits = useMemo(
    () =>
      kits
        .filter((k) => k.status === KitStatus.ANALYSIS_COMPLETE || k.status === KitStatus.SPECIALIST_POOL || k.status === KitStatus.COMPLETED)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [kits]
  )

  const selectedKit = useMemo(() => (detailBarcode ? kits.find((k) => k.barcode === detailBarcode) : null), [kits, detailBarcode])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Laboratuvar', href: '/lab' },
          { label: 'Sonuclar', href: '/lab/results' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/lab')}>Dashboard</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/lab/pool')}>Numune Havuzu</Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/lab/analysis')}>Analizler</Button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-8">
          <div
            className="border-2 border-dashed border-surface-300 rounded-2xl p-12 text-center hover:border-primary-300 hover:bg-primary-50/20 transition-all cursor-pointer"
            onClick={() => toast.success('Dosya secici aciliyor...')}
            onKeyDown={(e) => e.key === 'Enter' && toast.success('Dosya secici aciliyor...')}
            role="button"
            tabIndex={0}
          >
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-50 mb-4">
              <FileSpreadsheet className="h-8 w-8 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-surface-800 mb-2">Excel Dosyasi Yukleyin</h3>
            <p className="text-sm text-surface-500 mb-4 max-w-md mx-auto">
              Analiz sonuclarini iceren .xlsx dosyasini surukleyin veya dosya secerek yukleyin. Her satir bir barkoda karsilik gelmeli.
            </p>
            <Button variant="gradient" onClick={(e) => { e.stopPropagation(); toast.success('Dosya secici aciliyor...') }}>
              <Upload className="h-4 w-4" />
              Dosya Sec
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Analiz Tamamlanan / Sonuclar</CardTitle>
          <CardDescription>Analizi tamamlanmis numuneler ve uzman havuzuna gecmis kayitlar</CardDescription>
        </CardHeader>
        <CardContent>
          {completedKits.length === 0 ? (
            <div className="py-12 text-center text-surface-500">
              <Check className="h-12 w-12 mx-auto mb-3 text-surface-300" />
              <p>Henuz tamamlanmis analiz sonucu yok.</p>
              <p className="text-sm mt-1">Analizler sayfasindan numune tamamlandiginda burada listelenir.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedKits.map((kit) => (
                <div
                  key={kit.barcode}
                  className="flex items-center justify-between p-4 rounded-xl border border-surface-200 hover:border-primary-200 hover:bg-surface-50/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setDetailBarcode(kit.barcode)}
                        className="font-mono font-semibold text-primary-600 hover:underline text-left block"
                      >
                        {kit.barcode}
                      </button>
                      <p className="text-xs text-surface-500">
                        {formatDateTime(kit.createdAt)} · {kit.location}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setDetailBarcode(kit.barcode)}>
                      <Eye className="h-4 w-4" /> Detay
                    </Button>
                    <Badge variant="success" dot>
                      {KIT_STATUS_LABELS[kit.status]}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detay modal */}
      <Modal open={!!detailBarcode} onOpenChange={(open) => !open && setDetailBarcode(null)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Sonuc Detayi</ModalTitle>
            <ModalDescription>{selectedKit?.barcode}</ModalDescription>
          </ModalHeader>
          <ModalBody>
            {selectedKit && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-surface-500 text-xs">Barkod</p>
                  <p className="font-mono font-semibold">{selectedKit.barcode}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Durum</p>
                  <p>{KIT_STATUS_LABELS[selectedKit.status]}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Konum</p>
                  <p>{selectedKit.location}</p>
                </div>
                <div>
                  <p className="text-surface-500 text-xs">Tarih</p>
                  <p>{formatDateTime(selectedKit.createdAt)}</p>
                </div>
                {selectedKit.assignedDietitianName && (
                  <div className="col-span-2">
                    <p className="text-surface-500 text-xs">Diyetisyen</p>
                    <p>{selectedKit.assignedDietitianName}</p>
                  </div>
                )}
                {selectedKit.assignedClientName && (
                  <div className="col-span-2">
                    <p className="text-surface-500 text-xs">Danisan</p>
                    <p>{selectedKit.assignedClientName}</p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
