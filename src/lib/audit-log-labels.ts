/** Audit log entity / action / alan adları için Türkçe etiketler */

const ENTITY_LABELS: Record<string, string> = {
  USER: 'Kullanıcı',
  User: 'Kullanıcı',
  Auth: 'Kimlik doğrulama',
  Client: 'Danışan',
  Dietician: 'Diyetisyen',
  'DieticianClient': 'Diyetisyen–danışan ilişkisi',
  DieticianClientKit: 'Danışan kiti',
  Laboratory: 'Laboratuvar',
  'Laboratory Kit': 'Laboratuvar kiti',
  'Laboratory-Dietician': 'Laboratuvar–diyetisyen ataması',
  Expert: 'Uzman',
  Kit: 'Kit',
  STOCK: 'Stok',
  Stock: 'Stok',
  Order: 'Sipariş',
  Result: 'Rapor / sonuç',
  SALES_KIT: 'Satış kiti',
  SalesKit: 'Satış kiti',
  DamagedKit: 'Hasarlı kit',
  Address: 'Adres',
  Anamnez: 'Anamnez',
  FoodConsumptionRecord: 'Beslenme kaydı',
  SleepQualityRecord: 'Uyku kaydı',
  System: 'Sistem',
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Oluşturuldu',
  UPDATE: 'Güncellendi',
  DELETE: 'Silindi',
  READ: 'Görüntülendi',
  VERIFY_USER: 'Kullanıcı onaylandı',
  GET_NOT_VERIFIED_USERS: 'Onaysız kullanıcılar listelendi',
  UPDATE_PROFILE: 'Profil güncellendi',
  CREATE_LABORATORY: 'Laboratuvar oluşturuldu',
  UPDATE_LABORATORY: 'Laboratuvar güncellendi',
  DELETE_LABORATORY: 'Laboratuvar silindi',
  CREATE_CLIENT: 'Danışan oluşturuldu',
  UPDATE_DIETICIAN_CHANGED_CLIENT: 'Danışanın diyetisyeni değiştirildi',
  CREATE_DIETICIAN: 'Diyetisyen oluşturuldu',
  ADD_CLIENT_TO_DIETICIAN: 'Danışan diyetisyene eklendi',
  ADD_DIETICIAN_TO_CLIENT: 'Diyetisyen danışana atandı',
  UPDATE_DIETICIAN_CLIENT: 'Diyetisyen–danışan ilişkisi güncellendi',
  REMOVE_DIETICIAN_FROM_CLIENT: 'Diyetisyen danışandan kaldırıldı',
  CREATE_EXPERT: 'Uzman oluşturuldu',
  UPDATE_EXPERT_STATUS: 'Uzman durumu güncellendi',
  CREATE_KIT: 'Kit oluşturuldu',
  UPDATE_KIT: 'Kit güncellendi',
  ASSIGN_KITS_TO_DIETICIAN: 'Kit diyetisyene zimmetlendi',
  CREATE_DIETICIAN_CLIENT_KIT: 'Danışana kit atandı',
  UPDATE_DIETICIAN_CLIENT_KIT: 'Danışan kiti güncellendi',
  DELETE_DIETICIAN_CLIENT_KIT: 'Danışan kiti silindi',
  SEND_KIT_TO_LABORATORY: 'Kit laboratuvara gönderildi',
  UPDATE_LABORATORY_KIT: 'Laboratuvar kiti güncellendi',
  GET_STOCK_BY_USER: 'Stok listelendi',
  APPROVE_TO_DIETICIAN_STOCK: 'Stok diyetisyene onaylandı',
  UPDATE_STOCK_ALERT_LIMIT: 'Stok uyarı limiti güncellendi',
  CREATE_ORDER: 'Sipariş oluşturuldu',
  UPDATE_ORDER_STATUS: 'Sipariş durumu güncellendi',
  ADD_DEKONT: 'Dekont eklendi',
  GET_ORDERS: 'Siparişler listelendi',
  GET_ORDER_BY_ID: 'Sipariş detayı görüntülendi',
  CREATE_SALES_KIT: 'Satış kiti oluşturuldu',
  UPDATE_SALES_KIT: 'Satış kiti güncellendi',
  DELETE_SALES_KIT: 'Satış kiti silindi',
  CREATE_RESULT: 'Rapor oluşturuldu',
  UPDATE_RESULT: 'Rapor güncellendi',
  DELETE_RESULT: 'Rapor silindi',
  APPROVE_RESULT: 'Rapor onaylandı',
  CREATE_DAMAGED_KIT: 'Hasarlı kit kaydı oluşturuldu',
  ASSIGN_REPLACEMENT_KIT: 'Yedek kit atandı',
  ASSIGN_DIETICIAN_TO_LABORATORY: 'Diyetisyen laboratuvara atandı',
  UPDATE_DIETICIAN_ASSIGNMENT: 'Laboratuvar–diyetisyen ataması güncellendi',
  CREATE_OR_REPLACE: 'Kayıt oluşturuldu / güncellendi',
  // Eski / mock etiketler
  USER_APPROVED: 'Kullanıcı onaylandı',
  PRICE_UPDATED: 'Fiyat güncellendi',
  KIT_RECEIVED: 'Kit teslim alındı',
  SAMPLE_ACCEPTED: 'Numune kabul edildi',
  REPORT_SUBMITTED: 'Rapor gönderildi',
  REPORT_APPROVED: 'Rapor onaylandı',
}

