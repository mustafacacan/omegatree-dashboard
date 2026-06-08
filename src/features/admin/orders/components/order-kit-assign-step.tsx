import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDate } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api-error'
import { Search, Check, Package } from 'lucide-react'
import { toast } from 'sonner'
import { getStocks, type Stock } from '@/services/stocks.service'
import { assignKitsToDietician as assignKitsToDieticianApi, getDieticians, type DieticianOption } from '@/services/kits.service'
import { useWorkflowStore } from '@/stores/workflow.store'

const ORDERS_QUERY_KEY = ['orders'] as const

export interface OrderKitAssignFooterState {
  canAssign: boolean
  isAssigning: boolean
  selectedCount: number
}

export interface OrderKitAssignStepHandle {
  submitAssign: () => void
}

export interface OrderKitAssignStepProps {
  /** Siparişi veren kullanıcının User.id (diyetisyen hesabı) */
  orderUserId: number | undefined
  /** Workflow store’da assignKitsToDietitian için görünen isim */
  orderClientName: string
  /** Bu sipariş için hâlâ atanabilecek kit adedi (sipariş qty − zaten atanan) */
  remainingSlots: number
  /** Zimmetlenecek toplam fiziksel kit adedi (Order.quantity × salesKit.quantity). */
  totalKitsOrdered: number
  /** Sipariş satırındaki paket adedi (Order.quantity). */
  orderedPackageCount: number
  workflowOrderId: string
  onAssigned: (info: { nowComplete: boolean; addedCount: number }) => void
  /** Modal alt çubuğundaki Zimmetle butonu için durum (siparişler sayfası) */
  onAssignFooterState?: (state: OrderKitAssignFooterState) => void
}

