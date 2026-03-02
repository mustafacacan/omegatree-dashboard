import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'
import { KitStatus } from '@/utils/constants'

export interface AuditLogEntry {
  id: string
  user: string
  action: string
  entity: string
  entityId: string
  details: string
  ip: string
  timestamp: string
}

export interface WorkflowKit {
  barcode: string
  status: KitStatus
  location: string
  createdAt: string
  printed: boolean
  batch: string
  price: number
  linkedKit?: {
    kitId: string
    kitName: string
    linkedAt: string
    linkedBy: string
  }
  assignedDietitianId?: string
  assignedDietitianName?: string
  assignedClientId?: string
  assignedClientName?: string
  trackingNo?: string
  damagePhotoUrl?: string
  analysisProgress?: number
  reportStatus?: 'NONE' | 'SPECIALIST_POOL' | 'SPECIALIST_DRAFT' | 'ADMIN_APPROVAL' | 'APPROVED'
  returnRequest?: {
    reason: string
    photoUrl?: string
    requestedAt: string
    requestedBy: string
    status: 'PENDING' | 'APPROVED'
    approvedAt?: string
    approvedBy?: string
  }
  /** Lab numune reddi – döküman şart: fotoğraf zorunlu */
  rejectPhotoUrl?: string
  /** Uzmanin yazdigi rapor icerigi (onaya gonderildiginde saklanir) */
  reportContent?: ReportContent
}

export interface ReportContent {
  generalEvaluation?: string
  nutritionAdvice?: string
  supplementAdvice?: string
  pdfUrl?: string
  submittedAt?: string
}

export interface DietitianOrder {
  id: string
  dietitianId: string
  dietitianName: string
  qty: number
  total: number
  paid: boolean
  paidAt?: string
  createdAt: string
  assignedBarcodes: string[]
}

export interface CariPayment {
  id: string
  dietitianId: string
  dietitianName: string
  amount: number
  date: string
  note?: string
  createdAt: string
  createdBy: string
}

export interface PriceBundle {
  /** Paket kac adet */
  quantity: number
  /** Paket toplam fiyat (TL, indirimli) */
  total: number
}

export interface PriceTiers {
  /** Tekil kit birim fiyati (TL) - tum kitler icin gecerli */
  singleKitPrice: number
  /** Birden fazla paket tanimi (ornek: 5 adet=7000 TL, 10 adet=13000 TL) */
  bundles: PriceBundle[]
}

interface WorkflowState {
  kitPrice: number
  priceTiers: PriceTiers
  kits: WorkflowKit[]
  orders: DietitianOrder[]
  payments: CariPayment[]
  auditLogs: AuditLogEntry[]
  markOrderPaid: (orderId: string, actor: string, ip?: string) => { ok: boolean; message: string }
  addCariPayment: (dietitianId: string, dietitianName: string, amount: number, note: string, actor: string, ip?: string) => void
  setKitPrice: (price: number, actor: string, ip?: string) => void
  setPricingTiers: (singleKitPrice: number, bundles: PriceBundle[], actor: string, ip?: string) => void
  getOrderTotal: (qty: number) => number
  updateKitPrice: (barcode: string, price: number, actor: string, ip?: string) => { ok: boolean; message: string }
  assignBarcodeToKit: (
    barcode: string,
    kitId: string,
    kitName: string,
    actor: string,
    ip?: string
  ) => { ok: boolean; message: string }
  generateBarcodes: (quantity: number, prefix: string, actor: string, ip?: string) => void
  markKitPrinted: (barcode: string, actor: string, ip?: string) => { ok: boolean; message: string }
  markKitsPrinted: (barcodes: string[], actor: string, ip?: string) => { ok: boolean; message: string; printedCount: number }
  createDietitianOrder: (dietitianId: string, dietitianName: string, qty: number, actor: string, ip?: string, options?: { total?: number }) => void
  assignKitsToDietitian: (dietitianId: string, dietitianName: string, barcodes: string[], actor: string, ip?: string, orderId?: string) => void
  receiveKitByBarcode: (
    barcode: string,
    dietitianId: string,
    dietitianName: string,
    options?: { damaged?: boolean; damagePhotoUrl?: string; actor?: string; ip?: string }
  ) => { ok: boolean; message: string }
  receiveKitByClient: (
    barcode: string,
    clientId: string,
    clientName: string,
    options?: { damaged?: boolean; damagePhotoUrl?: string; actor?: string; ip?: string }
  ) => { ok: boolean; message: string }
  assignKitToClient: (barcode: string, dietitianId: string, clientId: string, clientName: string, actor: string, ip?: string) => { ok: boolean; message: string }
  markSampleSent: (barcode: string, dietitianId: string, actor: string, ip?: string) => void
  markSampleSentByClient: (barcode: string, clientId: string, clientName: string, actor?: string, ip?: string) => { ok: boolean; message: string }
  labAcceptSample: (barcode: string, actor: string, ip?: string) => void
  labRejectSample: (barcode: string, reason: string, actor: string, ip?: string, rejectPhotoUrl?: string) => { ok: boolean; message: string }
  labCompleteAnalysis: (barcode: string, actor: string, ip?: string) => void
  specialistSubmitReport: (barcode: string, actor: string, ip?: string, reportContent?: ReportContent) => void
  adminApproveReport: (barcode: string, actor: string, ip?: string) => void
  requestKitReturn: (
    barcode: string,
    dietitianId: string,
    reason: string,
    actor: string,
    options?: { photoUrl?: string; ip?: string }
  ) => { ok: boolean; message: string }
  adminApproveReturn: (barcode: string, actor: string, ip?: string) => { ok: boolean; message: string }
  adminRejectReturn: (barcode: string, actor: string, ip?: string) => { ok: boolean; message: string }
  /** Hasarlı kit onaylandıktan sonra telafi kiti atandığında, hasarlı kitin diyetisyen bilgisini temizler */
  markDamagedCompensationAssigned: (damagedBarcode: string, actor: string, ip?: string) => void
}

