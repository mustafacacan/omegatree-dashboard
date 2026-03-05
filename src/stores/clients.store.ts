import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { KitStatus } from '@/utils/constants'
import {
  getClients as apiGetClients,
  createClient as apiCreateClient,
  getClientById as apiGetClientById,
  type AppClient,
} from '@/services/clients.service'
import { getDieticianClients } from '@/services/dietician-clients.service'

export type ClientRecord = {
  id: string
  name: string
  phone: string
  email: string
  kitCount: number
  activeKit: KitStatus | null
  createdAt: string
  gender?: string
}

function mapAppClientToRecord(c: AppClient): ClientRecord {
  return {
    id: String(c.id),
    name: `${c.firstName} ${c.lastName}`.trim(),
    phone: c.phone,
    email: c.email,
    kitCount: 0,
    activeKit: null,
    createdAt: c.createdAt ? c.createdAt.slice(0, 10) : '',
    gender: c.gender,
  }
}

interface ClientsState {
  clients: ClientRecord[]
  loading: boolean
  error: string | null
  fetchClients: () => Promise<void>
  fetchDieticianClients: (dieticianId: number | string) => Promise<void>
  addClient: (data: {
    firstName: string
    lastName: string
    phone: string
    email?: string
    gender?: 'male' | 'female'
    dieticianId?: number
  }) => Promise<{ id: string }>
  getClientById: (id: string) => ClientRecord | undefined
  setClients: (clients: ClientRecord[]) => void
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set, get) => ({
      clients: [],
      loading: false,
      error: null,

      fetchClients: async () => {
        set({ loading: true, error: null })
        try {
          const res = await apiGetClients({ limit: 200 })
          set({ clients: res.clients.map(mapAppClientToRecord), loading: false })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Danışanlar yüklenemedi'
          set({ error: msg, loading: false })
        }
      },

      fetchDieticianClients: async (dieticianId) => {
        set({ loading: true, error: null })
        try {
          const list = await getDieticianClients(dieticianId)
          const records: ClientRecord[] = list.map((dc) => ({
            id: String(dc.clientId ?? dc.id),
            name: dc.clientName ?? '',
            phone: dc.clientPhone ?? '',
            email: dc.clientEmail ?? '',
            kitCount: 0,
            activeKit: null,
            createdAt: dc.createdAt ? dc.createdAt.slice(0, 10) : '',
          }))
          set({ clients: records, loading: false })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Danışanlar yüklenemedi'
          set({ error: msg, loading: false })
        }
      },

      addClient: async (data) => {
        try {
          const created = await apiCreateClient({
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            email: data.email,
            gender: data.gender ?? 'male',
            dieticianId: data.dieticianId ?? 0,
          })
          const record = mapAppClientToRecord(created)
          set((state) => ({ clients: [record, ...state.clients] }))
          return { id: record.id }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Danışan oluşturulamadı'
          throw new Error(msg)
        }
      },

      getClientById: (id) => get().clients.find((c) => c.id === id),

      setClients: (clients) => set({ clients }),
    }),
    {
      name: 'omegatree-clients',
      version: 2,
      migrate: () => ({ clients: [], loading: false, error: null }),
    }
  )
)
