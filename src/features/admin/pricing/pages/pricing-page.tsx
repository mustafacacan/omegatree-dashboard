import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent,
  Button, Input,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Pencil, Package, Layers, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore, type PriceBundle } from '@/stores/workflow.store'

export function PricingPage() {
  const { priceTiers, setPricingTiers } = useWorkflowStore()
  const [tiersOpen, setTiersOpen] = useState(false)
  const [tiersSingle, setTiersSingle] = useState('')
  const [tiersBundles, setTiersBundles] = useState<{ quantity: string; total: string }[]>([])

  const openTiersModal = () => {
    setTiersSingle(String(priceTiers.singleKitPrice))
    setTiersBundles(
      priceTiers.bundles.length > 0
        ? priceTiers.bundles.map((b) => ({ quantity: String(b.quantity), total: String(b.total) }))
        : [{ quantity: '', total: '' }]
    )
    setTiersOpen(true)
  }

  const addBundleRow = () => setTiersBundles((prev) => [...prev, { quantity: '', total: '' }])
  const removeBundleRow = (index: number) =>
    setTiersBundles((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  const updateBundleRow = (index: number, field: 'quantity' | 'total', value: string) =>
    setTiersBundles((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))

  const submitTiers = () => {
    const single = Number(tiersSingle)
    if (!Number.isFinite(single) || single <= 0) {
      toast.error('Tekil kit fiyati gecerli bir sayi olmali.')
      return
    }
    const bundles: PriceBundle[] = []
    for (let i = 0; i < tiersBundles.length; i++) {
      const qty = Math.floor(Number(tiersBundles[i].quantity))
      const total = Number(tiersBundles[i].total)
      if (!Number.isFinite(qty) || qty < 2) continue
      if (!Number.isFinite(total) || total <= 0) continue
      if (total >= single * qty) {
        toast.error(`${qty} adet paket toplam fiyati, tekil fiyatin ${qty} katindan dusuk olmali (indirim icin).`)
        return
      }
      bundles.push({ quantity: qty, total })
    }
    setPricingTiers(single, bundles, 'Admin')
    toast.success('Fiyat gruplari guncellendi.')
    setTiersOpen(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      {/* Fiyat gruplari: tek tekil fiyat + paket (adet + toplam), indirim otomatik */}
      <Card>
        <div className="p-5 pb-4 flex flex-wrap items-center justify-between gap-3 border-b border-surface-100">
          <div>
            <h3 className="text-[15px] font-semibold text-surface-900">Fiyat Gruplari</h3>
            <p className="text-[13px] text-surface-500 mt-0.5">Tekil kit fiyatini ve paket adet/toplam tutarini belirleyin; satis fiyati ve indirim otomatik hesaplanir</p>
          </div>
          <Button variant="outline" size="sm" onClick={openTiersModal}>
            <Pencil className="h-3.5 w-3.5" />
            Duzenle
          </Button>
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-4 p-4 rounded-xl border border-surface-200 bg-surface-50/50">
              <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">Tekil kit (tum kitler icin gecerli)</p>
                <p className="text-lg font-semibold text-surface-900">{formatCurrency(priceTiers.singleKitPrice)} <span className="text-sm font-normal text-surface-500">/ adet</span></p>
              </div>
            </div>
            {priceTiers.bundles.map((b, i) => {
              const perUnit = b.quantity > 0 ? b.total / b.quantity : 0
              const discountPct = priceTiers.singleKitPrice > 0 ? Math.round((1 - perUnit / priceTiers.singleKitPrice) * 100) : 0
              return (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-surface-200 bg-primary-50/50">
                  <div className="h-12 w-12 rounded-xl bg-primary-200 flex items-center justify-center shrink-0">
                    <Layers className="h-6 w-6 text-primary-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">{b.quantity} adet paket</p>
                    <p className="text-lg font-semibold text-surface-900">{formatCurrency(b.total)} <span className="text-sm font-normal text-surface-500">toplam</span></p>
                    <p className="text-xs text-primary-600 mt-0.5">Birim: {formatCurrency(perUnit)} / adet · %{discountPct} indirim</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Modal open={tiersOpen} onOpenChange={setTiersOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Fiyat Gruplarini Duzenle</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <Input
              label="Tekil kit fiyati (TL) — tum kitler icin gecerli"
              type="number"
              min={1}
              value={tiersSingle}
              onChange={(e) => setTiersSingle(e.target.value)}
              leftIcon={<DollarSign className="h-4 w-4" />}
            />
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-surface-700">Paketler (adet + toplam TL)</label>
                <Button type="button" variant="outline" size="sm" onClick={addBundleRow}>
                  <Plus className="h-3.5 w-3.5" />
                  Paket ekle
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tiersBundles.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={2}
                      placeholder="Adet"
                      value={row.quantity}
                      onChange={(e) => updateBundleRow(index, 'quantity', e.target.value)}
                      className="w-24 shrink-0"
                    />
                    <Input
                      type="number"
                      min={1}
                      placeholder="Toplam TL"
                      value={row.total}
                      onChange={(e) => updateBundleRow(index, 'total', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeBundleRow(index)}
                      disabled={tiersBundles.length <= 1}
                      title="Paketi kaldir"
                    >
                      <Trash2 className="h-4 w-4 text-surface-500" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-surface-500 mt-1">Her paket icin adet ve toplam fiyat girin; indirim otomatik hesaplanir.</p>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setTiersOpen(false)}>Iptal</Button>
            <Button onClick={submitTiers}>Kaydet</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
