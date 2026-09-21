import { api, type ApiRequestConfig } from '@/lib/axios'
import { downloadBlobFromApi } from '@/lib/download'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

export type TanitaFieldStatus = 'extracted' | 'missing' | 'unreliable' | 'manual'

export type TanitaFieldMeta = {
  status?: TanitaFieldStatus
  label?: string
  edited?: boolean
}

export type TanitaFieldKey =
  | 'patientFirstName'
  | 'patientLastName'
  | 'age'
  | 'heightCm'
  | 'weightKg'
  | 'bmi'
  | 'bodyFatPercent'
  | 'fatMassKg'
  | 'fatFreeMassKg'
  | 'muscleMassKg'
  | 'skeletalMuscleMassKg'
  | 'metabolicAge'
  | 'boneMassKg'
  | 'proteinKg'
  | 'totalBodyWaterKg'
  | 'totalBodyWaterPercent'
  | 'bmrKcal'
  | 'visceralFatLevel'
  | 'trunkMuscleMassKg'
  | 'leftArmMuscleMassKg'
  | 'leftLegMuscleMassKg'
  | 'rightArmMuscleMassKg'
  | 'rightLegMuscleMassKg'
  | 'trunkFatKg'
  | 'leftArmFatKg'
  | 'leftLegFatKg'
  | 'rightArmFatKg'
  | 'rightLegFatKg'
  | 'measuredAt'

export type TanitaMeasurement = {
  id: number
  clientId: number
  status: string
  measuredAt?: string | null
  confirmedAt?: string | null
  parseNotes?: string | null
  patientFirstName?: string | null
  patientLastName?: string | null
  age?: number | null
  heightCm?: number | null
  weightKg?: number | null
  bmi?: number | null
  bodyFatPercent?: number | null
  fatMassKg?: number | null
  fatFreeMassKg?: number | null
  muscleMassKg?: number | null
  skeletalMuscleMassKg?: number | null
  visceralFatLevel?: number | null
  totalBodyWaterKg?: number | null
  totalBodyWaterPercent?: number | null
  bmrKcal?: number | null
  metabolicAge?: number | null
  boneMassKg?: number | null
  proteinKg?: number | null
  trunkMuscleMassKg?: number | null
  leftArmMuscleMassKg?: number | null
  leftLegMuscleMassKg?: number | null
  rightArmMuscleMassKg?: number | null
  rightLegMuscleMassKg?: number | null
  trunkFatKg?: number | null
  leftArmFatKg?: number | null
  leftLegFatKg?: number | null
  rightArmFatKg?: number | null
  rightLegFatKg?: number | null
  fieldMeta?: Record<string, TanitaFieldMeta> | null
  createdAt?: string
  updatedAt?: string
}

export type TanitaEditableFields = {
  [K in TanitaFieldKey]?: TanitaMeasurement[K] | null
}

export const TANITA_FIELD_DEFS: Array<{
  key: TanitaFieldKey
  label: string
  unit?: string
  inputType: 'text' | 'number'
}> = [
  { key: 'patientFirstName', label: 'Adı', inputType: 'text' },
  { key: 'patientLastName', label: 'Soyadı', inputType: 'text' },
  { key: 'age', label: 'Yaş', inputType: 'number' },
  { key: 'heightCm', label: 'Boy', unit: 'cm', inputType: 'number' },
  { key: 'weightKg', label: 'Ağırlık', unit: 'kg', inputType: 'number' },
  { key: 'bmi', label: 'BMI', inputType: 'number' },
  { key: 'bodyFatPercent', label: 'Vücut yağ yüzdesi', unit: '%', inputType: 'number' },
  { key: 'fatMassKg', label: 'Yağ kütlesi', unit: 'kg', inputType: 'number' },
  { key: 'fatFreeMassKg', label: 'Yağsız kütle', unit: 'kg', inputType: 'number' },
  { key: 'muscleMassKg', label: 'Kas kütlesi', unit: 'kg', inputType: 'number' },
  { key: 'skeletalMuscleMassKg', label: 'İskelet kas kütlesi', unit: 'kg', inputType: 'number' },
  { key: 'metabolicAge', label: 'Metabolik yaş', inputType: 'number' },
  { key: 'boneMassKg', label: 'Kemik kütlesi', unit: 'kg', inputType: 'number' },
  { key: 'proteinKg', label: 'Protein', unit: 'kg', inputType: 'number' },
  { key: 'totalBodyWaterKg', label: 'Toplam vücut suyu', unit: 'kg', inputType: 'number' },
  { key: 'totalBodyWaterPercent', label: 'Toplam vücut suyu', unit: '%', inputType: 'number' },
  { key: 'bmrKcal', label: 'BMR', unit: 'kcal', inputType: 'number' },
  { key: 'visceralFatLevel', label: 'Visseral yağ derecesi', inputType: 'number' },
  { key: 'trunkMuscleMassKg', label: 'Gövde kas kütlesi', unit: 'kg', inputType: 'number' },
  { key: 'leftArmMuscleMassKg', label: 'Sol kol kas kütlesi', unit: 'kg', inputType: 'number' },
  { key: 'leftLegMuscleMassKg', label: 'Sol bacak kas kütlesi', unit: 'kg', inputType: 'number' },
  { key: 'rightArmMuscleMassKg', label: 'Sağ kol kas kütlesi', unit: 'kg', inputType: 'number' },
  { key: 'rightLegMuscleMassKg', label: 'Sağ bacak kas kütlesi', unit: 'kg', inputType: 'number' },
  { key: 'trunkFatKg', label: 'Gövde yağ değeri', unit: 'kg', inputType: 'number' },
  { key: 'leftArmFatKg', label: 'Sol kol yağ değeri', unit: 'kg', inputType: 'number' },
  { key: 'leftLegFatKg', label: 'Sol bacak yağ değeri', unit: 'kg', inputType: 'number' },
  { key: 'rightArmFatKg', label: 'Sağ kol yağ değeri', unit: 'kg', inputType: 'number' },
  { key: 'rightLegFatKg', label: 'Sağ bacak yağ değeri', unit: 'kg', inputType: 'number' },
]

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function unwrapData(v: unknown): unknown {
  const top = asRecord(v)
  if (!top || !('data' in top)) return v
  return top.data
}

