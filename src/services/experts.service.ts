import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

type ApiExpertResponse = components['schemas']['ExpertResponse']
type ApiUpdateExpert = components['schemas']['UpdateExpert']

type ApiExpertWithDates = ApiExpertResponse & { createdAt?: string; assignedAt?: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

export interface Expert {
  id: number
  userId?: number
  userName?: string
  userPhone?: string
  userEmail?: string
  kitId?: number
  kitBarcode?: string
  laboratoryKitId?: number
  laboratoryKitStatus?: 'pending' | 'completed' | 'cancelled'
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  reason?: string
  isActive?: boolean
  /** API bazen tarih alanlari dondurebilir (spec disi); UI'da atanma tarihi icin kullanilir */
  assignedAt?: string
  /** Analiz sonucu media dosyasi (backend `mediaResult` ile dondurebilir) */
  resultMediaUrl?: string
  resultMediaId?: number
}

function mapApiExpert(item: ApiExpertResponse): Expert {
  const withDates = item as ApiExpertWithDates
  return {
    id: item.id ?? 0,
    userId: item.userId?.id,
    userName: item.userId
      ? `${item.userId.firstName ?? ''} ${item.userId.lastName ?? ''}`.trim()
      : undefined,
    userPhone: item.userId?.phone,
    userEmail: item.userId?.email,
    kitId: item.kitId?.id,
    kitBarcode: item.kitId?.barcode,
    laboratoryKitId: item.laboratoryKit?.id,
    laboratoryKitStatus: item.laboratoryKit?.status,
    status: item.status,
    reason: item.reason,
    isActive: item.isActive,
    assignedAt: withDates.assignedAt ?? withDates.createdAt,
  }
}

function mapApiExpertLoose(raw: unknown): Expert {
  if (!isRecord(raw)) return { id: 0 }

  const kitExpert = isRecord(raw.kitExpert) ? raw.kitExpert : undefined
  const laboratoryExpert = isRecord(raw.laboratoryExpert) ? raw.laboratoryExpert : undefined
  const nestedKitId = isRecord(raw.kitId) ? raw.kitId : undefined
  const nestedUser = isRecord(raw.userId) ? raw.userId : undefined
  const nestedLaboratoryKit = isRecord(raw.laboratoryKit) ? raw.laboratoryKit : undefined

  const userName = nestedUser
    ? `${asString(nestedUser.firstName) ?? ''} ${asString(nestedUser.lastName) ?? ''}`.trim()
    : undefined
  const cleanUserName = userName && userName.length > 0 ? userName : undefined

  const kitId = asNumber(raw.kitId) ?? asNumber(nestedKitId?.id)
  const kitBarcode = asString(kitExpert?.barcode) ?? asString(nestedKitId?.barcode) ?? asString(raw.kitBarcode)

  const laboratoryKitId = asNumber(raw.laboratoryKitId) ?? asNumber(nestedLaboratoryKit?.id) ?? asNumber(laboratoryExpert?.id)
  const laboratoryKitStatus = (asString(nestedLaboratoryKit?.status) ?? asString(laboratoryExpert?.status)) as
    | 'pending'
    | 'completed'
    | 'cancelled'
    | undefined

  const topMediaResult = isRecord(raw.mediaResult) ? raw.mediaResult : undefined
  const topResultMediaObj = isRecord(raw.resultMediaId) ? raw.resultMediaId : undefined
  const nestedMediaResult = isRecord(laboratoryExpert?.mediaResult) ? (laboratoryExpert?.mediaResult as Record<string, unknown>) : undefined
  const nestedResultMediaObj = isRecord(laboratoryExpert?.resultMediaId) ? (laboratoryExpert?.resultMediaId as Record<string, unknown>) : undefined

  const resultMediaUrl =
    asString(topMediaResult?.url) ??
    asString(topResultMediaObj?.url) ??
    asString(nestedMediaResult?.url) ??
    asString(nestedResultMediaObj?.url)

  const resultMediaId =
    asNumber(topMediaResult?.id) ??
    asNumber(topResultMediaObj?.id) ??
    asNumber(raw.resultMediaId) ??
    asNumber(raw.resultMedia) ??
    asNumber(laboratoryExpert?.resultMediaId) ??
    asNumber(laboratoryExpert?.resultMedia) ??
    asNumber(nestedMediaResult?.id) ??
    asNumber(nestedResultMediaObj?.id)

  const status = asString(raw.status) as 'pending' | 'in_progress' | 'completed' | 'cancelled' | undefined
  const assignedAt = asString(raw.assignedAt) ?? asString(raw.createdAt)

  return {
    id: asNumber(raw.id) ?? 0,
    userId: asNumber(nestedUser?.id),
    userName: cleanUserName,
    userPhone: asString(nestedUser?.phone),
    userEmail: asString(nestedUser?.email),
    kitId,
    kitBarcode,
    laboratoryKitId,
    laboratoryKitStatus,
    status,
    reason: asString(raw.reason),
    isActive: asBoolean(raw.isActive),
    assignedAt,
    resultMediaUrl,
    resultMediaId,
  }
}

export interface GetExpertsParams {
  page?: number
  limit?: number
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
}

export interface GetExpertsResponse {
  experts: Expert[]
  totalItems?: number
  totalPages?: number
  currentPage?: number
}

/** GET /experts */
export async function getExperts(params?: GetExpertsParams): Promise<GetExpertsResponse> {
  const requestConfig: ApiRequestConfig = {
    ...skipAuth,
    params: params
      ? {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        ...(params.status ? { status: params.status } : {}),
      }
      : undefined,
  }

  // Not: swagger ile uyumlu endpoint `/experts`.
  // Bazı ortamlarda yanlışlıkla `/expeorts` deploy edilebildiği için, sadece 404 durumunda fallback uygulanır.
  let data: unknown
  try {
    ; ({ data } = await api.get<unknown>('/experts', requestConfig))
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status !== 404) throw err
      ; ({ data } = await api.get<unknown>('/expeorts', requestConfig))
  }

  // API iki farkli formatta gelebiliyor:
  // 1) swagger: { data: ExpertResponse[], meta: {...} }
  // 2) prod: { success: true, data: { totalItems, totalPages, currentPage, items: [...] } }
  const top = isRecord(data) ? data : null

  const prodData = top && isRecord(top.data) ? top.data : null
  if (prodData && Array.isArray(prodData.items)) {
    return {
      experts: (prodData.items as unknown[]).map(mapApiExpertLoose),
      totalItems: asNumber(prodData.totalItems),
      totalPages: asNumber(prodData.totalPages),
      currentPage: asNumber(prodData.currentPage),
    }
  }

  const swaggerList = top && Array.isArray(top.data) ? (top.data as ApiExpertResponse[]) : []
  const meta = top && isRecord(top.meta) ? top.meta : undefined
  return {
    experts: swaggerList.map(mapApiExpert),
    totalItems: asNumber(meta?.totalItems),
    totalPages: asNumber(meta?.totalPages),
    currentPage: asNumber(meta?.currentPage),
  }
}

