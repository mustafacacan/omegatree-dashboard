import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent, Button, Badge, Input,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Textarea,
} from '@/components/ui'
import { TestTubes, Check, X, Search, Eye, Calendar, ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { KitStatus, KIT_STATUS_LABELS } from '@/utils/constants'
import { ROUTES } from '@/utils/routes'
import { formatDate, formatDateTime } from '@/lib/utils'

const LAB_ACTOR = 'Lab Teknisyen'

export function SamplePoolPage() {
  const navigate = useNavigate()
  const { kits, labAcceptSample, labRejectSample } = useWorkflowStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selectedBarcode, setSelectedBarcode] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [rejectPhotoUrl, setRejectPhotoUrl] = useState<string | undefined>(undefined)
  const [rejectPhotoName, setRejectPhotoName] = useState('')
  const [detailBarcode, setDetailBarcode] = useState<string | null>(null)

  const poolKits = useMemo(
    () =>
      kits
        .filter(
          (k) =>
            (k.status === KitStatus.SAMPLE_SENT || k.status === KitStatus.LAB_PENDING) &&
            (!searchQuery.trim() || k.barcode.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [kits, searchQuery]
  )

  const handleAccept = (barcode: string) => {
    labAcceptSample(barcode, LAB_ACTOR)
    toast.success(`${barcode} kabul edildi, analiz baslatildi`)
    navigate(ROUTES.LABORATUVAR_ANALIZ)
  }

  const handleRejectClick = (barcode: string) => {
    setSelectedBarcode(barcode)
    setRejectReason('')
    setRejectPhotoUrl(undefined)
    setRejectPhotoName('')
    setRejectOpen(true)
  }

  const handleRejectPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setRejectPhotoName(file.name)
    const reader = new FileReader()
    reader.onload = () => { if (typeof reader.result === 'string') setRejectPhotoUrl(reader.result) }
    reader.readAsDataURL(file)
  }

  const handleRejectSubmit = () => {
    const reason = rejectReason.trim()
    if (!reason) {
      toast.error('Red sebebi zorunludur')
      return
    }
    if (!rejectPhotoUrl) {
      toast.error('Numune reddi icin fotoğraf yuklemeniz zorunludur.')
      return
    }
    const result = labRejectSample(selectedBarcode, reason, LAB_ACTOR, undefined, rejectPhotoUrl)
    if (result.ok) {
      toast.success(result.message)
      setRejectOpen(false)
      setSelectedBarcode('')
      setRejectReason('')
      setRejectPhotoUrl(undefined)
      setRejectPhotoName('')
    } else toast.error(result.message)
  }

  const selectedKit = useMemo(
    () => (detailBarcode ? kits.find((k) => k.barcode === detailBarcode) : null),
    [kits, detailBarcode]
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        breadcrumbs={[
          { label: 'Laboratuvar', href: ROUTES.LABORATUVAR },
          { label: 'Numune Havuzu', href: ROUTES.LABORATUVAR_HAVUZ },
        ]}
      />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Input
          placeholder="Barkod ile ara..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
          className="w-72"
        />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR)}>
            Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.LABORATUVAR_ANALIZ)}>
            Analizler
          </Button>
          <Badge variant="info" dot pulse>
            {poolKits.length} numune bekliyor
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {poolKits.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-surface-500">
              <TestTubes className="h-12 w-12 mx-auto mb-3 text-surface-300" />
              <p className="font-medium">Bekleyen numune yok</p>
              <p className="text-sm mt-1">
                {searchQuery ? 'Arama kriterine uygun numune bulunamadi.' : 'Numune gonderildiginde burada listelenir.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          poolKits.map((kit) => (
            <Card key={kit.barcode} className="group hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-11 w-11 rounded-xl bg-amber-50 flex items-center justify-center">
                    <TestTubes className="h-5 w-5 text-amber-600" />
                  </div>
                  <Badge variant="warning" dot>Bekliyor</Badge>
                </div>

                <code className="text-lg font-mono font-bold text-surface-800 block mb-1">{kit.barcode}</code>
                <p className="text-xs text-surface-500 mb-4 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Gelis: {formatDateTime(kit.createdAt)}
                </p>
                {/* Kör analiz: Lab sadece barkod görür, danışan/diyetisyen adı gösterilmez */}

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDetailBarcode(kit.barcode)} className="shrink-0">
                    <Eye className="h-3.5 w-3.5" /> Detay
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAccept(kit.barcode)}
                  >
                    <Check className="h-4 w-4" />
                    Kabul Et
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleRejectClick(kit.barcode)}>
                    <X className="h-4 w-4" />
                    Reddet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Red modal */}
      <Modal open={rejectOpen} onOpenChange={setRejectOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Numune Red</ModalTitle>
            <ModalDescription>
              <code className="font-mono">{selectedBarcode}</code> numarali numune reddedilecek. Sebep zorunludur.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Textarea
              label="Red Sebebi *"
              placeholder="Numune neden uygun degil? (bozulma, eksiklik, hasar vb.)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
            <div>
              <label className="block text-[13px] font-medium text-surface-700 mb-2">
                Red kanit fotografi (zorunlu)
              </label>
              <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
                <ImageIcon className="h-4 w-4" />
                <span>Fotoğraf sec</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleRejectPhotoChange} />
              </label>
              {rejectPhotoName && <p className="text-xs text-surface-500 mt-1">Secilen: {rejectPhotoName}</p>}
              {rejectPhotoUrl && (
                <img src={rejectPhotoUrl} alt="Red kanit" className="mt-2 h-24 w-32 object-cover rounded-lg border border-surface-200" />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Iptal</Button>
            <Button variant="destructive" onClick={handleRejectSubmit} disabled={!rejectReason.trim() || !rejectPhotoUrl}>
              Reddet ve Bildir
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Detay modal */}
      <Modal open={!!detailBarcode} onOpenChange={(open) => !open && setDetailBarcode(null)}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Numune Detayi</ModalTitle>
            <ModalDescription>Barkod: {selectedKit?.barcode} — Kör analiz: sadece barkod bilgisi gosterilir</ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {selectedKit && (
              <div className="grid grid-cols-2 gap-3 text-sm">
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
                  <p className="text-surface-500 text-xs">Gelis Tarihi</p>
                  <p>{formatDateTime(selectedKit.createdAt)}</p>
                </div>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  )
}