function unwrapItems(v: unknown): unknown[] {
  const payload = unwrapData(v)
  if (Array.isArray(payload)) return payload
  const rec = asRecord(payload)
  const items = rec?.items
  return Array.isArray(items) ? items : []
}

function mapTanita(row: unknown): TanitaMeasurement {
  const rec = asRecord(row) ?? {}
  const num = (k: string) => (rec[k] != null ? Number(rec[k]) : null)
  const str = (k: string) => (rec[k] != null ? String(rec[k]) : null)
  return {
    id: Number(rec.id) || 0,
    clientId: Number(rec.clientId) || 0,
    status: String(rec.status ?? 'draft'),
    measuredAt: (rec.measuredAt as string | null | undefined) ?? null,
    confirmedAt: (rec.confirmedAt as string | null | undefined) ?? null,
    parseNotes: (rec.parseNotes as string | null | undefined) ?? null,
    patientFirstName: str('patientFirstName'),
    patientLastName: str('patientLastName'),
    age: num('age'),
    heightCm: num('heightCm'),
    weightKg: num('weightKg'),
    bmi: num('bmi'),
    bodyFatPercent: num('bodyFatPercent'),
    fatMassKg: num('fatMassKg'),
    fatFreeMassKg: num('fatFreeMassKg'),
    muscleMassKg: num('muscleMassKg'),
    skeletalMuscleMassKg: num('skeletalMuscleMassKg'),
    visceralFatLevel: num('visceralFatLevel'),
    totalBodyWaterKg: num('totalBodyWaterKg'),
    totalBodyWaterPercent: num('totalBodyWaterPercent'),
    bmrKcal: num('bmrKcal'),
    metabolicAge: num('metabolicAge'),
    boneMassKg: num('boneMassKg'),
    proteinKg: num('proteinKg'),
    trunkMuscleMassKg: num('trunkMuscleMassKg'),
    leftArmMuscleMassKg: num('leftArmMuscleMassKg'),
    leftLegMuscleMassKg: num('leftLegMuscleMassKg'),
    rightArmMuscleMassKg: num('rightArmMuscleMassKg'),
    rightLegMuscleMassKg: num('rightLegMuscleMassKg'),
    trunkFatKg: num('trunkFatKg'),
    leftArmFatKg: num('leftArmFatKg'),
    leftLegFatKg: num('leftLegFatKg'),
    rightArmFatKg: num('rightArmFatKg'),
    rightLegFatKg: num('rightLegFatKg'),
    fieldMeta: (rec.fieldMeta as Record<string, TanitaFieldMeta> | null | undefined) ?? null,
    createdAt: rec.createdAt as string | undefined,
    updatedAt: rec.updatedAt as string | undefined,
  }
}

export async function parseTanitaPdf(clientId: number | string, file: File): Promise<TanitaMeasurement> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('clientId', String(clientId))

  const { data } = await api.post<unknown>('/tanita-measurements/parse', formData, {
    ...skipAuth,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return mapTanita(unwrapData(data))
}

export async function createTanitaManual(
  clientId: number | string,
  fields: TanitaEditableFields = {},
): Promise<TanitaMeasurement> {
  const { data } = await api.post<unknown>(
    '/tanita-measurements',
    { clientId: Number(clientId), ...fields },
    skipAuth,
  )
  return mapTanita(unwrapData(data))
}

export async function listTanitaByClient(clientId: number | string): Promise<TanitaMeasurement[]> {
  const { data } = await api.get<unknown>(`/tanita-measurements/client/${clientId}`, skipAuth)
  return unwrapItems(data).map(mapTanita)
}

export async function getTanitaById(id: number | string): Promise<TanitaMeasurement> {
  const { data } = await api.get<unknown>(`/tanita-measurements/${id}`, skipAuth)
  return mapTanita(unwrapData(data))
}

export async function updateTanita(
  id: number | string,
  payload: TanitaEditableFields,
): Promise<TanitaMeasurement> {
  const { data } = await api.put<unknown>(`/tanita-measurements/${id}`, payload, skipAuth)
  return mapTanita(unwrapData(data))
}

export async function confirmTanita(
  id: number | string,
  payload: TanitaEditableFields = {},
): Promise<TanitaMeasurement> {
  const { data } = await api.post<unknown>(`/tanita-measurements/${id}/confirm`, payload, skipAuth)
  return mapTanita(unwrapData(data))
}

export async function exportTanitaXlsx(id: number | string): Promise<void> {
  await downloadBlobFromApi(`/tanita-measurements/${id}/export.xlsx`, `tanita-${id}.xlsx`)
}
