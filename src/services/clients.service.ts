import { api, type ApiRequestConfig } from '@/lib/axios'
import type { components } from '@/types/openapi'
import { readUserVerifiedTrue } from '@/lib/user-verified'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

type ApiClientResponse = components['schemas']['ClientResponse']
type ApiCreateClient = components['schemas']['CreateClient']
type ApiCreateClientLoose = Omit<ApiCreateClient, 'dieticianId'> & { dieticianId?: number }

export interface AppClient {
  id: number
  userId?: number
  firstName: string
  lastName: string
  phone: string
  email: string
  gender?: string
  identityNumber?: string
  createdAt: string
  updatedAt: string
  dieticianId?: number
  dieticianName?: string
  /** Danışan kullanıcı hesabı onaylı mı */
  isVerified: boolean
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object'
}

function toNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function mapApiClientToApp(item: ApiClientResponse): AppClient {
  const rec = item as unknown as Record<string, unknown>

  const idValue = rec.id
  const id =
    typeof idValue === 'number'
      ? idValue
      : typeof idValue === 'string' && idValue.trim() !== '' && Number.isFinite(Number(idValue))
        ? Number(idValue)
        : typeof item.id === 'number'
          ? item.id
          : 0

  // Backwards/forwards compatible mapping:
  // - some APIs return `user` object + `userId` number
  // - older openapi types may model `userId` as an embedded object
  const userCandidate = (rec.user ?? rec.userId) as unknown
  const user = isRecord(userCandidate) ? userCandidate : undefined

  // Dietician shape variants:
  // - `dieticianClient: { dietician: { id, user: { firstName, lastName, ... }}}`
  // - `dietician: { user: {...} }`
  // - `dieticianId: number`
  const dieticianClientCandidate = rec.dieticianClient as unknown
  const dieticianClient = isRecord(dieticianClientCandidate) ? dieticianClientCandidate : undefined
  const dieticianFromRelationCandidate = dieticianClient?.dietician as unknown
  const dieticianFromRelation = isRecord(dieticianFromRelationCandidate) ? dieticianFromRelationCandidate : undefined

  const dieticianCandidate = (rec.dietician ?? rec.dieticianId) as unknown
  const dietician = isRecord(dieticianCandidate) ? dieticianCandidate : undefined

  const dieticianUserCandidate = (dieticianFromRelation?.user ?? dietician?.user ?? dieticianFromRelation ?? dietician) as unknown
  const dieticianUser = isRecord(dieticianUserCandidate) ? dieticianUserCandidate : undefined

  const createdAt = (rec.createdAt ?? user?.createdAt) as string | undefined
  const updatedAt = (rec.updatedAt ?? user?.updatedAt) as string | undefined

  const dieticianId =
    toNumber(rec.dieticianId) ??
    toNumber(dieticianFromRelation?.id) ??
    toNumber(dietician?.id)

  const userId = toNumber(user?.id) ?? toNumber(rec.userId)

  return {
    id,
    userId,
    firstName: (user?.firstName as string | undefined) ?? '',
    lastName: (user?.lastName as string | undefined) ?? '',
    phone: (user?.phone as string | undefined) ?? '',
    email: (user?.email as string | undefined) ?? '',
    gender: user?.gender as string | undefined,
    identityNumber: user?.identityNumber as string | undefined,
    createdAt: typeof createdAt === 'string' ? createdAt : '',
    updatedAt: typeof updatedAt === 'string' ? updatedAt : '',
    dieticianId,
    dieticianName: dieticianUser
      ? `${(dieticianUser.firstName as string | undefined) ?? ''} ${(dieticianUser.lastName as string | undefined) ?? ''}`.trim() || undefined
      : undefined,
    isVerified: readUserVerifiedTrue(user),
  }
}

export interface GetClientsParams {
  page?: number
  limit?: number
  search?: string
}

export interface GetClientsResponse {
  clients: AppClient[]
  total?: number
  totalItems?: number
  totalPages?: number
  currentPage?: number
}

