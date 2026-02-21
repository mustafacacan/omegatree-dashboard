import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Input, Badge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ShoppingCart, Package, Truck, Layers, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'

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
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      {/* Fiyatlar / Paketler — Admin paneldeki gibi */}
      <Card>
        <div className="p-5 pb-4 border-b border-surface-100">
          <h3 className="text-[15px] font-semibold text-surface-900">Fiyatlar ve Paketler</h3>
          <p className="text-[13px] text-surface-500 mt-0.5">Asagidaki paketlerden birini secin; siparis toplami otomatik hesaplanir</p>
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Tekil kit */}
            <button
              type="button"
              onClick={() => handleSelectPackage(1)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                selectedQty === 1
                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                  : 'border-surface-200 bg-surface-50/50 hover:border-primary-200 hover:bg-primary-50/30'
              }`}
            >
              <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">Tekil kit</p>
                <p className="text-lg font-semibold text-surface-900">{formatCurrency(priceTiers.singleKitPrice)} <span className="text-sm font-normal text-surface-500">/ adet</span></p>
                <p className="text-xs text-surface-500 mt-0.5">1 adet</p>
              </div>
              {selectedQty === 1 && <Check className="h-5 w-5 text-primary-600 shrink-0" />}
            </button>
            {/* Paketler */}
            {priceTiers.bundles.map((b, i) => {
              const perUnit = b.quantity > 0 ? b.total / b.quantity : 0
              const discountPct = priceTiers.singleKitPrice > 0 ? Math.round((1 - perUnit / priceTiers.singleKitPrice) * 100) : 0
              const isSelected = selectedQty === b.quantity
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectPackage(b.quantity)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-surface-200 bg-primary-50/50 hover:border-primary-200 hover:bg-primary-100/50'
                  }`}
                >
                  <div className="h-12 w-12 rounded-xl bg-primary-200 flex items-center justify-center shrink-0">
                    <Layers className="h-6 w-6 text-primary-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-surface-500 uppercase tracking-wider">{b.quantity} adet paket</p>
                    <p className="text-lg font-semibold text-surface-900">{formatCurrency(b.total)} <span className="text-sm font-normal text-surface-500">toplam</span></p>
                    <p className="text-xs text-primary-600 mt-0.5">Birim: {formatCurrency(perUnit)} · %{discountPct} indirim</p>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-primary-600 shrink-0" />}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* New Order Card */}
      <Card className="overflow-hidden border-surface-200">
        <div className="p-6 border-b border-surface-200 bg-primary-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white border border-primary-200 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900">Siparis Ver</h3>
          </div>
          <p className="text-surface-600 text-sm">Yukaridan bir paket secin, teslimat adresini yazin ve siparisi tamamlayin</p>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Teslimat Adresi"
              placeholder="Klinik adresi"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleCreateOrder}
                disabled={qtyNum <= 0 || !address.trim()}
              >
                <Package className="h-4 w-4" />
                Siparis Ver - {formatCurrency(total)}
              </Button>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-surface-50 border border-surface-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-600">Secilen: {qtyNum} adet</span>
              <span className="font-semibold text-surface-800">
                {formatCurrency(effectiveUnitPrice)}
                {hasBundleDiscount && <span className="text-primary-600 text-xs ml-1">(paket indirimi)</span>}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-surface-600">Toplam:</span>
              <span className="font-bold text-lg text-primary-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle>Siparis Gecmisim</CardTitle>
          <CardDescription>Onceki siparisleriniz ve durumlari</CardDescription>
        </CardHeader>
        <CardContent>
          {myOrders.length === 0 ? (
            <div className="text-center py-10 text-surface-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-surface-300" />
              <p>Henuz siparisiniz yok</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-surface-200 hover:border-primary-200 hover:bg-primary-50/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-surface-100 flex items-center justify-center">
                      {order.assignedBarcodes.length > 0 ? (
                        <Truck className="h-5 w-5 text-primary-600" />
                      ) : (
                        <Package className="h-5 w-5 text-surface-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-surface-800">{order.id}</p>
                      <p className="text-xs text-surface-400">
                        {order.qty} Kit · {formatDate(order.createdAt)}
                        {order.assignedBarcodes.length > 0 && ` · ${order.assignedBarcodes.length} kit kargoya verildi`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-surface-800 mb-1">{formatCurrency(order.total)}</p>
                    <Badge variant={order.assignedBarcodes.length > 0 ? 'primary' : 'warning'} dot>
                      {order.assignedBarcodes.length > 0 ? 'Kargoya Verildi' : 'Beklemede'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
