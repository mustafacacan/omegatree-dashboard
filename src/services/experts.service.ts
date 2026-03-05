import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

type ApiExpertResponse = components['schemas']['ExpertResponse']
type ApiUpdateExpert = components['schemas']['UpdateExpert']

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
}

function mapApiExpert(item: ApiExpertResponse): Expert {
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
  }
}

export interface GetExpertsParams {
  page?: number
  limit?: number
}

export interface GetExpertsResponse {
  experts: Expert[]
  totalItems?: number
  totalPages?: number
  currentPage?: number
}

/** GET /experts */
export async function getExperts(params?: GetExpertsParams): Promise<GetExpertsResponse> {
  const { data } = await api.get<unknown>('/experts', {
    ...skipAuth,
    params: params ? { page: params.page ?? 1, limit: params.limit ?? 50 } : undefined,
  })
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const list = (top?.data as ApiExpertResponse[]) ?? []
  const meta = top?.meta as Record<string, unknown> | undefined
  return {
    experts: Array.isArray(list) ? list.map(mapApiExpert) : [],
    totalItems: meta?.totalItems as number | undefined,
    totalPages: meta?.totalPages as number | undefined,
    currentPage: meta?.currentPage as number | undefined,
  }
}

/** GET /experts/{id} */
export async function getExpertById(id: number | string): Promise<Expert> {
  const { data } = await api.get<ApiExpertResponse>(`/experts/${id}`, skipAuth)
  return mapApiExpert(data)
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