export interface ClientDetail {
  id: number
  userId?: number
  createdAt?: string
  updatedAt?: string
  user?: {
    id: number
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
    addresses?: unknown[]
  }
  anamnezForm?: {
    id?: number
    clientId?: number
    chronicIllness?: string
    medicationUsed?: string
    foodAllergy?: string
    bodyWeight?: string | number
    bodyHeight?: string | number
    waistCircumference?: string | number
    hipCircumference?: string | number
    profession?: string
    education?: string
    createdAt?: string
    updatedAt?: string
    deletedAt?: string | null
  }
  foodConsumptionRecord?: {
    id?: number
    clientId?: number
    mealsPerDay?: number
    alcoholFrequency?: string
    smokingFrequency?: string
    avoidedFoods?: string
    dailyWaterLiters?: number
    fastFoodMealsPerDay?: number
    defecationFrequency?: string
    discomfortFoods?: string
    bowelIssue?: string
    gastrointestinalDisease?: string
    nightEatingHabit?: boolean
    eatingDisorderBehaviors?: boolean
    createdAt?: string
    updatedAt?: string
    deletedAt?: string | null
  }
  sleepQualityRecords?: Array<{
    id?: number
    clientId?: number
    recordDate?: string
    usualBedTime?: string
    sleepLatencyMinutes?: number
    usualWakeTime?: string
    sleepHours?: number
    cannotFallAsleepWithin30?: number
    wakeToUseBathroom?: number
    cannotBreatheComfortably?: number
    coughOrSnoreLoudly?: number
    feelTooCold?: number
    feelTooHot?: number
    badDreams?: number
    pain?: number
    subjectiveSleepQuality?: number
    sleepMedicationFrequency?: number
    daytimeSleepinessFrequency?: number
    lackOfEnthusiasmProblem?: number
    bedPartnerSituation?: number
    notes?: string
    createdAt?: string
    updatedAt?: string
    deletedAt?: string | null
  }>
  dietician?: {
    id?: number
    userId?: number
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
  }
}

function asObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function asBoolean(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v === 1
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase()
    if (s === 'true' || s === '1') return true
    if (s === 'false' || s === '0') return false
  }
  return undefined
}