/** GET /experts/{id} */
export async function getExpertById(id: number | string): Promise<Expert> {
  const { data } = await api.get<unknown>(`/experts/${id}`, skipAuth)

  // API iki formatta dönebilir:
  // 1) swagger: ExpertResponse
  // 2) prod: { success, message, data: { ...expert } }
  const top = isRecord(data) ? data : null
  const inner = top && isRecord(top.data) ? top.data : data

  // Prod shape (kitExpert/laboratoryExpert) veya karma shape
  if (isRecord(inner) && ('kitExpert' in inner || typeof inner.kitId === 'number')) {
    return mapApiExpertLoose(inner)
  }

  // Swagger shape
  if (isRecord(inner)) return mapApiExpert(inner as ApiExpertResponse)
  return { id: typeof id === 'number' ? id : Number(id) || 0 }
}

/** POST /experts — laboratuvar kiti ile uzman oluştur */
export async function createExpert(laboratoryKitId: number): Promise<Expert> {
  const { data } = await api.post<ApiExpertResponse>('/experts', { laboratoryKitId }, skipAuth)
  return mapApiExpert(data)
}

/** PUT /experts/{id} — uzman durumunu güncelle (multipart/form-data) */
export async function updateExpert(
  id: number | string,
  payload: ApiUpdateExpert & { file?: File }
): Promise<Expert> {
  const formData = new FormData()
  formData.append('status', payload.status)
  if (payload.reason) formData.append('reason', payload.reason)
  if (payload.isActive !== undefined) formData.append('isActive', String(payload.isActive))
  if (payload.file) formData.append('file', payload.file)

  const { data } = await api.put<ApiExpertResponse>(`/experts/${id}`, formData, {
    ...skipAuth,
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return mapApiExpert(data)
}
