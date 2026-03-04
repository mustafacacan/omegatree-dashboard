/**
 * Ücretsiz Türkiye İller & İlçeler API
 * Kaynak: https://api.turkiyeapi.dev (açık kaynak, ücretsiz)
 * Dokümantasyon: https://api.turkiyeapi.dev/docs
 */
const TURKEY_API_BASE = 'https://api.turkiyeapi.dev/v1'

export interface TurkeyProvince {
  id: number
  name: string
}

export interface TurkeyDistrict {
  id: number
  name: string
  provinceId?: number
  province?: string
}

interface TurkeyApiResponse<T> {
  status?: string
  data?: T[]
}

/** Tüm illeri getir (81 il) */
export async function getProvinces(): Promise<TurkeyProvince[]> {
  const res = await fetch(`${TURKEY_API_BASE}/provinces?limit=81&sort=name`)
  const json = (await res.json()) as TurkeyApiResponse<TurkeyProvince>
  const list = json?.data ?? []
  return list.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}

/** Seçilen ile ait ilçeleri getir */
export async function getDistricts(provinceId: number): Promise<TurkeyDistrict[]> {
  const res = await fetch(
    `${TURKEY_API_BASE}/districts?provinceId=${provinceId}&limit=1000&sort=name`
  )
  const json = (await res.json()) as TurkeyApiResponse<TurkeyDistrict>
  const list = json?.data ?? []
  return list.sort((a, b) => a.name.localeCompare(b.name, 'tr'))
}