const FIELD_LABELS: Record<string, string> = {
  firstName: 'Ad',
  lastName: 'Soyad',
  companyName: 'Kurum adı',
  phone: 'Telefon',
  email: 'E-posta',
  role: 'Rol',
  gender: 'Cinsiyet',
  identityNumber: 'T.C. kimlik no',
  isVerified: 'Onaylı',
  verified: 'Onaylı',
  status: 'Durum',
  password: 'Şifre',
  deleted: 'Silindi',
  addedClientId: 'Eklenen danışan',
  approvedBarcodes: 'Onaylanan barkodlar',
  cargofirm: 'Kargo firması',
  cargoFirm: 'Kargo firması',
  cargoNumber: 'Kargo numarası',
  addressId: 'Adres',
  isActive: 'Aktif',
  vkn: 'VKN',
  barcode: 'Barkod',
  name: 'Ad',
  quantity: 'Miktar',
  price: 'Fiyat',
  totalPrice: 'Toplam tutar',
  orderNumber: 'Sipariş no',
  dieticianId: 'Diyetisyen',
  clientId: 'Danışan',
  kitId: 'Kit',
  userId: 'Kullanıcı',
  entityId: 'Kayıt no',
  stockAlertLimit: 'Stok uyarı limiti',
  description: 'Açıklama',
  notes: 'Not',
  createdAt: 'Oluşturulma',
  updatedAt: 'Güncellenme',
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  dietician: 'Diyetisyen',
  client: 'Danışan',
  laboratory: 'Laboratuvar',
  expert: 'Uzman',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  in_progress: 'Devam ediyor',
  available: 'Stokta',
  used: 'Kullanıldı',
  expired: 'Süresi doldu',
  approval_pending: 'Onay bekliyor',
  in_client: 'Danışanda',
  in_laboratory: 'Laboratuvarda',
  in_expert: 'Uzman değerlendirmesinde',
  delivered: 'Teslim edildi',
  active: 'Aktif',
  passive: 'Pasif',
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Erkek',
  female: 'Kadın',
  other: 'Diğer',
}

function humanizeToken(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return '—'

  if (FIELD_LABELS[trimmed]) return FIELD_LABELS[trimmed]
  if (ACTION_LABELS[trimmed]) return ACTION_LABELS[trimmed]
  if (ENTITY_LABELS[trimmed]) return ENTITY_LABELS[trimmed]

  return trimmed
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatAuditEntityLabel(entity?: string | null): string {
  if (!entity?.trim()) return 'Sistem'
  const key = entity.trim()
  return ENTITY_LABELS[key] ?? humanizeToken(key)
}

export function formatAuditEntity(entity?: string | null, entityId?: number | string | null): string {
  const label = formatAuditEntityLabel(entity)
  if (entityId == null || entityId === '') return label
  return `${label} (Kayıt No: ${entityId})`
}

export function formatAuditAction(action?: string | null): string {
  if (!action?.trim()) return '—'
  const key = action.trim()
  return ACTION_LABELS[key] ?? humanizeToken(key)
}

function formatScalarValue(key: string, value: unknown): string {
  if (value === null) return 'boş'
  if (value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır'

  if (typeof value === 'string') {
    const v = value.trim()
    if (key === 'role' && ROLE_LABELS[v]) return ROLE_LABELS[v]
    if (key === 'status' && STATUS_LABELS[v]) return STATUS_LABELS[v]
    if (key === 'gender' && GENDER_LABELS[v]) return GENDER_LABELS[v]
    if (v === '') return 'boş'
    return v
  }

  if (typeof value === 'number') return String(value)

  if (Array.isArray(value)) {
    if (value.length === 0) return 'boş liste'
    return value.map((item) => formatScalarValue(key, item)).join(', ')
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

function formatFieldKey(key: string): string {
  return FIELD_LABELS[key] ?? humanizeToken(key)
}

function formatChangeEntry(key: string, val: unknown): string {
  const label = formatFieldKey(key)

  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const rec = val as Record<string, unknown>
    if ('oldValue' in rec || 'newValue' in rec) {
      const oldText = formatScalarValue(key, rec.oldValue)
      const newText = formatScalarValue(key, rec.newValue)
      if (rec.oldValue === undefined || rec.oldValue === null) {
        return `${label}: ${newText}`
      }
      return `${label}: ${oldText} → ${newText}`
    }
  }

  if (key === 'deleted' && val === true) return 'Kayıt silindi'
  if (key === 'addedClientId') return `Danışan eklendi (No: ${formatScalarValue(key, val)})`
  if (key === 'approvedBarcodes') return `Onaylanan barkod: ${formatScalarValue(key, val)}`

  return `${label}: ${formatScalarValue(key, val)}`
}

export function formatAuditDetails(data: unknown, legacyDetails?: string | null): string {
  if (legacyDetails && String(legacyDetails).trim()) return String(legacyDetails).trim()
  if (!data || typeof data !== 'object') return '—'

  const entries = Object.entries(data as Record<string, unknown>)
  if (entries.length === 0) return '—'

  const parts = entries.slice(0, 4).map(([key, val]) => formatChangeEntry(key, val))
  const suffix = entries.length > 4 ? ` (+${entries.length - 4} alan daha)` : ''
  return parts.join(' · ') + suffix
}

export function formatAuditDataLines(data: unknown): string[] {
  if (!data || typeof data !== 'object') return []
  return Object.entries(data as Record<string, unknown>).map(([key, val]) => formatChangeEntry(key, val))
}

export function getAuditActionBadgeVariant(
  action?: string | null,
): 'success' | 'info' | 'warning' | 'primary' | 'default' {
  const a = (action ?? '').toUpperCase()
  if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('CANCEL')) return 'warning'
  if (a.includes('CREATE') || a.includes('ADD') || a.includes('ASSIGN') || a.includes('APPROVE')) return 'success'
  if (a.includes('UPDATE') || a.includes('VERIFY')) return 'info'
  if (a.includes('READ') || a.includes('GET_')) return 'default'
  return 'primary'
}
