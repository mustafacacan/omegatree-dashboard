import { UserRole } from '@/utils/constants'

/** Tarayicida gorunen Turkce URL yollari (ornek: /giris, /yonetici/kullanicilar) */
export const ROUTES = {
  GIRIS: '/giris',
  KAYIT: '/kayit',
  SIFREMI_UNUTTUM: '/sifremi-unuttum',
  KVKK_ONAY: '/kvkk-onay',
  ONAY_BEKLIYOR: '/onay-bekliyor',

  YONETICI: '/yonetici',
  YONETICI_PROFIL: '/yonetici/profil',
  YONETICI_AYARLAR: '/yonetici/ayarlar',
  YONETICI_BILDIRIMLER: '/yonetici/bildirimler',
  YONETICI_KULLANICILAR: '/yonetici/kullanicilar',
  YONETICI_URETIM: '/yonetici/uretim',
  YONETICI_FIYATLANDIRMA: '/yonetici/fiyatlandirma',
  YONETICI_STOK: '/yonetici/stok',
  YONETICI_IADELER: '/yonetici/iadeler',
  YONETICI_SIPARISLER: '/yonetici/siparisler',
  YONETICI_LABORATUVARLAR: '/yonetici/laboratuvarlar',
  YONETICI_DIYETISYENLER: '/yonetici/diyetisyenler',
  YONETICI_DANISANLAR: '/yonetici/danisanlar',
  YONETICI_UZMANLAR: '/yonetici/uzmanlar',
  YONETICI_RAPORLAR: '/yonetici/raporlar',

  DIYETISYEN: '/diyetisyen',
  DIYETISYEN_PROFIL: '/diyetisyen/profil',
  DIYETISYEN_AYARLAR: '/diyetisyen/ayarlar',
  DIYETISYEN_BILDIRIMLER: '/diyetisyen/bildirimler',
  DIYETISYEN_DANISANLAR: '/diyetisyen/danisanlar',
  DIYETISYEN_DANISANLAR_YENI: '/diyetisyen/danisanlar/yeni',
  DIYETISYEN_KITLER: '/diyetisyen/kitler',
  DIYETISYEN_STOK: '/diyetisyen/stok',
  DIYETISYEN_IADE_KITLER: '/diyetisyen/iade-kitler',
  DIYETISYEN_SIPARISLER: '/diyetisyen/siparisler',
  DIYETISYEN_SIPARIS_GECMISI: '/diyetisyen/siparisler/gecmis',
  DIYETISYEN_RAPORLAR: '/diyetisyen/raporlar',

  LABORATUVAR: '/laboratuvar',
  LABORATUVAR_PROFIL: '/laboratuvar/profil',
  LABORATUVAR_AYARLAR: '/laboratuvar/ayarlar',
  LABORATUVAR_BILDIRIMLER: '/laboratuvar/bildirimler',
  LABORATUVAR_HAVUZ: '/laboratuvar/havuz',
  LABORATUVAR_ANALIZ: '/laboratuvar/analiz',
  LABORATUVAR_SONUCLAR: '/laboratuvar/sonuclar',

  UZMAN: '/uzman',
  UZMAN_PROFIL: '/uzman/profil',
  UZMAN_AYARLAR: '/uzman/ayarlar',
  UZMAN_BILDIRIMLER: '/uzman/bildirimler',
  UZMAN_ANALIZLER: '/uzman/analizler',
  UZMAN_ATAMALAR: '/uzman/atamalar',
  UZMAN_RAPORLAR_DUZENLEYICI: '/uzman/raporlar/duzenleyici',
  UZMAN_SONUCLAR: '/uzman/sonuclar',

  DANISAN: '/danisan',
  DANISAN_PROFIL: '/danisan/profil',
  DANISAN_AYARLAR: '/danisan/ayarlar',
  DANISAN_BILDIRIMLER: '/danisan/bildirimler',
  DANISAN_BILGILERIM: '/danisan/bilgilerim',
  DANISAN_KIT: '/danisan/kit',
  DANISAN_RAPORLAR: '/danisan/raporlar',

  PAYLAS: '/paylas',
} as const

/** Rol bazli ana sayfa yolu (giris sonrasi yonlendirme) */
export const ROLE_HOME: Record<UserRole, string> = {
  [UserRole.ADMIN]: ROUTES.YONETICI,
  [UserRole.DIETITIAN]: ROUTES.DIYETISYEN,
  [UserRole.LAB]: ROUTES.LABORATUVAR,
  [UserRole.SPECIALIST]: ROUTES.UZMAN,
  [UserRole.DANISAN]: ROUTES.DANISAN,
}

/** Dinamik yol: danisan detay (id ile) */
export function danisanDetayPath(clientId: string): string {
  return `${ROUTES.DIYETISYEN_DANISANLAR}/${clientId}`
}

/** Dinamik yol: danisan duzenle (id ile) */
export function danisanDuzenlePath(clientId: string): string {
  return `${ROUTES.DIYETISYEN_DANISANLAR}/${clientId}/duzenle`
}

/** Dinamik yol: rapor duzenleyici (barcode query) */
export function raporDuzenleyiciPath(barcode: string): string {
  return `${ROUTES.UZMAN_RAPORLAR_DUZENLEYICI}?barcode=${encodeURIComponent(barcode)}`
}

/** Dinamik yol: paylasim linki */
export function paylasPath(reportId: string, token?: string): string {
  const base = `${ROUTES.PAYLAS}/${reportId}`
  return token ? `${base}?token=${encodeURIComponent(token)}` : base
}

/** pathname'dan rol bazli ana yol (profil/ayarlar geri donus icin) */
export function getBasePath(pathname: string): string {
  if (pathname.startsWith(ROUTES.YONETICI)) return ROUTES.YONETICI
  if (pathname.startsWith(ROUTES.DIYETISYEN)) return ROUTES.DIYETISYEN
  if (pathname.startsWith(ROUTES.LABORATUVAR)) return ROUTES.LABORATUVAR
  if (pathname.startsWith(ROUTES.UZMAN)) return ROUTES.UZMAN
  if (pathname.startsWith(ROUTES.DANISAN)) return ROUTES.DANISAN
  return '/'
}