const nowIso = () => new Date().toISOString()
const defaultIp = (ip?: string) => ip || '127.0.0.1'

const seedKits: WorkflowKit[] = [
  { barcode: 'OT-2025-00158', status: KitStatus.IN_STOCK, location: 'Ana Depo', createdAt: '2025-06-18T09:20:00.000Z', printed: false, batch: 'BATCH-2025-06', price: 1450, reportStatus: 'NONE' },
  { barcode: 'OT-2025-00157', status: KitStatus.IN_STOCK, location: 'Ana Depo', createdAt: '2025-06-18T09:10:00.000Z', printed: false, batch: 'BATCH-2025-06', price: 1500, reportStatus: 'NONE' },
  { barcode: 'OT-2025-00156', status: KitStatus.ASSIGNED, location: 'Kargoda', createdAt: '2025-06-17T15:10:00.000Z', printed: true, batch: 'BATCH-2025-06', price: 1500, assignedDietitianId: 'u-dietitian-1', assignedDietitianName: 'Ayse Yilmaz', trackingNo: 'YK-456789', reportStatus: 'NONE' },
  { barcode: 'OT-2025-00155', status: KitStatus.DELIVERED, location: 'Diyetisyen Stok', createdAt: '2025-06-17T11:35:00.000Z', printed: true, batch: 'BATCH-2025-06', price: 1525, assignedDietitianId: 'u-dietitian-1', assignedDietitianName: 'Ayse Yilmaz', reportStatus: 'NONE' },
  { barcode: 'OT-2025-00154', status: KitStatus.RETURN_REQUESTED, location: 'Iade Talebi', createdAt: '2025-06-16T10:45:00.000Z', printed: true, batch: 'BATCH-2025-06', price: 1490, assignedDietitianId: 'u-dietitian-1', assignedDietitianName: 'Ayse Yilmaz', reportStatus: 'NONE', returnRequest: { reason: 'Kargo kutusu ezik geldi, ic ambalaj acilmis.', requestedAt: '2025-06-19T08:40:00.000Z', requestedBy: 'Ayse Yilmaz', status: 'PENDING' } },
  { barcode: 'OT-2025-00153', status: KitStatus.SAMPLE_SENT, location: 'Laboratuvar Havuzu', createdAt: '2025-06-15T14:10:00.000Z', printed: true, batch: 'BATCH-2025-06', price: 1500, assignedDietitianId: 'u-dietitian-1', assignedDietitianName: 'Ayse Yilmaz', assignedClientId: '20250601002', assignedClientName: 'Selin Kara', reportStatus: 'NONE' },
  { barcode: 'OT-2025-00152', status: KitStatus.IN_ANALYSIS, location: 'Laboratuvar Analiz', createdAt: '2025-06-14T09:50:00.000Z', printed: true, batch: 'BATCH-2025-06', price: 1500, analysisProgress: 55, reportStatus: 'NONE' },
  { barcode: 'OT-2025-00151', status: KitStatus.ANALYSIS_COMPLETE, location: 'Uzman Havuzu', createdAt: '2025-06-13T10:20:00.000Z', printed: true, batch: 'BATCH-2025-06', price: 1500, analysisProgress: 100, reportStatus: 'SPECIALIST_POOL' },
  { barcode: 'OT-2025-00150', status: KitStatus.ADMIN_APPROVAL, location: 'Admin Onayi', createdAt: '2025-06-12T16:00:00.000Z', printed: true, batch: 'BATCH-2025-06', price: 1500, reportStatus: 'ADMIN_APPROVAL', assignedDietitianId: 'u-dietitian-1', assignedDietitianName: 'Ayse Yilmaz', assignedClientId: 'u-danisan-1', assignedClientName: 'Ahmet Yildiz', reportContent: { generalEvaluation: 'Omega-3 indeksi referans araligin altinda (4.2%). EPA ve DHA duzeyleri dengelenmeli. Yag asidi profili genel saglik acisindan iyilestirilebilir.', nutritionAdvice: 'Haftada en az 2 porsiyon yagli balik (somon, uskumru, sardalya) onerilir. Ceviz, keten tohumu ve chia tohumu gunluk beslenmeye eklenebilir. Zeytinyagi ana yag kaynagi olarak kullanilabilir.', supplementAdvice: 'Gunluk 1000–2000 mg balik yagi (EPA+DHA birlikte) takviyesi 3 ay sureyle onerilir. Sonrasinda kan tahlili ile tekrar degerlendirme yapilacaktir.', submittedAt: '2025-06-12T14:00:00.000Z' } },
  { barcode: 'OT-2025-00149', status: KitStatus.COMPLETED, location: 'Arsiv', createdAt: '2025-06-11T12:30:00.000Z', printed: true, batch: 'BATCH-2025-06', price: 1550, reportStatus: 'APPROVED', assignedDietitianId: 'u-dietitian-1', assignedDietitianName: 'Ayse Yilmaz', assignedClientId: 'u-danisan-1', assignedClientName: 'Ahmet Yildiz', reportContent: { generalEvaluation: 'Omega-3 Index sonucu 5.8% olup hedef aralik (8% uzeri) altindadir. EPA (1.9%) ve DHA (3.9%) birlikte degerlendirildiginde yagli balik tuketimi ve gerekirse takviye ile artirilabilir. AA/EPA orani yuksek; omega-6/omega-3 dengeye getirilmelidir.', nutritionAdvice: 'Haftada 2–3 porsiyon yagli balik (ozellikle vahsi somon, uskumru). Gunluk 1–2 yemek kasigi ground keten veya chia. Ceviz, badem gibi yagli tohumlar atistirmalik olarak. Islenmis ve omega-6 zengin yaglar sinirlandirilmalidir.', supplementAdvice: 'Kaliteli balik yagi takviyesi: gunluk 1500–2000 mg EPA+DHA, yemekle birlikte. 12 hafta sonra kontrol tahlili onerilir.', submittedAt: '2025-06-11T18:00:00.000Z' } },
  { barcode: 'OT-2025-00148', status: KitStatus.COMPLETED, location: 'Arsiv', createdAt: '2025-06-08T10:00:00.000Z', printed: true, batch: 'BATCH-2025-06', price: 1550, reportStatus: 'APPROVED', assignedDietitianId: 'u-dietitian-1', assignedDietitianName: 'Ayse Yilmaz', assignedClientId: '20250601002', assignedClientName: 'Selin Kara', reportContent: { generalEvaluation: 'Omega-3 Index 7.1% ile hedefe yakin; iyilestirme ile optimal araliga (8%+) cikarilabilir. DHA duzeyi iyi, EPA hafif dusuk. Genel yag asidi profili saglikli beslenme ile desteklenebilir.', nutritionAdvice: 'Mevcut balik tuketimi surdurun; haftada bir porsiyon daha eklenebilir. Yemeklerde zeytinyagi kullanimi uygun. Kuruyemis (ceviz, badem) gunluk 1 avuc. Trans yag iceren urunlerden kacinin.', supplementAdvice: 'Istege bagli dusuk doz balik yagi (500–1000 mg EPA+DHA) ozellikle balik yemediginiz gunler. 6 ay sonra tekrar tahlil onerilir.', submittedAt: '2025-06-09T11:30:00.000Z' } },
]

