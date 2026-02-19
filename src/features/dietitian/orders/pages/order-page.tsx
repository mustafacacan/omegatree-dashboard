import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, Button, Input, Badge } from '@/components/ui'
import { formatCurrency, formatDate } from '@/lib/utils'
import { OrderStatus, ORDER_STATUS_LABELS } from '@/utils/constants'
import { ShoppingCart, Package, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCurrentUser } from '@/stores/auth.store'

const statusVariant: Record<OrderStatus, 'warning' | 'info' | 'primary' | 'success' | 'danger'> = {
  [OrderStatus.PENDING]: 'warning',
  [OrderStatus.PAID]: 'info',
  [OrderStatus.SHIPPED]: 'primary',
  [OrderStatus.DELIVERED]: 'success',
  [OrderStatus.CANCELLED]: 'danger',
}

export function DietitianOrderPage() {
  const user = useCurrentUser()
  const { kitPrice, orders, createDietitianOrder } = useWorkflowStore()
  const [qty, setQty] = useState('5')
  const [address, setAddress] = useState('')

  const myOrders = orders.filter((o) => o.dietitianId === user?.id)

  const qtyNum = Number(qty) || 0
  const total = qtyNum * kitPrice

  const handleCreateOrder = () => {
    if (qtyNum <= 0) {
      toast.error('Gecerli bir adet girin')
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
    setQty('5')
    setAddress('')
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader />

      {/* New Order Card */}
      <Card className="overflow-hidden border-surface-200">
        <div className="p-6 border-b border-surface-200 bg-primary-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white border border-primary-200 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-primary-600" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900">Yeni Siparis</h3>
          </div>
          <p className="text-surface-600 text-sm">Ihtiyaciniz kadar kit siparis verin, odeme sonrasi kargoya verilir</p>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input 
              label="Adet" 
              type="number" 
              placeholder="Kac adet kit?" 
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              min="1"
            />
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
              <span className="text-surface-600">Birim Fiyat:</span>
              <span className="font-semibold text-surface-800">{formatCurrency(kitPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-surface-600">Toplam ({qtyNum} adet):</span>
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
