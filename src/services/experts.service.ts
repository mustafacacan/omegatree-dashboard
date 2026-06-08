import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'
import { UserRole, UserStatus } from '@/utils/constants'
import type { User } from '@/types/user.types'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

type ApiExpertResponse = components['schemas']['ExpertResponse']
type ApiUpdateExpert = components['schemas']['UpdateExpert']
type ApiUser = components['schemas']['UserResponse']

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

function deepFindByKey<T>(
  root: unknown,
  keys: string[],
  guard: (value: unknown) => value is T,
  maxDepth = 7
): T | null {
  const keysSet = new Set(keys)
  const visited = new Set<object>()
  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }]

  while (stack.length) {
    const current = stack.pop()!
    if (current.depth > maxDepth) continue

    const v = current.value
    if (Array.isArray(v)) {
      // Hard limit to avoid pathological payloads
      for (let i = 0; i < Math.min(v.length, 50); i++) {
        stack.push({ value: v[i], depth: current.depth + 1 })
      }
      continue
    }

    if (!isRecord(v)) continue
    if (visited.has(v)) continue
    visited.add(v)

    for (const [k, child] of Object.entries(v)) {
      if (keysSet.has(k) && guard(child)) return child
      stack.push({ value: child, depth: current.depth + 1 })
    }
  }

  return null
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

  /** Danışan bilgileri (uzman detayında gelebiliyor) */
  anamnezForm?: {
    id?: number
    clientId?: number
    chronic_illness?: string
    medication_used?: string
    food_allergy?: string
    body_weight?: string
    body_height?: number
    waist_circumference?: string
    hip_circumference?: string
    profession?: string
    education?: string
    createdAt?: string
    updatedAt?: string
  } | null
  foodConsumptionRecord?: {
    id?: number
    clientId?: number
    mealsPerDay?: number
    alcoholFrequency?: string
    smokingFrequency?: string
    avoidedFoods?: string
    dailyWaterLiters?: string
    fastFoodMealsPerDay?: number
    defecationFrequency?: string
    discomfortFoods?: string
    bowelIssue?: string
    gastrointestinalDisea?: string
    nightEatingHabit?: boolean
    eatingDisorderBehavio?: boolean
    notes?: string | null
    createdAt?: string
    updatedAt?: string
  } | null
  sleepQualityRecords?: Array<{
    id?: number
    clientId?: number
    recordDate?: string
    usualBedTime?: string
    sleepLatencyMinutes?: number
    usualWakeTime?: string
    sleepHours?: string
    subjectiveSleepQuality?: number
    notes?: string | null
    createdAt?: string
    updatedAt?: string
  }> | null
}

