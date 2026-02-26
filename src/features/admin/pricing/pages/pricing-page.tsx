import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card,
  Button, Input,
  Modal, ModalContent, ModalHeader, ModalTitle, ModalBody, ModalFooter,
} from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Pencil, Package, Layers, Plus, Trash2, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore, type PriceBundle } from '@/stores/workflow.store'
import { motion } from 'framer-motion'

const W = {
  olive: '#8B9A4B',
  oliveLight: '#EEF2DE',
  orange: '#E8913A',
  orangeLight: '#FDF0E2',
  amber: '#F5C842',
  amberLight: '#FDF8E8',
  green: '#6ABF69',
  greenLight: '#E8F5E8',
  cream: '#F9F7F3',
  creamDark: '#F0EDE7',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
  warmGrayLight: '#B5AFA5',
}

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } }

export function PricingPage() {
  const { priceTiers, setPricingTiers } = useWorkflowStore()
  const [singleEditOpen, setSingleEditOpen] = useState(false)
  const [singleEditValue, setSingleEditValue] = useState('')
  const [bundlesOpen, setBundlesOpen] = useState(false)
  const [tiersBundles, setTiersBundles] = useState<{ quantity: string; total: string }[]>([])

  const openSingleEditModal = () => {
    setSingleEditValue(String(priceTiers.singleKitPrice))
    setSingleEditOpen(true)
  }

  const openBundlesModal = () => {
    setTiersBundles(
      priceTiers.bundles.length > 0
        ? priceTiers.bundles.map((b) => ({ quantity: String(b.quantity), total: String(b.total) }))
        : [{ quantity: '', total: '' }]
    )
    setBundlesOpen(true)
  }

  const addBundleRow = () => setTiersBundles((prev) => [...prev, { quantity: '', total: '' }])
  const removeBundleRow = (index: number) =>
    setTiersBundles((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  const updateBundleRow = (index: number, field: 'quantity' | 'total', value: string) =>
    setTiersBundles((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))

  const submitSinglePrice = () => {
    const single = Number(singleEditValue)
    if (!Number.isFinite(single) || single <= 0) {
      toast.error('Tekil kit fiyati gecerli bir sayi olmali.')
      return
    }
    setPricingTiers(single, priceTiers.bundles, 'Admin')
    toast.success('Tekil fiyat guncellendi.')
    setSingleEditOpen(false)
  }

  const submitBundles = () => {
    const single = priceTiers.singleKitPrice
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
    toast.success('Paketler guncellendi.')
    setBundlesOpen(false)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      {/* Aciklama */}
      <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
        <div
          className="rounded-2xl p-4 flex items-start gap-3 border"
          style={{ background: W.cream, borderColor: W.warmBorder }}
        >
          <Info className="h-5 w-5 shrink-0 mt-0.5" style={{ color: W.olive }} />
          <div>
            <p className="text-[13px] font-medium" style={{ color: W.dark }}>
              Nasil calisir?
            </p>
            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: W.text }}>
              <strong>Tekil fiyat:</strong> Diyetisyen 1 kit siparis ettiginde odenen birim fiyat.
              <br />
              <strong>Paket:</strong> Toplu alimda (ornegin 5 kit) diyetisyen toplam bir tutar oder; sistem otomatik indirim uygular. Her paket icin &quot;Kac adet?&quot; ve &quot;Bu adet icin toplam kac TL?&quot; giriyorsunuz.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Kartlar: Tekil + Paketler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Tekil kit kartı — düzenleme alanı */}
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.05 }}>
          <Card className="overflow-hidden border-0 shadow-sm h-full" style={{ border: `1px solid ${W.warmBorder}`, borderRadius: '1rem' }}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4 min-w-0">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: W.oliveLight }}
                  >
                    <Package className="h-7 w-7" style={{ color: W.olive }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: W.textLight }}>
                      Tekil satis (1 kit)
                    </p>
                    <p className="text-[20px] font-bold mt-1" style={{ color: W.dark }}>
                      {formatCurrency(priceTiers.singleKitPrice)}
                    </p>
                    <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>
                      adet basi — tum siparislerde gecerli
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={openSingleEditModal} className="shrink-0">
                  <Pencil className="h-3.5 w-3.5" />
                  Duzenle
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Paket kartları — paketleri düzenle butonu ilk kartın üstünde veya ayrı satırda */}
        {priceTiers.bundles.map((b, i) => {
          const perUnit = b.quantity > 0 ? b.total / b.quantity : 0
          const discountPct = priceTiers.singleKitPrice > 0 ? Math.round((1 - perUnit / priceTiers.singleKitPrice) * 100) : 0
          return (
            <motion.div key={i} {...fadeUp} transition={{ duration: 0.3, delay: 0.05 + (i + 1) * 0.04 }}>
              <Card className="overflow-hidden border-0 shadow-sm h-full" style={{ border: `1px solid ${W.warmBorder}`, borderRadius: '1rem' }}>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div
                      className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ background: W.orangeLight }}
                    >
                      <Layers className="h-7 w-7" style={{ color: W.orange }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: W.textLight }}>
                        {b.quantity} kit paketi
                      </p>
                      <p className="text-[20px] font-bold mt-1" style={{ color: W.dark }}>
                        {formatCurrency(b.total)}
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: W.textLight }}>
                        toplam · birim {formatCurrency(perUnit)}
                      </p>
                      <span
                        className="inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                        style={{ background: W.greenLight, color: '#3D8B3D' }}
                      >
                        %{discountPct} indirim
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Paketleri düzenle butonu */}
      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.1 }}>
        <Button variant="outline" size="sm" onClick={openBundlesModal}>
          <Layers className="h-3.5 w-3.5" />
          Paketleri duzenle
        </Button>
      </motion.div>

      {/* Modal: Tekil fiyat düzenleme */}
      <Modal open={singleEditOpen} onOpenChange={setSingleEditOpen}>
        <ModalContent className="max-w-sm">
          <ModalHeader>
            <ModalTitle>Tekil kit fiyatini duzenle</ModalTitle>
            <p className="text-[13px] mt-1" style={{ color: W.textLight }}>
              Diyetisyen 1 adet kit siparis ettiginde odenen tutar (TL).
            </p>
          </ModalHeader>
          <ModalBody>
            <Input
              type="number"
              min={1}
              value={singleEditValue}
              onChange={(e) => setSingleEditValue(e.target.value)}
              placeholder="Ornek: 1500"
              leftIcon={<DollarSign className="h-4 w-4" />}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setSingleEditOpen(false)}>Iptal</Button>
            <Button onClick={submitSinglePrice}>Kaydet</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal: Paketler düzenleme */}
      <Modal open={bundlesOpen} onOpenChange={setBundlesOpen}>
        <ModalContent className="max-w-lg">
          <ModalHeader>
            <ModalTitle>Indirimli paketleri duzenle</ModalTitle>
            <p className="text-[13px] mt-1" style={{ color: W.textLight }}>
              Kac adet kit icin toplam kac TL? Indirim tekil fiyata gore otomatik hesaplanir.
            </p>
            <div className="mt-2 px-3 py-2 rounded-xl" style={{ background: W.cream, border: `1px solid ${W.warmBorder}` }}>
              <p className="text-[12px]" style={{ color: W.text }}>
                <strong>Tekil fiyat (referans):</strong> {formatCurrency(priceTiers.singleKitPrice)} / adet — degistirmek icin tekil karttaki Duzenle kullanin.
              </p>
            </div>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-[13px] font-semibold" style={{ color: W.dark }}>
                Paketler (adet + toplam TL)
              </label>
              <Button type="button" variant="outline" size="sm" onClick={addBundleRow}>
                <Plus className="h-3.5 w-3.5" />
                Yeni paket ekle
              </Button>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {tiersBundles.map((row, index) => {
                const qty = Math.floor(Number(row.quantity))
                const totalNum = Number(row.total)
                const singleNum = priceTiers.singleKitPrice
                const perUnit = qty >= 2 && totalNum > 0 ? totalNum / qty : 0
                const discount = singleNum > 0 && perUnit > 0 && perUnit < singleNum
                  ? Math.round((1 - perUnit / singleNum) * 100)
                  : null
                return (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ background: W.cream, borderColor: W.warmBorder }}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[12px] font-medium whitespace-nowrap" style={{ color: W.text }}>Adet</span>
                      <Input
                        type="number"
                        min={2}
                        placeholder="5"
                        value={row.quantity}
                        onChange={(e) => updateBundleRow(index, 'quantity', e.target.value)}
                        className="w-20"
                      />
                    </div>
                    <span className="text-surface-400">=</span>
                    <div className="flex-1 min-w-0">
                      <Input
                        type="number"
                        min={1}
                        placeholder="Toplam TL (ornek: 7000)"
                        value={row.total}
                        onChange={(e) => updateBundleRow(index, 'total', e.target.value)}
                      />
                    </div>
                    {perUnit > 0 && discount != null && (
                      <span className="text-[11px] font-medium shrink-0" style={{ color: W.olive }}>
                        {formatCurrency(perUnit)}/adet · %{discount} indirim
                      </span>
                    )}
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
                )
              })}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setBundlesOpen(false)}>Iptal</Button>
            <Button onClick={submitBundles}>Kaydet</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