const seedOrders: DietitianOrder[] = [
  {
    id: 'ord-seed-1',
    dietitianId: 'u-dietitian-1',
    dietitianName: 'Ayse Yilmaz',
    qty: 5,
    total: 7500,
    paid: true,
    createdAt: '2025-06-10T09:00:00.000Z',
    assignedBarcodes: ['OT-2025-00156', 'OT-2025-00155'],
  },
]

function appendLog(logs: AuditLogEntry[], partial: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry[] {
  return [
    {
      id: generateId('log-'),
      timestamp: nowIso(),
      ...partial,
    },
    ...logs,
  ]
}

const defaultPriceTiers: PriceTiers = {
  singleKitPrice: 1500,
  bundles: [{ quantity: 5, total: 7000 }],
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      kitPrice: 1500,
      priceTiers: defaultPriceTiers,
      kits: seedKits,
      orders: [],
      payments: [],
      auditLogs: [],

      setKitPrice: (price, actor, ip) =>
        set((state) => ({
          kitPrice: price,
          priceTiers: { ...state.priceTiers, singleKitPrice: price },
          kits: state.kits.map((k) => ({ ...k, price })),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'PRICE_UPDATED',
            entity: 'Pricing',
            entityId: 'KIT-PRICE',
            details: `Kit fiyati ${price} TL olarak guncellendi`,
            ip: defaultIp(ip),
          }),
        })),

      setPricingTiers: (singleKitPrice, bundles, actor, ip) =>
        set((state) => ({
          kitPrice: singleKitPrice,
          priceTiers: { singleKitPrice, bundles: bundles.filter((b) => b.quantity >= 2 && b.total > 0) },
          kits: state.kits.map((k) => ({ ...k, price: singleKitPrice })),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'PRICING_TIERS_UPDATED',
            entity: 'Pricing',
            entityId: 'TIERS',
            details: `Fiyat gruplari guncellendi: tekil ${singleKitPrice} TL, ${bundles.length} paket`,
            ip: defaultIp(ip),
          }),
        })),

      getOrderTotal: (qty) => {
        const { priceTiers } = get()
        const { singleKitPrice, bundles } = priceTiers
        if (qty <= 0) return 0
        const dp: number[] = [0]
        for (let q = 1; q <= qty; q++) {
          let best = singleKitPrice + dp[q - 1]
          for (const b of bundles) {
            if (b.quantity > 0 && b.total > 0 && q >= b.quantity) {
              const candidate = b.total + (dp[q - b.quantity] ?? 0)
              if (candidate < best) best = candidate
            }
          }
          dp[q] = best
        }
        return dp[qty]
      },

      updateKitPrice: (barcode, price, actor, ip) => {
        if (!Number.isFinite(price) || price <= 0) {
          return { ok: false, message: 'Gecerli bir fiyat girin.' }
        }

        const target = get().kits.find((k) => k.barcode === barcode)
        if (!target) return { ok: false, message: 'Kit bulunamadi.' }

        set((state) => ({
          kits: state.kits.map((k) => (k.barcode === barcode ? { ...k, price } : k)),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'KIT_PRICE_UPDATED',
            entity: 'Kit',
            entityId: barcode,
            details: `${barcode} kit fiyati ${price} TL olarak guncellendi`,
            ip: defaultIp(ip),
          }),
        }))

        return { ok: true, message: 'Kit fiyati guncellendi.' }
      },

      assignBarcodeToKit: (barcode, kitId, kitName, actor, ip) => {
        const normalizedKitId = kitId.trim().toUpperCase()
        const normalizedKitName = kitName.trim()
        if (!normalizedKitId || !normalizedKitName) {
          return { ok: false, message: 'Kit ID ve kit adi zorunludur.' }
        }

        const target = get().kits.find((k) => k.barcode === barcode)
        if (!target) return { ok: false, message: 'Barkod bulunamadi.' }

        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? {
                  ...k,
                  linkedKit: {
                    kitId: normalizedKitId,
                    kitName: normalizedKitName,
                    linkedAt: nowIso(),
                    linkedBy: actor,
                  },
                }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'BARCODE_LINKED_TO_KIT',
            entity: 'Kit',
            entityId: barcode,
            details: `${barcode} barkodu ${normalizedKitId} (${normalizedKitName}) kitine baglandi`,
            ip: defaultIp(ip),
          }),
        }))

        return { ok: true, message: 'Barkod kite basariyla atandi.' }
      },

      generateBarcodes: (quantity, prefix, actor, ip) =>
        set((state) => {
          const currentYear = new Date().getFullYear()
          const existingNumbers = state.kits
            .map((k) => {
              const parts = k.barcode.split('-')
              return Number(parts[parts.length - 1]) || 0
            })
            .sort((a, b) => b - a)
          const start = existingNumbers[0] || 0

          const created: WorkflowKit[] = Array.from({ length: Math.max(0, quantity) }).map((_, idx) => {
            const n = String(start + idx + 1).padStart(5, '0')
            return {
              barcode: `${prefix}-${currentYear}-${n}`,
              status: KitStatus.IN_STOCK,
              location: 'Ana Depo',
              createdAt: nowIso(),
              printed: false,
              batch: `BATCH-${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
              price: state.kitPrice,
              reportStatus: 'NONE',
            }
          })

          return {
            kits: [...created, ...state.kits],
            auditLogs: appendLog(state.auditLogs, {
              user: actor,
              action: 'BARCODE_GENERATED',
              entity: 'Kit',
              entityId: created[0]?.barcode ?? 'N/A',
              details: `${created.length} adet barkod uretildi`,
              ip: defaultIp(ip),
            }),
          }
        }),

      markKitPrinted: (barcode, actor, ip) => {
        const target = get().kits.find((k) => k.barcode === barcode)
        if (!target) return { ok: false, message: 'Barkod bulunamadi.' }
        if (target.printed) return { ok: false, message: 'Bu barkod zaten basildi.' }

        set((state) => ({
          kits: state.kits.map((k) => (k.barcode === barcode ? { ...k, printed: true } : k)),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'BARCODE_PRINTED',
            entity: 'Kit',
            entityId: barcode,
            details: `${barcode} barkodu basildi`,
            ip: defaultIp(ip),
          }),
        }))

        return { ok: true, message: 'Barkod yazdirildi.' }
      },

      markKitsPrinted: (barcodes, actor, ip) => {
        const uniqueBarcodes = Array.from(new Set(barcodes))
        if (uniqueBarcodes.length === 0) {
          return { ok: false, message: 'Yazdirilacak barkod secilmedi.', printedCount: 0 }
        }

        const state = get()
        const printable = state.kits.filter((k) => uniqueBarcodes.includes(k.barcode) && !k.printed)
        if (printable.length === 0) {
          return { ok: false, message: 'Secilen barkodlar zaten basili.', printedCount: 0 }
        }
        const printableSet = new Set(printable.map((k) => k.barcode))

        set((prev) => ({
          kits: prev.kits.map((k) => (printableSet.has(k.barcode) ? { ...k, printed: true } : k)),
          auditLogs: appendLog(prev.auditLogs, {
            user: actor,
            action: 'BARCODE_BULK_PRINTED',
            entity: 'Kit',
            entityId: printable.map((k) => k.barcode).join(','),
            details: `${printable.length} barkod toplu yazdirildi`,
            ip: defaultIp(ip),
          }),
        }))

        return { ok: true, message: `${printable.length} barkod yazdirildi.`, printedCount: printable.length }
      },

      createDietitianOrder: (dietitianId, dietitianName, qty, actor, ip, options) =>
        set((state) => {
          const total = options?.total != null && Number.isFinite(options.total) ? options.total : get().getOrderTotal(qty)
          const order: DietitianOrder = {
            id: generateId('ord-'),
            dietitianId,
            dietitianName,
            qty,
            total,
            paid: false,
            createdAt: nowIso(),
            assignedBarcodes: [],
          }
          return {
            orders: [order, ...state.orders],
            auditLogs: appendLog(state.auditLogs, {
              user: actor,
              action: 'ORDER_CREATED',
              entity: 'Order',
              entityId: order.id,
              details: `${dietitianName} icin ${qty} kit siparisi olusturuldu — ${total} TL (odeme bekleniyor)`,
              ip: defaultIp(ip),
            }),
          }
        }),

      markOrderPaid: (orderId, actor, ip) => {
        const order = get().orders.find((o) => o.id === orderId)
        if (!order) return { ok: false, message: 'Siparis bulunamadi.' }
        if (order.paid) return { ok: false, message: 'Siparis zaten odendi.' }
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, paid: true, paidAt: nowIso() } : o
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'ORDER_PAID',
            entity: 'Order',
            entityId: orderId,
            details: `${order.dietitianName} siparisi odendi: ${order.total} TL`,
            ip: defaultIp(ip),
          }),
        }))
        return { ok: true, message: 'Siparis odendi olarak isaretlendi.' }
      },

      addCariPayment: (dietitianId, dietitianName, amount, note, actor, ip) =>
        set((state) => {
          const payment: CariPayment = {
            id: generateId('pay-'),
            dietitianId,
            dietitianName,
            amount,
            date: nowIso().slice(0, 10),
            note,
            createdAt: nowIso(),
            createdBy: actor,
          }
          return {
            payments: [payment, ...state.payments],
            auditLogs: appendLog(state.auditLogs, {
              user: actor,
              action: 'CARI_PAYMENT',
              entity: 'Cari',
              entityId: payment.id,
              details: `${dietitianName} icin ${amount} TL odeme kaydedildi${note ? `: ${note}` : ''}`,
              ip: defaultIp(ip),
            }),
          }
        }),

      assignKitsToDietitian: (dietitianId, dietitianName, barcodes, actor, ip, orderId) =>
        set((state) => {
          // Kitleri güncelle (kargo entegrasyonu yok, trackingNo kullanilmiyor)
          const updatedKits = state.kits.map((k) =>
            barcodes.includes(k.barcode)
              ? {
                  ...k,
                  status: KitStatus.ASSIGNED,
                  location: 'Zimmetlendi',
                  assignedDietitianId: dietitianId,
                  assignedDietitianName: dietitianName,
                  trackingNo: undefined,
                }
              : k
          )

          // Eğer sipariş ID verilmişse, siparişin assignedBarcodes array'ini güncelle
          let updatedOrders = state.orders
          if (orderId) {
            updatedOrders = state.orders.map((order) =>
              order.id === orderId
                ? {
                    ...order,
                    assignedBarcodes: [...new Set([...order.assignedBarcodes, ...barcodes])],
                  }
                : order
            )
          }

          return {
            kits: updatedKits,
            orders: updatedOrders,
            auditLogs: appendLog(state.auditLogs, {
              user: actor,
              action: 'KIT_ASSIGNED_TO_DIETITIAN',
              entity: orderId ? 'Order' : 'Kit',
              entityId: orderId || barcodes.join(','),
              details: orderId
                ? `${barcodes.length} kit ${dietitianName} adina zimmetlendi ve siparis ${orderId} ile eslestirildi`
                : `${barcodes.length} kit ${dietitianName} adina zimmetlendi`,
              ip: defaultIp(ip),
            }),
          }
        }),

      receiveKitByBarcode: (barcode, dietitianId, dietitianName, options) => {
        const target = get().kits.find((k) => k.barcode === barcode)
        if (!target) return { ok: false, message: 'Barkod bulunamadi.' }
        if (target.assignedDietitianId !== dietitianId) {
          return { ok: false, message: 'Bu barkod sizin adiniza zimmetli degil.' }
        }
        if (target.status !== KitStatus.ASSIGNED) {
          return { ok: false, message: 'Bu kit teslim alma asamasinda degil.' }
        }

        const damaged = Boolean(options?.damaged)
        const actor = options?.actor || dietitianName
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? {
                  ...k,
                  status: damaged ? KitStatus.DAMAGED : KitStatus.DELIVERED,
                  location: damaged ? 'Hasar Incelemede' : 'Diyetisyen Stok',
                  assignedDietitianName: dietitianName,
                  damagePhotoUrl: options?.damagePhotoUrl,
                }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: damaged ? 'KIT_DAMAGED_REPORTED' : 'KIT_RECEIVED',
            entity: 'Kit',
            entityId: barcode,
            details: damaged
              ? `${barcode} icin hasar bildirimi yapildi`
              : `${barcode} teslim alinarak diyetisyen stoguna eklendi`,
            ip: defaultIp(options?.ip),
          }),
        }))

        return { ok: true, message: damaged ? 'Hasar bildirimi alindi.' : 'Kit stoga eklendi.' }
      },

      assignKitToClient: (barcode, dietitianId, clientId, clientName, actor, ip) => {
        const target = get().kits.find((k) => k.barcode === barcode)
        if (!target) {
          return { ok: false, message: 'Barkod bulunamadi.' }
        }
        if (target.assignedDietitianId !== dietitianId) {
          return { ok: false, message: 'Bu kit sizin stogunuzda degil.' }
        }
        if (target.status !== KitStatus.DELIVERED) {
          return { ok: false, message: 'Bu kit stokta degil. Once teslim alinmalidir.' }
        }
        if (target.assignedClientId) {
          return { ok: false, message: 'Bu kit zaten bir danisana atanmis.' }
        }

        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? { ...k, assignedClientId: clientId, assignedClientName: clientName }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'KIT_ASSIGNED_TO_CLIENT',
            entity: 'Kit',
            entityId: barcode,
            details: `${barcode} barkodlu kit ${clientName} ile eslestirildi`,
            ip: defaultIp(ip),
          }),
        }))

        return { ok: true, message: 'Kit danisana atandi.' }
      },

      receiveKitByClient: (barcode, clientId, clientName, options) => {
        const target = get().kits.find((k) => k.barcode === barcode)
        if (!target) return { ok: false, message: 'Barkod bulunamadi.' }
        if (target.assignedClientId !== clientId) {
          return { ok: false, message: 'Bu barkod size atanmamis.' }
        }
        if (target.status === KitStatus.CLIENT_RECEIVED || target.status === KitStatus.SAMPLE_SENT) {
          return { ok: false, message: 'Bu kit zaten teslim alinmis.' }
        }

        const damaged = Boolean(options?.damaged)
        const actor = options?.actor || clientName
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? {
                  ...k,
                  status: damaged ? KitStatus.DAMAGED : KitStatus.CLIENT_RECEIVED,
                  location: damaged ? 'Hasar Incelemede' : 'Danisan',
                  damagePhotoUrl: options?.damagePhotoUrl,
                }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: damaged ? 'KIT_DAMAGED_BY_CLIENT' : 'KIT_RECEIVED_BY_CLIENT',
            entity: 'Kit',
            entityId: barcode,
            details: damaged
              ? `${barcode} icin danisan tarafindan hasar bildirimi yapildi`
              : `${barcode} danisan ${clientName} tarafindan teslim alindi`,
            ip: defaultIp(options?.ip),
          }),
        }))

        return { ok: true, message: damaged ? 'Hasar bildirimi alindi.' : 'Kit teslim alindi.' }
      },

      markSampleSent: (barcode, dietitianId, actor, ip) =>
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode && k.assignedDietitianId === dietitianId
              ? { ...k, status: KitStatus.SAMPLE_SENT, location: 'Laboratuvar Havuzu' }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'SAMPLE_SENT',
            entity: 'Kit',
            entityId: barcode,
            details: `${barcode} icin numune laboratuvara gonderildi`,
            ip: defaultIp(ip),
          }),
        })),

      markSampleSentByClient: (barcode, clientId, clientName, actor, ip) => {
        const target = get().kits.find((k) => k.barcode === barcode)
        if (!target) return { ok: false, message: 'Barkod bulunamadi.' }
        if (target.assignedClientId !== clientId) return { ok: false, message: 'Bu kit size atanmamis.' }
        if (target.status !== KitStatus.CLIENT_RECEIVED) {
          return { ok: false, message: 'Numune ancak kit teslim alindiktan sonra gonderildi olarak isaretlenebilir.' }
        }
        const who = actor || clientName
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode && k.assignedClientId === clientId
              ? { ...k, status: KitStatus.SAMPLE_SENT, location: 'Laboratuvar Havuzu' }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: who,
            action: 'SAMPLE_SENT_BY_CLIENT',
            entity: 'Kit',
            entityId: barcode,
            details: `${barcode} numunesi danisan ${clientName} tarafindan laboratuvara gonderildi olarak isaretlendi`,
            ip: defaultIp(ip),
          }),
        }))
        return { ok: true, message: 'Numune gonderildi olarak isaretlendi.' }
      },

      labAcceptSample: (barcode, actor, ip) =>
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode ? { ...k, status: KitStatus.IN_ANALYSIS, location: 'Laboratuvar Analiz', analysisProgress: 10 } : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'SAMPLE_ACCEPTED',
            entity: 'Sample',
            entityId: barcode,
            details: `${barcode} numunesi kabul edildi`,
            ip: defaultIp(ip),
          }),
        })),

      labRejectSample: (barcode, reason, actor, ip, rejectPhotoUrl) => {
        if (!rejectPhotoUrl?.trim()) return { ok: false, message: 'Numune reddi icin fotoğraf yuklemeniz zorunludur.' }
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? { ...k, status: KitStatus.REJECTED, location: 'Numune Reddedildi', rejectPhotoUrl }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'SAMPLE_REJECTED',
            entity: 'Sample',
            entityId: barcode,
            details: `${barcode} reddedildi: ${reason}`,
            ip: defaultIp(ip),
          }),
        }))
        return { ok: true, message: 'Numune reddedildi.' }
      },

      labCompleteAnalysis: (barcode, actor, ip) =>
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? { ...k, status: KitStatus.ANALYSIS_COMPLETE, location: 'Uzman Havuzu', analysisProgress: 100, reportStatus: 'SPECIALIST_POOL' }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'ANALYSIS_COMPLETED',
            entity: 'Analysis',
            entityId: barcode,
            details: `${barcode} analizi tamamlandi, uzman havuzuna aktarildi`,
            ip: defaultIp(ip),
          }),
        })),

      specialistSubmitReport: (barcode, actor, ip, reportContent) =>
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? {
                  ...k,
                  status: KitStatus.ADMIN_APPROVAL,
                  location: 'Admin Onayi',
                  reportStatus: 'ADMIN_APPROVAL',
                  ...(reportContent && {
                    reportContent: {
                      ...reportContent,
                      submittedAt: new Date().toISOString(),
                    },
                  }),
                }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'REPORT_SUBMITTED',
            entity: 'Report',
            entityId: barcode,
            details: `${barcode} raporu admin onayina gonderildi`,
            ip: defaultIp(ip),
          }),
        })),

      adminApproveReport: (barcode, actor, ip) =>
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? { ...k, status: KitStatus.COMPLETED, location: 'Arsiv', reportStatus: 'APPROVED' }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'REPORT_APPROVED',
            entity: 'Report',
            entityId: barcode,
            details: `${barcode} raporu onaylandi ve sonuclandirildi`,
            ip: defaultIp(ip),
          }),
        })),

      requestKitReturn: (barcode, dietitianId, reason, actor, options) => {
        const trimmedReason = reason.trim()
        if (!trimmedReason) return { ok: false, message: 'Iade nedeni zorunludur.' }
        if (!options?.photoUrl) return { ok: false, message: 'Hasar bildirimi icin fotoğraf yuklemeniz zorunludur.' }

        const target = get().kits.find((k) => k.barcode === barcode)
        if (!target) return { ok: false, message: 'Kit bulunamadi.' }
        if (target.assignedDietitianId !== dietitianId) {
          return { ok: false, message: 'Bu kit sizin adiniza zimmetli degil.' }
        }
        if (target.status !== KitStatus.DELIVERED) {
          return { ok: false, message: 'Yalnizca teslim alinmis kitler icin iade talebi acilabilir.' }
        }

        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? {
                  ...k,
                  status: KitStatus.RETURN_REQUESTED,
                  location: 'Iade Talebi',
                  returnRequest: {
                    reason: trimmedReason,
                    photoUrl: options?.photoUrl,
                    requestedAt: nowIso(),
                    requestedBy: actor,
                    status: 'PENDING',
                  },
                }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'RETURN_REQUESTED',
            entity: 'Kit',
            entityId: barcode,
            details: `${barcode} icin iade talebi acildi: ${trimmedReason}`,
            ip: defaultIp(options?.ip),
          }),
        }))

        return { ok: true, message: 'Iade talebi admine iletildi.' }
      },

      adminApproveReturn: (barcode, actor, ip) => {
        const target = get().kits.find((k) => k.barcode === barcode)
        if (!target) return { ok: false, message: 'Kit bulunamadi.' }
        if (target.status !== KitStatus.RETURN_REQUESTED) {
          return { ok: false, message: 'Bu kit icin bekleyen iade talebi yok.' }
        }

        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? {
                  ...k,
                  status: KitStatus.DAMAGED,
                  location: 'Hasarlı – telafi kiti atanacak',
                  assignedClientId: undefined,
                  assignedClientName: undefined,
                  trackingNo: undefined,
                  returnRequest: k.returnRequest
                    ? {
                        ...k.returnRequest,
                        status: 'APPROVED',
                        approvedAt: nowIso(),
                        approvedBy: actor,
                      }
                    : undefined,
                  // Diyetisyen bilgisi tutulur; admin telafi kiti atayacak
                }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'RETURN_APPROVED',
            entity: 'Kit',
            entityId: barcode,
            details: `${barcode} iade talebi onaylandi; kit hasarli olarak isaretlendi (yeniden gönderilmez)`,
            ip: defaultIp(ip),
          }),
        }))

        return { ok: true, message: 'Iade kabul edildi. Kit hasarli olarak isaretlendi ve yeniden gönderilmeyecek.' }
      },

      adminRejectReturn: (barcode, actor, ip) => {
        const target = get().kits.find((k) => k.barcode === barcode)
        if (!target) return { ok: false, message: 'Kit bulunamadi.' }
        if (target.status !== KitStatus.RETURN_REQUESTED) {
          return { ok: false, message: 'Bu kit icin bekleyen iade talebi yok.' }
        }
        const dietitianName = target.assignedDietitianName || 'Bilinmiyor'
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === barcode
              ? {
                  ...k,
                  status: KitStatus.DELIVERED,
                  location: 'Diyetisyen Stok',
                  returnRequest: undefined,
                }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'RETURN_REJECTED',
            entity: 'Kit',
            entityId: barcode,
            details: `${barcode} iade talebi reddedildi (${dietitianName})`,
            ip: defaultIp(ip),
          }),
        }))
        return { ok: true, message: 'Iade talebi reddedildi.' }
      },

      markDamagedCompensationAssigned: (damagedBarcode, actor, ip) =>
        set((state) => ({
          kits: state.kits.map((k) =>
            k.barcode === damagedBarcode && k.status === KitStatus.DAMAGED
              ? { ...k, assignedDietitianId: undefined, assignedDietitianName: undefined, location: 'Hasarlı (telafi atandı)' }
              : k
          ),
          auditLogs: appendLog(state.auditLogs, {
            user: actor,
            action: 'DAMAGED_COMPENSATION_ASSIGNED',
            entity: 'Kit',
            entityId: damagedBarcode,
            details: `${damagedBarcode} hasarli kit icin telafi kiti atandi`,
            ip: defaultIp(ip),
          }),
        })),
    }),
    {
      name: 'omegatree-workflow',
      version: 7,
      migrate: (persisted: unknown, storedVersion: number) => {
        const p = persisted as { kitPrice?: number; priceTiers?: PriceTiers; kits?: WorkflowKit[]; orders?: DietitianOrder[]; payments?: unknown[]; auditLogs?: AuditLogEntry[] }
        const tiers = p?.priceTiers
        let priceTiers: PriceTiers = defaultPriceTiers
        if (tiers) {
          const old = tiers as { bundles?: PriceBundle[]; singleKitPrice?: number; bundle5Total?: number; bundleTotal?: number; bundleQuantity?: number }
          if (Array.isArray(old.bundles) && old.bundles.length > 0) {
            priceTiers = { singleKitPrice: tiers.singleKitPrice ?? 1500, bundles: old.bundles }
          } else {
            const qty = old.bundleQuantity && old.bundleQuantity > 0 ? old.bundleQuantity : 5
            const total = old.bundleTotal && old.bundleTotal > 0 ? old.bundleTotal : (old.bundle5Total ?? 7000)
            priceTiers = { singleKitPrice: tiers.singleKitPrice ?? 1500, bundles: [{ quantity: qty, total }] }
          }
        }
        // v7: tum panellerde mock rapor/kit verisi icin guncel seed zorla yuklensin (diyetisyen, uzman, admin, danisan)
        const useSeedKits = storedVersion < 7
        return {
          kitPrice: p?.kitPrice ?? 1500,
          priceTiers,
          kits: useSeedKits ? seedKits : (p?.kits ?? seedKits),
          orders: p?.orders ?? seedOrders,
          payments: p?.payments ?? [],
          auditLogs: p?.auditLogs ?? [],
        }
      },
      partialize: (s) => ({ kitPrice: s.kitPrice, priceTiers: s.priceTiers, kits: s.kits, orders: s.orders, payments: s.payments, auditLogs: s.auditLogs }),
    }
  )
)