function dietitianInitials(d: DieticianOption): string {
  const initialsFromName = [d.firstName?.[0], d.lastName?.[0]].filter(Boolean).join('')
  if (initialsFromName) return initialsFromName.toUpperCase()
  return (d.label || '')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * Seçim sınırları: kalan zimmet hakkı ve siparişteki toplam fiziksel kit hedefi (store’daki qty).
 */
function computeSelectionBounds(
  remainingSlots: number,
  totalKitsOrdered: number,
): { minSelectable: number; maxSelectable: number } {
  const rem = Math.max(0, Math.floor(remainingSlots))
  const total = Math.max(0, Math.floor(totalKitsOrdered))

  if (rem <= 0) return { minSelectable: 0, maxSelectable: 0 }

  const maxSelectable = total > 0 ? Math.min(rem, total) : rem

  return {
    minSelectable: maxSelectable > 0 ? 1 : 0,
    maxSelectable,
  }
}

/**
 * Stok sayfasındaki “Kit Zimmetle” akışıyla aynı API.
 * Seçim stok satırı (Stock.id) ile yapılır — aynı kitId birden fazla satırda olsa bile çoklu seçim çalışır.
 */
export const OrderKitAssignStep = forwardRef<OrderKitAssignStepHandle, OrderKitAssignStepProps>(function OrderKitAssignStep(
  {
    orderUserId,
    orderClientName,
    remainingSlots,
    totalKitsOrdered,
    orderedPackageCount,
    workflowOrderId,
    onAssigned,
    onAssignFooterState,
  },
  ref,
) {
  const queryClient = useQueryClient()
  const assignKitsToDietitianStore = useWorkflowStore((s) => s.assignKitsToDietitian)

  const [assignKitSearch, setAssignKitSearch] = useState('')
  const [assignDietitianSearch, setAssignDietitianSearch] = useState('')
  const [selectedStockIds, setSelectedStockIds] = useState<number[]>([])
  const [selectedDietitianId, setSelectedDietitianId] = useState<number | null>(null)

  const { minSelectable, maxSelectable } = useMemo(
    () => computeSelectionBounds(remainingSlots, totalKitsOrdered),
    [remainingSlots, totalKitsOrdered],
  )

  const { data: stocksRes, isLoading: stocksLoading } = useQuery({
    queryKey: ['stocks', 'order-assign', workflowOrderId],
    queryFn: () => getStocks({ page: 1, limit: 200, sort: 'desc' }),
    enabled: remainingSlots > 0,
  })

  const { data: dietitiansList = [], isLoading: dietitiansLoading } = useQuery({
    queryKey: ['dieticians', 'order-assign'],
    queryFn: () => getDieticians(),
    enabled: remainingSlots > 0,
  })

  const assignModalLoading = stocksLoading || dietitiansLoading

  const availableStocks = useMemo(() => {
    const rows = stocksRes?.data ?? []
    return rows.filter((s) => s.status === 'available' && s.kitId?.id)
  }, [stocksRes?.data])

  const filteredKits = useMemo(() => {
    const q = assignKitSearch.trim().toLowerCase()
    if (!q) return availableStocks
    return availableStocks.filter((s) => {
      const barcode = s.kitId?.barcode ?? ''
      const name = s.kitId?.name ?? ''
      return barcode.toLowerCase().includes(q) || name.toLowerCase().includes(q)
    })
  }, [availableStocks, assignKitSearch])

  /** Bu sipariş akışında yalnızca siparişi veren diyetisyen seçilebilir */
  const orderDietitians = useMemo(() => {
    if (orderUserId == null || !Number.isFinite(orderUserId)) return []
    return dietitiansList.filter((d) => d.userId === orderUserId)
  }, [dietitiansList, orderUserId])

  const filteredDietitians = useMemo(() => {
    const q = assignDietitianSearch.trim().toLowerCase()
    if (!q) return orderDietitians
    return orderDietitians.filter((d) => d.label.toLowerCase().includes(q))
  }, [orderDietitians, assignDietitianSearch])

  useEffect(() => {
    setSelectedStockIds([])
  }, [workflowOrderId, remainingSlots])

  useEffect(() => {
    if (orderUserId == null || !Number.isFinite(orderUserId)) return
    const match = orderDietitians[0] ?? dietitiansList.find((d) => d.userId === orderUserId)
    if (match) setSelectedDietitianId(match.id)
  }, [orderUserId, orderDietitians, dietitiansList])

  const toggleStock = (stockId: number) => {
    setSelectedStockIds((prev) => {
      if (prev.includes(stockId)) return prev.filter((id) => id !== stockId)
      if (prev.length >= maxSelectable) return prev
      return [...prev, stockId]
    })
  }

  const kitIdsForApi = (stocks: Stock[]) =>
    [...new Set(
      selectedStockIds
        .map((sid) => stocks.find((s) => s.id === sid)?.kitId?.id)
        .filter((id): id is number => typeof id === 'number' && id > 0),
    )]

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (selectedDietitianId == null) {
        throw new Error('Diyetisyen seçin')
      }
      const stocks: Stock[] = stocksRes?.data ?? []
      const n = selectedStockIds.length
      if (n < minSelectable || n > maxSelectable) {
        throw new Error(`En az ${minSelectable}, en fazla ${maxSelectable} kit seçin (${orderedPackageCount} paket · toplam ${totalKitsOrdered} kit, kalan: ${remainingSlots}).`)
      }
      const kitIds = kitIdsForApi(stocks)
      if (kitIds.length !== n) {
        throw new Error('Seçimde aynı kit kimliği birden fazla; yalnızca farklı kitler seçilebilir.')
      }
      return assignKitsToDieticianApi(selectedDietitianId, kitIds)
    },
    onSuccess: () => {
      const stocks: Stock[] = stocksRes?.data ?? []
      const barcodes = selectedStockIds
        .map((sid) => stocks.find((s) => s.id === sid)?.kitId?.barcode)
        .filter((b): b is string => typeof b === 'string' && b.length > 0)

      if (orderUserId != null) {
        assignKitsToDietitianStore(
          String(orderUserId),
          orderClientName,
          barcodes,
          'Admin',
          undefined,
          workflowOrderId,
        )
      }

      const addedCount = barcodes.length
      setSelectedStockIds([])
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['stocks'] })

      const order = useWorkflowStore.getState().orders.find((o) => o.id === workflowOrderId)
      const nowComplete = order ? order.assignedBarcodes.length >= order.qty : false

      toast.success(
        nowComplete
          ? `${addedCount} kit atandı. Tüm adetler tamamlandı.`
          : `${addedCount} kit diyetisyene zimmetlendi.`,
      )
      onAssigned({ nowComplete, addedCount })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : ''
      if (msg) toast.error(msg)
      else toast.error(getApiErrorMessage(err, { fallback: 'Kit ataması yapılamadı.' }))
    },
  })

  const nSel = selectedStockIds.length
  const selectionValid =
    remainingSlots > 0 &&
    nSel >= minSelectable &&
    nSel <= maxSelectable &&
    maxSelectable > 0

  useImperativeHandle(
    ref,
    () => ({
      submitAssign: () => assignMutation.mutate(),
    }),
    [assignMutation],
  )

  useEffect(() => {
    onAssignFooterState?.({
      canAssign: selectionValid && selectedDietitianId != null && !assignMutation.isPending,
      isAssigning: assignMutation.isPending,
      selectedCount: nSel,
    })
  }, [onAssignFooterState, selectionValid, selectedDietitianId, assignMutation.isPending, nSel])

  if (remainingSlots <= 0) {
    return (
      <p className="text-sm text-surface-600">
        Bu sipariş için atanacak kit kalmadı. “Tamamla&apos;ya geç” ile devam edebilirsiniz.
      </p>
    )
  }

  const validationHint =
    maxSelectable > 0
      ? `En az ${minSelectable}, en fazla ${maxSelectable} kit seçin (${orderedPackageCount} paket · toplam ${totalKitsOrdered} kit, atanabilir kalan: ${remainingSlots}).`
      : null

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-600">
        Admin stoğundan kit seçip siparişi veren diyetisyene zimmetleyin.
        {' '}
        {orderUserId != null && orderDietitians.length > 0 && (
          <span className="text-surface-500">Diyetisyen bu sipariş için sabitlendi.</span>
        )}
      </p>
      {validationHint && (
        <p className="text-[12px] rounded-lg border border-primary-200 bg-primary-50/80 dark:bg-primary-900/20 dark:border-primary-800 px-3 py-2 text-primary-900 dark:text-primary-100">
          {validationHint}
        </p>
      )}
      {nSel > 0 && (nSel < minSelectable || nSel > maxSelectable) && (
        <p className="text-[12px] text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/25 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          Seçim geçersiz: {nSel} adet seçili; {minSelectable}–{maxSelectable} aralığında olmalı.
        </p>
      )}

      <div className="flex flex-col md:flex-row gap-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white bg-primary-500">
              1
            </div>
            <span className="text-[13px] font-semibold text-surface-900">Stoktan kit seçin</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-200/80 dark:bg-surface-700/50 text-surface-700 dark:text-surface-200">
              {nSel} / {maxSelectable}
            </span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
            <input
              type="text"
              placeholder="Barkod veya kit adı ara..."
              value={assignKitSearch}
              onChange={(e) => setAssignKitSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-full outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
            />
          </div>
          <div className="max-h-[240px] overflow-y-auto space-y-1.5 pr-1 rounded-xl border border-surface-200 bg-surface-50/50">
            {assignModalLoading ? (
              <p className="text-[12px] text-center py-4 text-surface-500">Yükleniyor...</p>
            ) : filteredKits.length === 0 ? (
              <div className="p-6 text-center text-surface-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-surface-300" />
                <p className="text-sm">Stokta uygun kit yok</p>
              </div>
            ) : (
              filteredKits.map((s) => {
                const selected = selectedStockIds.includes(s.id)
                const atLimit = !selected && selectedStockIds.length >= maxSelectable
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={atLimit}
                    onClick={() => toggleStock(s.id)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all disabled:opacity-50 ${
                      selected
                        ? 'bg-primary-100 dark:bg-primary-900/40 border border-primary-500'
                        : 'bg-surface-50 dark:bg-surface-200/30 border border-transparent'
                    }`}
                  >
                    <div
                      className={`h-5 w-5 rounded-md flex items-center justify-center shrink-0 ${
                        selected ? 'bg-primary-500 border border-primary-500' : 'bg-panel border border-surface-200'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <code className="text-[12px] font-mono font-bold text-surface-900">{s.kitId?.barcode ?? '—'}</code>
                      {s.kitId?.name && (
                        <span className="text-[10px] block mt-0.5 text-surface-500 truncate">{s.kitId.name}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-surface-500 shrink-0">{formatDate(s.createdAt)}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <div
              className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${
                selectedStockIds.length > 0 ? 'bg-primary-500' : 'bg-surface-400'
              }`}
            >
              2
            </div>
            <span className="text-[13px] font-semibold text-surface-900">Diyetisyen</span>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-surface-400" />
            <input
              type="text"
              placeholder="Diyetisyen ara..."
              value={assignDietitianSearch}
              onChange={(e) => setAssignDietitianSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-[12px] rounded-xl w-full outline-none transition-colors bg-panel border border-surface-200 text-surface-900 focus:border-primary-500"
            />
          </div>
          <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1 rounded-xl border border-surface-200 bg-surface-50/50">
            {assignModalLoading ? (
              <p className="text-[12px] text-center py-4 text-surface-500">Yükleniyor...</p>
            ) : filteredDietitians.length === 0 ? (
              <p className="text-[12px] text-center py-4 text-surface-500">
                {orderUserId != null && dietitiansList.length > 0
                  ? 'Sipariş sahibi diyetisyen listede yok; /dieticians yanıtını kontrol edin.'
                  : 'Diyetisyen bulunamadı'}
              </p>
            ) : (
              filteredDietitians.map((d) => {
                const sel = selectedDietitianId === d.id
                const fullName = [d.firstName, d.lastName].filter(Boolean).join(' ')
                const primaryText = fullName || d.label
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDietitianId(d.id)}
                    className={`flex items-center gap-3 w-full p-3 rounded-xl text-left transition-all ${
                      sel
                        ? 'bg-orange-100 dark:bg-orange-900/30 border border-orange-400'
                        : 'bg-surface-50 dark:bg-surface-200/30 border border-transparent'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                        sel ? 'bg-orange-500 text-white' : 'bg-surface-200 dark:bg-surface-300 text-surface-700'
                      }`}
                    >
                      {dietitianInitials(d)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-surface-900 truncate">{primaryText}</p>
                      <p className="text-[10px] mt-0.5 text-surface-500 truncate">{d.email ?? `Diyetisyen #${d.id}`}</p>
                    </div>
                    {sel && <Check className="h-4 w-4 text-orange-500 shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-surface-500">
        Zimmetleme sonrası kitler diyetisyende onay bekler; teslimatta barkod ile stoklarına eklerler.
      </p>
    </div>
  )
})

OrderKitAssignStep.displayName = 'OrderKitAssignStep'
