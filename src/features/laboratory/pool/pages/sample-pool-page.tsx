import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent, Button, Badge, Input,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter,
  Textarea,
} from '@/components/ui'
import { TestTubes, Check, X, Camera, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const poolSamples = [
  { barcode: 'OT-2025-00142', receivedAt: '15 Haz 14:30', condition: 'good' },
  { barcode: 'OT-2025-00141', receivedAt: '15 Haz 11:00', condition: 'good' },
  { barcode: 'OT-2025-00140', receivedAt: '14 Haz 16:45', condition: 'unknown' },
  { barcode: 'OT-2025-00138', receivedAt: '14 Haz 09:20', condition: 'good' },
  { barcode: 'OT-2025-00137', receivedAt: '13 Haz 15:00', condition: 'good' },
]

export function SamplePoolPage() {
  const [rejectOpen, setRejectOpen] = useState(false)
  const [selectedBarcode, setSelectedBarcode] = useState('')

  const handleReject = (barcode: string) => {
    setSelectedBarcode(barcode)
    setRejectOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      <div className="flex items-center justify-between">
        <Input
          placeholder="Barkod ile ara..."
          leftIcon={<Search className="h-4 w-4" />}
          className="w-72"
        />
        <Badge variant="info" dot pulse>
          {poolSamples.length} numune bekliyor
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {poolSamples.map((sample) => (
          <Card key={sample.barcode} className="group hover:shadow-glow transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-surface-100 flex items-center justify-center group-hover:bg-primary-50 transition-colors">
                  <TestTubes className="h-5 w-5 text-surface-500 group-hover:text-primary-600 transition-colors" />
                </div>
                <Badge variant="warning" dot>Bekliyor</Badge>
              </div>

              <code className="text-lg font-mono font-bold text-surface-800 block mb-1">
                {sample.barcode}
              </code>
              <p className="text-xs text-surface-400 mb-4">Gelis: {sample.receivedAt}</p>

              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => toast.success(`${sample.barcode} kabul edildi`)}
                >
                  <Check className="h-4 w-4" />
                  Kabul Et
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleReject(sample.barcode)}
                >
                  <X className="h-4 w-4" />
                  Reddet
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reject Modal */}
      <Modal open={rejectOpen} onOpenChange={setRejectOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Numune Red</ModalTitle>
            <ModalDescription>
              <code className="font-mono">{selectedBarcode}</code> numarayi numunesi reddedilecek
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Textarea label="Red Sebebi *" placeholder="Numune neden uygun degil? (bozulma, eksiklik vb.)" />
            <div>
              <label className="text-sm font-medium text-surface-700 block mb-1.5">
                Fotograf (opsiyonel)
              </label>
              <div className="border-2 border-dashed border-surface-300 rounded-xl p-8 text-center hover:border-primary-300 transition-colors cursor-pointer">
                <Camera className="h-8 w-8 text-surface-400 mx-auto mb-2" />
                <p className="text-sm text-surface-500">Fotograf yuklemek icin tiklayin</p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Iptal</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setRejectOpen(false)
                toast.success('Numune reddedildi, diyetisyen bilgilendirildi')
              }}
            >
              Reddet ve Bildir
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
