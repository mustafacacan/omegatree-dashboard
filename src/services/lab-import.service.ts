import { api, type ApiRequestConfig } from '@/lib/axios'
import { downloadBlobFromApi } from '@/lib/download'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

export type LabFieldStatus = 'extracted' | 'missing' | 'unreliable' | 'manual'

export type LabFieldMeta = {
  status?: LabFieldStatus
  label?: string
  category?: string
  edited?: boolean
}

export const LAB_PARAM_DEFS: Array<{ code: string; label: string; category: 'biochemistry' | 'hemogram' }> = [
  { code: 'ALB2', label: 'ALB2', category: 'biochemistry' },
  { code: 'ALP2L', label: 'ALP2L', category: 'biochemistry' },
  { code: 'ALTL', label: 'ALTL', category: 'biochemistry' },
  { code: 'AMYL2', label: 'AMYL2', category: 'biochemistry' },
  { code: 'ASTL', label: 'ASTL', category: 'biochemistry' },
  { code: 'B12 2', label: 'B12 2', category: 'biochemistry' },
  { code: 'BILD2', label: 'BILD2', category: 'biochemistry' },
  { code: 'BILT3', label: 'BILT3', category: 'biochemistry' },
  { code: 'CA2', label: 'CA2', category: 'biochemistry' },
  { code: 'CHO2I', label: 'CHO2I', category: 'biochemistry' },
  { code: 'CK2', label: 'CK2', category: 'biochemistry' },
  { code: 'CI', label: 'CI', category: 'biochemistry' },
  { code: 'CO2-L', label: 'CO2-L', category: 'biochemistry' },
  { code: 'CREJ2', label: 'CREJ2', category: 'biochemistry' },
  { code: 'CRP4', label: 'CRP4', category: 'biochemistry' },
  { code: 'FOL', label: 'FOL', category: 'biochemistry' },
  { code: 'FT4 4', label: 'FT4 4', category: 'biochemistry' },
  { code: 'GGTI2', label: 'GGTI2', category: 'biochemistry' },
  { code: 'GLUC3', label: 'GLUC3', category: 'biochemistry' },
  { code: 'HDLC4', label: 'HDLC4', category: 'biochemistry' },
  { code: 'Insulin', label: 'İnsülin', category: 'biochemistry' },
  { code: 'IRON2', label: 'IRON2', category: 'biochemistry' },
  { code: 'K', label: 'K', category: 'biochemistry' },
  { code: 'LDHI2', label: 'LDHI2', category: 'biochemistry' },
  { code: 'LDLC3', label: 'LDLC3', category: 'biochemistry' },
  { code: 'LIP', label: 'LIP', category: 'biochemistry' },
  { code: 'MG-2', label: 'MG-2', category: 'biochemistry' },
  { code: 'Na', label: 'Na', category: 'biochemistry' },
  { code: 'PHOS2', label: 'PHOS2', category: 'biochemistry' },
  { code: 'TP2', label: 'TP2', category: 'biochemistry' },
  { code: 'TRIGL', label: 'TRIGL', category: 'biochemistry' },
  { code: 'TSH', label: 'TSH', category: 'biochemistry' },
  { code: 'UA2', label: 'UA2', category: 'biochemistry' },
  { code: 'U-BUN', label: 'U-BUN', category: 'biochemistry' },
  { code: 'UIBCI', label: 'UIBCI', category: 'biochemistry' },
  { code: 'VITDT 3', label: 'VITDT 3', category: 'biochemistry' },
  { code: 'UrineCreatinine', label: 'İdrar Kreatinin', category: 'biochemistry' },
  { code: 'IL6', label: 'IL6', category: 'biochemistry' },
  { code: 'HBA1C', label: 'HBA1C', category: 'biochemistry' },
  { code: 'WBC', label: 'WBC', category: 'hemogram' },
  { code: 'NEU#', label: 'NEU#', category: 'hemogram' },
  { code: 'LYM#', label: 'LYM#', category: 'hemogram' },
  { code: 'MON#', label: 'MON#', category: 'hemogram' },
  { code: 'EOS#', label: 'EOS#', category: 'hemogram' },
  { code: 'BAS#', label: 'BAS#', category: 'hemogram' },
  { code: 'NEU%', label: 'NEU%', category: 'hemogram' },
  { code: 'LYM%', label: 'LYM%', category: 'hemogram' },
  { code: 'MON%', label: 'MON%', category: 'hemogram' },
  { code: 'EOS%', label: 'EOS%', category: 'hemogram' },
  { code: 'BAS%', label: 'BAS%', category: 'hemogram' },
  { code: 'RBC', label: 'RBC', category: 'hemogram' },
  { code: 'HGB', label: 'HGB', category: 'hemogram' },
  { code: 'HCT', label: 'HCT', category: 'hemogram' },
  { code: 'MCV', label: 'MCV', category: 'hemogram' },
  { code: 'MCH', label: 'MCH', category: 'hemogram' },
  { code: 'PLT', label: 'PLT', category: 'hemogram' },
]

