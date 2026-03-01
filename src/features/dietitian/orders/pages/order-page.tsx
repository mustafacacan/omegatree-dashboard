import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Input, Badge } from '@/components/ui'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { ShoppingCart, Package, Truck, Layers, Check, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'
import { motion } from 'framer-motion'

const W = {
  olive: '#8B9A4B',
  oliveLight: '#EEF2DE',
  orange: '#E8913A',
  orangeLight: '#FDF0E2',
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

export function DietitianOrderPage() {
  const user = useCurrentUser()
  const { priceTiers, getOrderTotal, orders, createDietitianOrder } = useWorkflowStore()
  const [selectedQty, setSelectedQty] = useState<number>(() => priceTiers.bundles[0]?.quantity ?? 1)
  const [address, setAddress] = useState('')

  const myOrders = orders.filter((o) => o.dietitianId === user?.id)

  const qtyNum = selectedQty
  const total = getOrderTotal(qtyNum)
  const tekilToplam = qtyNum * priceTiers.singleKitPrice
  const hasBundleDiscount = qtyNum > 0 && total < tekilToplam
  const effectiveUnitPrice = qtyNum > 0 ? total / qtyNum : priceTiers.singleKitPrice

  const handleSelectPackage = (qty: number) => setSelectedQty(qty)

  const handleCreateOrder = () => {
    if (qtyNum <= 0) {
      toast.error('Yukaridan bir paket secin')
      return
    }
    if (!address.trim()) {
      toast.error('Teslimat adresi gerekli')
      return
    }
    if (!user?.id) {
      toast.error('Kullanici bilgisi bulunamadi')
      return
    }

    const dietitianName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Diyetisyen'
    createDietitianOrder(user.id, dietitianName, qtyNum, dietitianName)
    toast.success(`${qtyNum} adet kit siparisi olusturuldu. Toplam: ${formatCurrency(total)}`)
    setSelectedQty(priceTiers.bundles[0]?.quantity ?? 1)
    setAddress('')
  }

  return (
    <div className="space-y-8 animate-fade-in">
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
              Fiyatlar ve paketler
            </p>
            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: W.text }}>
              Asagidaki paketlerden birini secin; toplu alimda indirim uygulanir. Siparis toplami otomatik hesaplanir.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Fiyat / Paket kartlari — admin tasarimi ile uyumlu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Tekil kit */}
        <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.05 }}>
          <button
            type="button"
            onClick={() => handleSelectPackage(1)}
            className="w-full h-full text-left rounded-2xl border-2 transition-all overflow-hidden"
            style={{
              background: selectedQty === 1 ? W.oliveLight : '#fff',
              borderColor: selectedQty === 1 ? W.olive : W.warmBorder,
              boxShadow: selectedQty === 1 ? '0 0 0 2px rgba(139,154,75,0.25)' : undefined,
            }}
          >
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
                      adet basi
                    </p>
                  </div>
                </div>
                {selectedQty === 1 && <Check className="h-5 w-5 shrink-0" style={{ color: W.olive }} />}
              </div>
            </div>
          </button>
        </motion.div>

        {/* Paketler */}
        {priceTiers.bundles.map((b, i) => {
          const perUnit = b.quantity > 0 ? b.total / b.quantity : 0
          const discountPct = priceTiers.singleKitPrice > 0 ? Math.round((1 - perUnit / priceTiers.singleKitPrice) * 100) : 0
          const isSelected = selectedQty === b.quantity
          return (
            <motion.div key={i} {...fadeUp} transition={{ duration: 0.3, delay: 0.05 + (i + 1) * 0.04 }}>
              <button
                type="button"
                onClick={() => handleSelectPackage(b.quantity)}
                className="w-full h-full text-left rounded-2xl border-2 transition-all overflow-hidden"
                style={{
                  background: isSelected ? W.orangeLight : '#fff',
                  borderColor: isSelected ? W.orange : W.warmBorder,
                  boxShadow: isSelected ? '0 0 0 2px rgba(232,145,58,0.25)' : undefined,
                }}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-4 min-w-0">
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
                    {isSelected && <Check className="h-5 w-5 shrink-0" style={{ color: W.orange }} />}
                  </div>
                </div>
              </button>
            </motion.div>
          )
        })}
      </div>

      {/* Siparis Ver karti */}
      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.1 }}>
        <Card className="overflow-hidden border-0 shadow-sm" style={{ border: `1px solid ${W.warmBorder}`, borderRadius: '1rem' }}>
          <div className="p-5 border-b" style={{ borderColor: W.warmBorder, background: W.oliveLight }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#fff', border: `1px solid ${W.warmBorder}` }}>
                <ShoppingCart className="h-6 w-6" style={{ color: W.olive }} />
              </div>
              <div>
                <h3 className="text-[17px] font-semibold" style={{ color: W.dark }}>Siparis Ver</h3>
                <p className="text-[12px] mt-0.5" style={{ color: W.text }}>
                  Paket secin, teslimat adresini girin ve siparisi tamamlayin
                </p>
              </div>
            </div>
          </div>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Teslimat Adresi"
                placeholder="Klinik adresi"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              <div className="flex flex-col justify-end gap-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleCreateOrder}
                  disabled={qtyNum <= 0 || !address.trim()}
                  style={{ background: W.olive }}
                >
                  <Package className="h-4 w-4" />
                  Siparis Ver — {formatCurrency(total)}
                </Button>
              </div>
            </div>
            <div className="rounded-xl p-4 border" style={{ background: W.cream, borderColor: W.warmBorder }}>
              <div className="flex items-center justify-between text-[13px]">
                <span style={{ color: W.text }}>Secilen: {qtyNum} adet</span>
                <span className="font-semibold" style={{ color: W.dark }}>
                  {formatCurrency(effectiveUnitPrice)}
                  {hasBundleDiscount && <span className="text-[11px] font-normal ml-1" style={{ color: W.olive }}>(paket indirimi)</span>}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px] mt-2 pt-2" style={{ borderTop: `1px solid ${W.warmBorder}` }}>
                <span style={{ color: W.text }}>Toplam</span>
                <span className="font-bold text-lg" style={{ color: W.dark }}>{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Siparis Gecmisi */}
      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.15 }}>
        <Card className="overflow-hidden border-0 shadow-sm" style={{ border: `1px solid ${W.warmBorder}`, borderRadius: '1rem' }}>
          <CardHeader className="pb-3" style={{ borderBottom: `1px solid ${W.creamDark}` }}>
            <CardTitle className="text-[15px] font-semibold" style={{ color: W.dark }}>Siparis Gecmisim</CardTitle>
            <CardDescription className="text-[12px]" style={{ color: W.textLight }}>Onceki siparisleriniz ve durumlari</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            {myOrders.length === 0 ? (
              <div className="text-center py-10" style={{ color: W.textLight }}>
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-[13px]">Henuz siparisiniz yok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-4 rounded-xl border transition-colors"
                    style={{ borderColor: W.warmBorder, background: W.cream }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: order.assignedBarcodes.length > 0 ? W.oliveLight : W.creamDark }}
                      >
                        {order.assignedBarcodes.length > 0 ? (
                          <Truck className="h-5 w-5" style={{ color: W.olive }} />
                        ) : (
                          <Package className="h-5 w-5" style={{ color: W.textLight }} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[13px]" style={{ color: W.dark }}>{order.id}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: W.textLight }}>
                          {order.qty} Kit · {formatDate(order.createdAt)}
                          {order.assignedBarcodes.length > 0 && ` · ${order.assignedBarcodes.length} kit kargoya verildi`}
                          {order.paid ? ` · Odendi ${order.paidAt ? formatDateTime(order.paidAt) : ''}` : ' · Odeme bekleniyor'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[13px] mb-1" style={{ color: W.dark }}>{formatCurrency(order.total)}</p>
                      <div className="flex flex-col gap-1 items-end">
                        {order.paid ? <Badge variant="success" dot>Odendi</Badge> : <Badge variant="warning" dot>Odeme bekleniyor</Badge>}
                        <Badge variant={order.assignedBarcodes.length > 0 ? 'primary' : 'default'} dot>
                          {order.assignedBarcodes.length > 0 ? 'Kargoya Verildi' : 'Beklemede'}
                        </Badge>
                      </div>
                    </div>
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