/** GET /clients/{clientId} — full client detail (user + anamnezForm + dieticianClient) */
export async function getClientDetail(clientId: number | string): Promise<ClientDetail> {
  const { data } = await api.get<unknown>(`/clients/${clientId}`, skipAuth)
  const top = asObj(data)
  const payload = top && 'data' in top ? top.data : data
  const item = asObj(payload) ?? {}

  const user = asObj(item.user)
  const anamnez = asObj(item.anamnezForm)
  const food = asObj(item.foodConsumptionRecord ?? item.food_consumption_record)
  const sleepListRaw = (item.sleepQualityRecords ?? item.sleep_quality_records) as unknown
  const sleepList = Array.isArray(sleepListRaw) ? sleepListRaw.map(asObj).filter(Boolean) : []
  const dieticianClient = asObj(item.dieticianClient)
  const dietician = asObj(dieticianClient?.dietician)
  const dieticianUser = asObj(dietician?.user)

  const detail: ClientDetail = {
    id: asNumber(item.id) ?? Number(clientId),
    userId: asNumber(item.userId),
    createdAt: asString(item.createdAt),
    updatedAt: asString(item.updatedAt),
    user: user
      ? {
        id: asNumber(user.id) ?? 0,
        firstName: asString(user.firstName),
        lastName: asString(user.lastName),
        phone: asString(user.phone),
        email: asString(user.email),
        addresses: Array.isArray(user.addresses) ? user.addresses : [],
      }
      : undefined,
    anamnezForm: anamnez
      ? {
        id: asNumber(anamnez.id),
        clientId: asNumber(anamnez.clientId),
        chronicIllness: asString(anamnez.chronic_illness),
        medicationUsed: asString(anamnez.medication_used),
        foodAllergy: asString(anamnez.food_allergy),
        bodyWeight: (asString(anamnez.body_weight) ?? asNumber(anamnez.body_weight)) as string | number | undefined,
        bodyHeight: (asString(anamnez.body_height) ?? asNumber(anamnez.body_height)) as string | number | undefined,
        waistCircumference: (asString(anamnez.waist_circumference) ?? asNumber(anamnez.waist_circumference)) as
          | string
          | number
          | undefined,
        hipCircumference: (asString(anamnez.hip_circumference) ?? asNumber(anamnez.hip_circumference)) as
          | string
          | number
          | undefined,
        profession: asString(anamnez.profession),
        education: asString(anamnez.education),
        createdAt: asString(anamnez.createdAt),
        updatedAt: asString(anamnez.updatedAt),
        deletedAt: (asString(anamnez.deletedAt) ?? null) as string | null,
      }
      : undefined,
    foodConsumptionRecord: food
      ? {
        id: asNumber(food.id),
        clientId: asNumber(food.clientId ?? food.client_id),
        mealsPerDay: asNumber(food.mealsPerDay ?? food.meals_per_day),
        alcoholFrequency: asString(food.alcoholFrequency ?? food.alcohol_frequency),
        smokingFrequency: asString(food.smokingFrequency ?? food.smoking_frequency),
        avoidedFoods: asString(food.avoidedFoods ?? food.avoided_foods),
        dailyWaterLiters: asNumber(food.dailyWaterLiters ?? food.daily_water_liters),
        fastFoodMealsPerDay: asNumber(food.fastFoodMealsPerDay ?? food.fast_food_meals_per_day),
        defecationFrequency: asString(food.defecationFrequency ?? food.defecation_frequency),
        discomfortFoods: asString(food.discomfortFoods ?? food.discomfort_foods),
        bowelIssue: asString(food.bowelIssue ?? food.bowel_issue),
        gastrointestinalDisease: asString(food.gastrointestinalDisease ?? food.gastrointestinal_disease),
        nightEatingHabit: asBoolean(food.nightEatingHabit ?? food.night_eating_habit),
        eatingDisorderBehaviors: asBoolean(food.eatingDisorderBehaviors ?? food.eating_disorder_behaviors),
        createdAt: asString(food.createdAt),
        updatedAt: asString(food.updatedAt),
        deletedAt: (asString(food.deletedAt) ?? null) as string | null,
      }
      : undefined,
    sleepQualityRecords: sleepList.length
      ? sleepList.map((r) => ({
        id: asNumber(r?.id),
        clientId: asNumber(r?.clientId ?? r?.client_id),
        recordDate: asString(r?.recordDate ?? r?.record_date),
        usualBedTime: asString(r?.usualBedTime ?? r?.usual_bed_time),
        sleepLatencyMinutes: asNumber(r?.sleepLatencyMinutes ?? r?.sleep_latency_minutes),
        usualWakeTime: asString(r?.usualWakeTime ?? r?.usual_wake_time),
        sleepHours: (asNumber(r?.sleepHours ?? r?.sleep_hours) as number | undefined) ?? undefined,
        cannotFallAsleepWithin30: asNumber(r?.cannotFallAsleepWithin30 ?? r?.cannot_fall_asleep_within_30),
        wakeToUseBathroom: asNumber(r?.wakeToUseBathroom ?? r?.wake_to_use_bathroom),
        cannotBreatheComfortably: asNumber(r?.cannotBreatheComfortably ?? r?.cannot_breathe_comfortably),
        coughOrSnoreLoudly: asNumber(r?.coughOrSnoreLoudly ?? r?.cough_or_snore_loudly),
        feelTooCold: asNumber(r?.feelTooCold ?? r?.feel_too_cold),
        feelTooHot: asNumber(r?.feelTooHot ?? r?.feel_too_hot),
        badDreams: asNumber(r?.badDreams ?? r?.bad_dreams),
        pain: asNumber(r?.pain),
        subjectiveSleepQuality: asNumber(r?.subjectiveSleepQuality ?? r?.subjective_sleep_quality),
        sleepMedicationFrequency: asNumber(r?.sleepMedicationFrequency ?? r?.sleep_medication_frequency),
        daytimeSleepinessFrequency: asNumber(r?.daytimeSleepinessFrequency ?? r?.daytime_sleepiness_frequency),
        lackOfEnthusiasmProblem: asNumber(r?.lackOfEnthusiasmProblem ?? r?.lack_of_enthusiasm_problem),
        bedPartnerSituation: asNumber(r?.bedPartnerSituation ?? r?.bed_partner_situation),
        notes: asString(r?.notes),
        createdAt: asString(r?.createdAt),
        updatedAt: asString(r?.updatedAt),
        deletedAt: (asString(r?.deletedAt) ?? null) as string | null,
      }))
      : undefined,
    dietician: dieticianUser
      ? {
        id: asNumber(dietician?.id),
        userId: asNumber(dietician?.userId),
        firstName: asString(dieticianUser.firstName),
        lastName: asString(dieticianUser.lastName),
        phone: asString(dieticianUser.phone),
        email: asString(dieticianUser.email),
      }
      : undefined,
  }

  return detail
}