export type ClientLabImport = {
  id: number
  clientId: number
  status: string
  reportType: string
  measuredAt?: string | null
  confirmedAt?: string | null
  parseNotes?: string | null
  parameters: Record<string, number | null>
  fieldMeta?: Record<string, LabFieldMeta> | null
  createdAt?: string
  updatedAt?: string
}

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

function mapLabImport(row: unknown): ClientLabImport {
  const rec = asRecord(row) ?? {}
  const params = asRecord(rec.parameters) ?? {}
  const normalized: Record<string, number | null> = {}
  for (const def of LAB_PARAM_DEFS) {
    const v = params[def.code]
    normalized[def.code] = v != null && Number.isFinite(Number(v)) ? Number(v) : null
  }
  return {
    id: Number(rec.id) || 0,
    clientId: Number(rec.clientId) || 0,
    status: String(rec.status ?? 'draft'),
    reportType: String(rec.reportType ?? 'combined'),
    measuredAt: (rec.measuredAt as string | null | undefined) ?? null,
    confirmedAt: (rec.confirmedAt as string | null | undefined) ?? null,
    parseNotes: (rec.parseNotes as string | null | undefined) ?? null,
    parameters: normalized,
    fieldMeta: (rec.fieldMeta as Record<string, LabFieldMeta> | null | undefined) ?? null,
    createdAt: rec.createdAt as string | undefined,
    updatedAt: rec.updatedAt as string | undefined,
  }
}

export async function parseLabPdf(clientId: number | string, file: File): Promise<ClientLabImport> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('clientId', String(clientId))

  const { data } = await api.post<unknown>('/client-lab-imports/parse', formData, {
    ...skipAuth,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return mapLabImport(unwrapData(data))
}

export async function createLabManual(clientId: number | string): Promise<ClientLabImport> {
  const { data } = await api.post<unknown>(
    '/client-lab-imports',
    { clientId: Number(clientId) },
    skipAuth,
  )
  return mapLabImport(unwrapData(data))
}

export async function listLabImportsByClient(clientId: number | string): Promise<ClientLabImport[]> {
  const { data } = await api.get<unknown>(`/client-lab-imports/client/${clientId}`, skipAuth)
  return unwrapItems(data).map(mapLabImport)
}

export async function getLabImportById(id: number | string): Promise<ClientLabImport> {
  const { data } = await api.get<unknown>(`/client-lab-imports/${id}`, skipAuth)
  return mapLabImport(unwrapData(data))
}

export async function updateLabImport(
  id: number | string,
  parameters: Record<string, number | null>,
): Promise<ClientLabImport> {
  const { data } = await api.put<unknown>(`/client-lab-imports/${id}`, { parameters }, skipAuth)
  return mapLabImport(unwrapData(data))
}

export async function confirmLabImport(
  id: number | string,
  parameters: Record<string, number | null>,
): Promise<ClientLabImport> {
  const { data } = await api.post<unknown>(`/client-lab-imports/${id}/confirm`, { parameters }, skipAuth)
  return mapLabImport(unwrapData(data))
}

export async function exportLabImportXlsx(id: number | string): Promise<void> {
  await downloadBlobFromApi(`/client-lab-imports/${id}/export.xlsx`, `lab-import-${id}.xlsx`)
}
