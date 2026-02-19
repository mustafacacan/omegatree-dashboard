import { useState } from 'react'
import {
  Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription,
  ModalBody, ModalFooter, Button, Input,
} from '@/components/ui'
import { Package, Building2, Home, MapPin, Truck } from 'lucide-react'
import toast from 'react-hot-toast'

interface KitRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientName: string
  clientId: string
}

export function KitRequestModal({ open, onOpenChange, clientName, clientId }: KitRequestModalProps) {
  const [deliveryType, setDeliveryType] = useState<'office' | 'home' | null>(null)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!deliveryType) return
    if (deliveryType === 'home' && !address.trim()) {
      toast.error('Ev teslimi icin adres girmeniz gerekiyor')
      return
    }

    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))

    toast.success('Kit talebi olusturuldu! Kargo takip numarasi SMS ile gonderilecek.')
    setLoading(false)
    setDeliveryType(null)
    setAddress('')
    onOpenChange(false)
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Kit Talep Et</ModalTitle>
          <ModalDescription>
            <strong>{clientName}</strong> ({clientId}) icin kit talebi olusturun
          </ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {/* Delivery type selection */}
          <div>
            <label className="block text-[13px] font-medium text-surface-700 mb-2">Teslimat Yontemi</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeliveryType('office')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  deliveryType === 'office'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-surface-200 hover:border-surface-300'
                }`}
              >
                <Building2 className={`h-6 w-6 ${deliveryType === 'office' ? 'text-primary-600' : 'text-surface-400'}`} />
                <span className={`text-sm font-medium ${deliveryType === 'office' ? 'text-primary-700' : 'text-surface-600'}`}>
                  Ofis / Klinik
                </span>
                <span className="text-[11px] text-surface-400">Kayitli adrese gonderim</span>
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType('home')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  deliveryType === 'home'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-surface-200 hover:border-surface-300'
                }`}
              >
                <Home className={`h-6 w-6 ${deliveryType === 'home' ? 'text-primary-600' : 'text-surface-400'}`} />
                <span className={`text-sm font-medium ${deliveryType === 'home' ? 'text-primary-700' : 'text-surface-600'}`}>
                  Ev Adresi
                </span>
                <span className="text-[11px] text-surface-400">Danisan adresine gonderim</span>
              </button>
            </div>
          </div>

          {/* Address field for home delivery */}
          {deliveryType === 'home' && (
            <Input
              label="Teslimat Adresi"
              placeholder="Danisanin tam adresi..."
              leftIcon={<MapPin className="h-4 w-4" />}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          )}

          {deliveryType === 'office' && (
            <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-3.5 w-3.5 text-surface-500" />
                <span className="text-xs font-medium text-surface-500">Kayitli Klinik Adresi</span>
              </div>
              <p className="text-sm text-surface-700">Bagdat Cad. No:123 Kadikoy/Istanbul</p>
            </div>
          )}

          {/* Kit info */}
          {deliveryType && (
            <div className="p-3 rounded-lg bg-primary-50 border border-primary-100">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary-600" />
                <div>
                  <p className="text-xs font-medium text-primary-700">Omega-3 Index Kit</p>
                  <p className="text-[11px] text-primary-600">Tahmini teslimat: 1-3 is gunu (Aras Kargo)</p>
                </div>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Iptal</Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={!deliveryType}
          >
            <Package className="h-4 w-4" />
            Talep Olustur
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