function mapApiExpert(item: ApiExpertResponse): Expert {
  const withDates = item as ApiExpertWithDates
  const assignedUser = Array.isArray(item.assignedUsers) ? item.assignedUsers[0] : undefined
  const userName = assignedUser
    ? `${assignedUser.firstName ?? ''} ${assignedUser.lastName ?? ''}`.trim()
    : undefined
  const cleanUserName = userName && userName.length > 0 ? userName : undefined

  return {
    id: item.id ?? 0,
    userId: assignedUser?.id,
    userName: cleanUserName,
    userPhone: assignedUser?.phone,
    userEmail: assignedUser?.email,
    kitId: item.kitId,
    kitBarcode: item.kitExpert?.barcode,
    laboratoryKitId: item.laboratoryKitId ?? item.laboratoryExpert?.id,
    laboratoryKitStatus: (item.laboratoryExpert?.status as Expert['laboratoryKitStatus']) ?? undefined,
    status: item.status,
    reason: item.reason,
    isActive: item.isActive,
    assignedAt: withDates.assignedAt ?? withDates.createdAt,
    resultMediaUrl: item.laboratoryExpert?.mediaResult?.url,
    resultMediaId: item.laboratoryExpert?.mediaResult?.id ?? (item.resultMediaId ?? undefined),
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

  const nestedClient = isRecord(raw.client) ? raw.client : undefined
  const nestedKit = isRecord(raw.kit) ? raw.kit : undefined
  const kitClient = nestedKitId && isRecord((nestedKitId as Record<string, unknown>).client)
    ? ((nestedKitId as Record<string, unknown>).client as Record<string, unknown>)
    : undefined
  const kitClient2 = nestedKit && isRecord((nestedKit as Record<string, unknown>).client)
    ? ((nestedKit as Record<string, unknown>).client as Record<string, unknown>)
    : undefined
  const kitExpertClient = kitExpert && isRecord((kitExpert as Record<string, unknown>).client)
    ? ((kitExpert as Record<string, unknown>).client as Record<string, unknown>)
    : undefined

  const candidateScopes: Array<Record<string, unknown> | undefined> = [
    raw,
    nestedClient,
    nestedKit,
    nestedKitId,
    kitClient,
    kitClient2,
    kitExpert,
    kitExpertClient,
    laboratoryExpert,
  ]

  const anamnezForm =
    candidateScopes
      .map((s) => (s && isRecord(s.anamnezForm) ? (s.anamnezForm as Record<string, unknown>) : null))
      .find(Boolean) ??
    deepFindByKey<Record<string, unknown>>(
      raw,
      ['anamnezForm', 'anamnez_form'],
      isRecord
    ) ??
    null

  const foodConsumptionRecord =
    candidateScopes
      .map((s) => {
        if (!s) return null
        if (isRecord(s.foodConsumptionRecord)) return s.foodConsumptionRecord as Record<string, unknown>
        if (isRecord(s.food_consumption_record)) return s.food_consumption_record as Record<string, unknown>
        if (isRecord(s.foodConsumptionRecords)) return s.foodConsumptionRecords as Record<string, unknown>
        return null
      })
      .find(Boolean) ??
    deepFindByKey<Record<string, unknown>>(
      raw,
      ['foodConsumptionRecord', 'food_consumption_record', 'foodConsumptionRecords'],
      isRecord
    ) ??
    null

  const sleepQualityRecords =
    candidateScopes
      .map((s) => {
        if (!s) return null
        const v = (s.sleepQualityRecords ?? s.sleepQualityRecord ?? s.sleep_quality_records ?? s.sleep_quality_record) as unknown
        return Array.isArray(v) ? v : null
      })
      .find(Boolean) ??
    deepFindByKey<unknown[]>(
      raw,
      ['sleepQualityRecords', 'sleepQualityRecord', 'sleep_quality_records', 'sleep_quality_record'],
      Array.isArray
    ) ??
    null

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

    anamnezForm: anamnezForm as Expert['anamnezForm'],
    foodConsumptionRecord: foodConsumptionRecord as Expert['foodConsumptionRecord'],
    sleepQualityRecords: sleepQualityRecords as Expert['sleepQualityRecords'],
  }
}

export interface GetExpertsParams {
  page?: number
  limit?: number
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  /**
   * Backend supports:
   * - mode=tasks: returns Expert task records (legacy behavior)
   * - default: returns expert USERS for admin panel
   */
  mode?: 'tasks'
}

export interface GetExpertsResponse {
  experts: Expert[]
  totalItems?: number
  totalPages?: number
  currentPage?: number
}

/**
 * Uzman paneli — Expert tablosundaki analiz görevleri (mode=tasks).
 * Varsayılan GET /experts yanıtı expert profilleridir; bu fonksiyon görev satırlarını çeker.
 */
export async function getExpertTasks(
  params?: Omit<GetExpertsParams, 'mode'>,
): Promise<GetExpertsResponse> {
  return getExperts({ ...params, mode: 'tasks' })
}