/** GET /clients */
export async function getClients(params?: GetClientsParams): Promise<GetClientsResponse> {
  const { data } = await api.get<unknown>('/clients', {
    ...skipAuth,
    params: params
      ? { page: params.page ?? 1, limit: params.limit ?? 50, ...(params.search && { search: params.search }) }
      : undefined,
  })
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const payload = top && 'data' in top ? top.data : data

  const dedupeClients = (rows: AppClient[]) => {
    const seenUserIds = new Set<number>()
    return rows.filter((row) => {
      const key = row.userId ?? row.id
      if (seenUserIds.has(key)) return false
      seenUserIds.add(key)
      return true
    })
  }

  // Common pagination shape: { totalItems, totalPages, currentPage, items: [...] }
  if (payload && typeof payload === 'object' && 'items' in (payload as Record<string, unknown>)) {
    const obj = payload as Record<string, unknown>
    const list = Array.isArray(obj.items) ? (obj.items as ApiClientResponse[]) : []
    const clients = dedupeClients(list.map(mapApiClientToApp))
    return {
      clients,
      total: clients.length,
      totalItems: asNumber(obj.totalItems),
      totalPages: asNumber(obj.totalPages),
      currentPage: asNumber(obj.currentPage),
    }
  }

  if (payload && typeof payload === 'object' && 'clients' in (payload as Record<string, unknown>)) {
    const list = ((payload as Record<string, unknown>).clients as ApiClientResponse[]) ?? []
    const clients = dedupeClients(list.map(mapApiClientToApp))
    return { clients, total: clients.length }
  }

  const list: ApiClientResponse[] = Array.isArray(payload) ? payload : []
  const clients = dedupeClients(list.map(mapApiClientToApp))
  return { clients, total: clients.length }
}

/** GET /clients/{clientId} */
export async function getClientById(clientId: number | string): Promise<AppClient> {
  const { data } = await api.get<unknown>(`/clients/${clientId}`, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiClientResponse
  return mapApiClientToApp(item)
}

/** POST /clients */
export async function createClient(payload: {
  firstName: string
  lastName: string
  phone: string
  email?: string
  gender: 'male' | 'female'
  identityNumber?: string
  anamnezForm?: {
    chronicIllness?: string
    medicationUsed?: string
    foodAllergy?: string
    bodyWeight?: number
    bodyHeight?: number
    waistCircumference?: number
    hipCircumference?: number
    profession?: string
    education?: string
  }
  dieticianId?: number
}): Promise<AppClient> {
  const body: ApiCreateClientLoose = {
    userId: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      email: payload.email,
      role: 'client',
      gender: payload.gender,
      identityNumber: payload.identityNumber,
    },
    ...(typeof payload.dieticianId === 'number' ? { dieticianId: payload.dieticianId } : {}),
  }

  if (payload.anamnezForm) {
    const anamnez: Record<string, unknown> = {}
    if (payload.anamnezForm.chronicIllness) anamnez.chronic_illness = payload.anamnezForm.chronicIllness
    if (payload.anamnezForm.medicationUsed) anamnez.medication_used = payload.anamnezForm.medicationUsed
    if (payload.anamnezForm.foodAllergy) anamnez.food_allergy = payload.anamnezForm.foodAllergy
    if (typeof payload.anamnezForm.bodyWeight === 'number') anamnez.body_weight = payload.anamnezForm.bodyWeight
    if (typeof payload.anamnezForm.bodyHeight === 'number') anamnez.body_height = payload.anamnezForm.bodyHeight
    if (typeof payload.anamnezForm.waistCircumference === 'number') anamnez.waist_circumference = payload.anamnezForm.waistCircumference
    if (typeof payload.anamnezForm.hipCircumference === 'number') anamnez.hip_circumference = payload.anamnezForm.hipCircumference
    if (payload.anamnezForm.profession) anamnez.profession = payload.anamnezForm.profession
    if (payload.anamnezForm.education) anamnez.education = payload.anamnezForm.education

    if (Object.keys(anamnez).length) {
      body.anamnezForm = anamnez as unknown as ApiCreateClient['anamnezForm']
    }
  }

  const { data } = await api.post<unknown>('/clients', body as unknown as ApiCreateClient, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiClientResponse
  return mapApiClientToApp(item)
}

/** PUT /clients/{clientId} — diyetisyen değiştir */
export async function updateClientDietician(clientId: number | string, dieticianId: number): Promise<AppClient> {
  const { data } = await api.put<unknown>(`/clients/${clientId}`, { dieticianId }, skipAuth)
  const top = data && typeof data === 'object' ? (data as Record<string, unknown>) : null
  const item = (top && 'data' in top ? top.data : data) as ApiClientResponse
  return mapApiClientToApp(item)
}
