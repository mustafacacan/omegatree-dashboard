import { api, type ApiRequestConfig } from '@/lib/axios'

const skipAuth: ApiRequestConfig = { skipAuthRedirect: true }

export type IpaqRecord = {
  id?: number
  clientId?: number
  vigorousDays?: number | null
  vigorousNone?: boolean
  vigorousHours?: number | null
  vigorousMinutes?: number | null
  vigorousUnknown?: boolean
  moderateDays?: number | null
  moderateNone?: boolean
  moderateHours?: number | null
  moderateMinutes?: number | null
  moderateUnknown?: boolean
  walkDays?: number | null
  walkNone?: boolean
  walkHours?: number | null
  walkMinutes?: number | null
  walkUnknown?: boolean
  sittingHours?: number | null
  sittingMinutes?: number | null
  sittingUnknown?: boolean
  createdAt?: string
  updatedAt?: string
}

export type CreateIpaqRecord = IpaqRecord & { clientId?: number }

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null
}

function unwrapData(v: unknown): unknown {
  const top = asRecord(v)
  if (!top || !('data' in top)) return v
  return top.data
}

function mapIpaq(row: unknown): IpaqRecord | null {
  if (row == null) return null
  const rec = asRecord(row) ?? {}
  return {
    id: rec.id != null ? Number(rec.id) : undefined,
    clientId: rec.clientId != null ? Number(rec.clientId) : undefined,
    vigorousDays: rec.vigorousDays != null ? Number(rec.vigorousDays) : null,
    vigorousNone: Boolean(rec.vigorousNone),
    vigorousHours: rec.vigorousHours != null ? Number(rec.vigorousHours) : null,
    vigorousMinutes: rec.vigorousMinutes != null ? Number(rec.vigorousMinutes) : null,
    vigorousUnknown: Boolean(rec.vigorousUnknown),
    moderateDays: rec.moderateDays != null ? Number(rec.moderateDays) : null,
    moderateNone: Boolean(rec.moderateNone),
    moderateHours: rec.moderateHours != null ? Number(rec.moderateHours) : null,
    moderateMinutes: rec.moderateMinutes != null ? Number(rec.moderateMinutes) : null,
    moderateUnknown: Boolean(rec.moderateUnknown),
    walkDays: rec.walkDays != null ? Number(rec.walkDays) : null,
    walkNone: Boolean(rec.walkNone),
    walkHours: rec.walkHours != null ? Number(rec.walkHours) : null,
    walkMinutes: rec.walkMinutes != null ? Number(rec.walkMinutes) : null,
    walkUnknown: Boolean(rec.walkUnknown),
    sittingHours: rec.sittingHours != null ? Number(rec.sittingHours) : null,
    sittingMinutes: rec.sittingMinutes != null ? Number(rec.sittingMinutes) : null,
    sittingUnknown: Boolean(rec.sittingUnknown),
    createdAt: rec.createdAt as string | undefined,
    updatedAt: rec.updatedAt as string | undefined,
  }
}

/** POST /ipaq-records */
export async function upsertIpaqRecord(payload: CreateIpaqRecord): Promise<IpaqRecord> {
  const { data } = await api.post<unknown>('/ipaq-records', payload, skipAuth)
  return mapIpaq(unwrapData(data)) ?? {}
}

/** Danışan kendi kaydı — clientId sunucuda otomatik çözülür */
export async function getMyIpaqRecord(): Promise<IpaqRecord | null> {
  return getIpaqForClient(0)
}

/** GET /ipaq-records/client/:clientId */
export async function getIpaqForClient(clientId: number | string): Promise<IpaqRecord | null> {
  try {
    const { data } = await api.get<unknown>(`/ipaq-records/client/${clientId}`, skipAuth)
    const payload = unwrapData(data)
    if (payload == null) return null
    return mapIpaq(payload)
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response?.status
    if (status === 404) return null
    throw err
  }
}
