import { api } from '@/lib/axios'

export type SupportTicketType = 'request' | 'support' | 'complaint'
export type SupportTicketCategory =
  | 'technical'
  | 'diet'
  | 'expert'
  | 'laboratory'
  | 'general'
  | 'other'
export type SupportTicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting'
  | 'waiting_for_staff'
  | 'escalated'
  | 'resolved'
  | 'closed'

export type SupportTicket = {
  id: number
  type: SupportTicketType
  category: SupportTicketCategory
  subject: string
  description: string
  status: SupportTicketStatus
  priority: 'low' | 'normal' | 'high'
  createdByUserId: number
  assignedToUserId?: number | null
  routedToRole?: string | null
  routingReason?: string | null
  escalationReason?: string | null
  createdAt: string
  updatedAt: string
  createdBy?: {
    id: number
    firstName?: string
    lastName?: string
    phone?: string
    email?: string
    role?: string
  }
  assignee?: {
    id: number
    firstName?: string
    lastName?: string
  } | null
  messages?: Array<{
    id: number
    body: string
    isInternal: boolean
    createdAt: string
    mediaId?: number | null
    media?: {
      id: number
      url: string
      filename: string
      mimetype?: string | null
    } | null
    author?: { id: number; firstName?: string; lastName?: string; role?: string }
  }>
}

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export async function listSupportTickets(params?: {
  page?: number
  limit?: number
  status?: string
  type?: string
  category?: string
  search?: string
}) {
  const { data } = await api.get('/support-tickets', { params })
  return unwrapData<{
    data?: SupportTicket[]
    items?: SupportTicket[]
    total?: number
    page?: number
    limit?: number
  }>(data)
}

export async function getSupportTicket(id: number | string) {
  const { data } = await api.get(`/support-tickets/${id}`)
  return unwrapData<SupportTicket>(data)
}

export async function createSupportTicket(payload: {
  type: SupportTicketType
  category: SupportTicketCategory
  subject: string
  description: string
  priority?: 'low' | 'normal' | 'high'
}) {
  const { data } = await api.post('/support-tickets', payload)
  return unwrapData<SupportTicket>(data)
}

export async function updateSupportTicket(
  id: number | string,
  payload: {
    status?: SupportTicketStatus
    assignedToUserId?: number | null
    priority?: 'low' | 'normal' | 'high'
    category?: SupportTicketCategory
  },
) {
  const { data } = await api.put(`/support-tickets/${id}`, payload)
  return unwrapData<SupportTicket>(data)
}

export async function escalateSupportTicket(
  id: number | string,
  payload?: { reason?: string },
) {
  const { data } = await api.post(`/support-tickets/${id}/escalate`, payload ?? {})
  return unwrapData<SupportTicket>(data)
}

export async function addSupportTicketMessage(
  id: number | string,
  payload: { body?: string; isInternal?: boolean; file?: File | null },
) {
  if (payload.file) {
    const form = new FormData()
    form.append('body', payload.body?.trim() ?? '')
    if (payload.isInternal) form.append('isInternal', 'true')
    form.append('file', payload.file)
    const { data } = await api.post(`/support-tickets/${id}/messages`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return unwrapData<SupportTicket>(data)
  }

  const { data } = await api.post(`/support-tickets/${id}/messages`, {
    body: payload.body,
    isInternal: payload.isInternal,
  })
  return unwrapData<SupportTicket>(data)
}

export async function getAdminPendingTasks() {
  const { data } = await api.get('/dashboard/admin/pending-tasks')
  return unwrapData<{
    summary: {
      expert: { pending: number; inProgress: number; completed: number }
      laboratory: { pending: number; inProgress: number; completed: number }
      dietician: { pending: number; inProgress: number; completed: number }
      supportTicketsOpen: number
    }
    recent: {
      experts: unknown[]
      laboratoryKits: unknown[]
      dieticianKits: unknown[]
    }
  }>(data)
}