/** GET /experts */
export async function getExperts(params?: GetExpertsParams): Promise<GetExpertsResponse> {
  const requestConfig: ApiRequestConfig = {
    ...skipAuth,
    params: params
      ? {
        page: params.page ?? 1,
        limit: params.limit ?? 50,
        ...(params.mode ? { mode: params.mode } : {}),
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

function mapApiRoleToAppRole(apiRole: string | undefined): UserRole {
  const roleMap: Record<string, UserRole> = {
    admin: UserRole.ADMIN,
    dietician: UserRole.DIETITIAN,
    laboratory: UserRole.LAB,
    expert: UserRole.SPECIALIST,
    client: UserRole.DANISAN,
  }
  return roleMap[(apiRole ?? '').toLowerCase()] ?? UserRole.DANISAN
}

function mapApiUserToAppUser(apiUser: ApiUser & { isVerified?: boolean; deletedAt?: string | null }): User {
  const isVerified = apiUser.isVerified
  const status = isVerified === false ? UserStatus.PENDING : UserStatus.ACTIVE
  return {
    id: String(apiUser.id ?? ''),
    email: apiUser.email ?? '',
    firstName: apiUser.firstName ?? '',
    lastName: apiUser.lastName ?? '',
    companyName: (apiUser as ApiUser & { companyName?: string | null }).companyName ?? null,
    phone: apiUser.phone,
    role: mapApiRoleToAppRole(apiUser.role),
    status,
    createdAt: apiUser.createdAt ?? new Date().toISOString(),
    updatedAt: apiUser.updatedAt ?? new Date().toISOString(),
    gender: (apiUser as ApiUser & { gender?: string }).gender as 'male' | 'female' | undefined,
    isVerified,
    deletedAt: (apiUser as ApiUser & { deletedAt?: string | null }).deletedAt,
  }
}

export interface GetExpertUsersWithPaginationParams {
  page?: number
  limit?: number
  search?: string
  isVerified?: boolean
}

export interface ExpertProfileListItem {
  expertProfileId: number
  user: User
}

export interface GetExpertProfilesWithPaginationResult {
  items: ExpertProfileListItem[]
  totalItems: number
  totalPages: number
  currentPage: number
}

/** GET /experts — admin: expert PROFILES pagination (default mode) */
export async function getExpertProfilesWithPagination(
  params: GetExpertUsersWithPaginationParams
): Promise<GetExpertProfilesWithPaginationResult> {
  const { data: body } = await api.get<{
    success?: boolean
    message?: string
    data?: {
      items?: Array<{
        id?: number
        user?: ApiUser & { isVerified?: boolean; deletedAt?: string | null }
      }>
      totalItems?: number
      totalPages?: number
      currentPage?: number
    }
  }>('/experts', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      ...(params.search && params.search.trim() ? { search: params.search.trim() } : {}),
      ...(params.isVerified === true || params.isVerified === false ? { isVerified: params.isVerified } : {}),
    },
  })

  const payload = body?.data
  const list = payload?.items ?? []
  return {
    items: list
      .map((row) => {
        const profileId = Number(row?.id)
        const u = row?.user
        if (!Number.isFinite(profileId) || profileId <= 0 || !u) return null
        return { expertProfileId: profileId, user: mapApiUserToAppUser(u) }
      })
      .filter(Boolean) as ExpertProfileListItem[],
    totalItems: payload?.totalItems ?? list.length,
    totalPages: payload?.totalPages ?? 1,
    currentPage: payload?.currentPage ?? 1,
  }
}

/** GET /experts/{id} */
export async function getExpertById(id: number | string): Promise<Expert | null> {
  let data: unknown
  try {
    ;({ data } = await api.get<unknown>(`/experts/${id}`, {
      ...skipAuth,
      params: { mode: 'tasks' },
    }))
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    // No assigned expert task yet → treat as empty state in UI (not a hard error).
    if (status === 404) return null
    throw err
  }

  // API iki formatta dönebilir:
  // 1) swagger: ExpertResponse
  // 2) prod: { success, message, data: { ...expert } }
  const top = isRecord(data) ? data : null
  const inner = top && isRecord(top.data) ? top.data : data

  if (isRecord(inner)) return mapApiExpertLoose(inner)
  return { id: typeof id === 'number' ? id : Number(id) || 0 }
}

export interface ExpertProfileDetail {
  expertProfileId: number
  user: User
  expertTasks: Expert[]
}

/** GET /experts/{id} — expert PROFILE detail (default mode) */
export async function getExpertProfileById(id: number | string): Promise<ExpertProfileDetail | null> {
  let data: unknown
  try {
    ;({ data } = await api.get<unknown>(`/experts/${id}`))
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) return null
    throw err
  }

  const top = isRecord(data) ? data : null
  const inner = top && isRecord(top.data) ? top.data : null
  if (!inner || !isRecord(inner)) return null

  const profileId = Number(inner.id)
  const u = inner.user
  const user = isRecord(u) ? (u as unknown as ApiUser & { isVerified?: boolean; deletedAt?: string | null }) : null
  if (!Number.isFinite(profileId) || profileId <= 0 || !user) return null

  const tasksRaw = (u as Record<string, unknown>).expertTasks
  const expertTasks = Array.isArray(tasksRaw) ? (tasksRaw as unknown[]).map(mapApiExpertLoose) : []

  return { expertProfileId: profileId, user: mapApiUserToAppUser(user), expertTasks }
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
