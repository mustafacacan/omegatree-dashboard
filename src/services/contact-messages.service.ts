import { api } from '@/lib/axios'

export type ContactMessage = {
  id: number
  fullname: string
  email: string
  subject: string
  message: string
  createdAt: string
  updatedAt: string
}

export type ContactMessagePage = {
  items: ContactMessage[]
  totalItems: number
  totalPages: number
  currentPage: number
}

function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export async function getContactMessages(params: { page: number; limit: number; search?: string }) {
  const { data } = await api.get('/contact-messages', { params })
  return unwrap<ContactMessagePage>(data)
}

export async function deleteContactMessage(id: number) {
  await api.delete(`/contact-messages/${id}`)
}
