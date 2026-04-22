import { api, type ApiRequestConfig } from '@/lib/axios'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

export interface BankInfo {
  id: number
  bankName: string
  ibanNo: string
  accountHolder: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface BankInfosPage {
  items: BankInfo[]
  totalItems: number
  totalPages: number
  currentPage: number
}

type ApiResponse<T> = { success?: boolean; message?: string; data?: T } | T

function unwrap<T>(raw: ApiResponse<T>): T {
  if (raw && typeof raw === 'object' && 'data' in (raw as Record<string, unknown>)) {
    return (raw as { data: T }).data
  }
  return raw as T
}

function toBankInfo(x: unknown): BankInfo {
  const o = x && typeof x === 'object' ? (x as Record<string, unknown>) : {}
  const id = typeof o.id === 'number' ? o.id : typeof o.id === 'string' ? Number(o.id) : 0
  return {
    id,
    bankName: String(o.bankName ?? ''),
    ibanNo: String(o.ibanNo ?? ''),
    accountHolder: String(o.accountHolder ?? ''),
    isActive: Boolean(o.isActive ?? true),
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : undefined,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : undefined,
  }
}

export async function getBankInfosPage(params?: {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
}): Promise<BankInfosPage> {
  const { data } = await api.get<ApiResponse<unknown>>('/bank-infos', {
    ...skipAuth,
    params: {
      ...(params?.page ? { page: params.page } : {}),
      ...(params?.limit ? { limit: params.limit } : {}),
      ...(params?.search ? { search: params.search } : {}),
      ...(params?.isActive != null ? { isActive: params.isActive } : {}),
    },
  })

  const payload = unwrap(data)
  const obj = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null
  const itemsRaw = (obj?.items as unknown) ?? []
  const items = Array.isArray(itemsRaw) ? itemsRaw.map(toBankInfo) : []
  return {
    items,
    totalItems: obj?.totalItems != null ? Number(obj.totalItems) || 0 : items.length,
    totalPages: obj?.totalPages != null ? Math.max(1, Number(obj.totalPages) || 0) : 1,
    currentPage: obj?.currentPage != null ? Number(obj.currentPage) || 1 : 1,
  }
}

export async function getActiveBankInfos(): Promise<BankInfo[]> {
  const page = await getBankInfosPage({ page: 1, limit: 100, isActive: true })
  return page.items.filter((x) => x.isActive)
}

export async function createBankInfo(payload: {
  bankName: string
  ibanNo: string
  accountHolder: string
  isActive?: boolean
}): Promise<BankInfo> {
  const { data } = await api.post<ApiResponse<unknown>>('/bank-infos', payload)
  return toBankInfo(unwrap(data))
}

export async function updateBankInfo(
  id: number | string,
  payload: Partial<Pick<BankInfo, 'bankName' | 'ibanNo' | 'accountHolder' | 'isActive'>>
): Promise<BankInfo> {
  const { data } = await api.put<ApiResponse<unknown>>(`/bank-infos/${id}`, payload)
  return toBankInfo(unwrap(data))
}

export async function deleteBankInfo(id: number | string): Promise<void> {
  await api.delete(`/bank-infos/${id}`)
}

