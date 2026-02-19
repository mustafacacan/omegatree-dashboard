import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { KitStatus } from '@/utils/constants'

export type ClientRecord = {
  id: string
  name: string
  phone: string
  email: string
  kitCount: number
  activeKit: KitStatus | null
  createdAt: string
}

function generateClientId(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  return `${y}${m}${day}${seq}`
}

const initialClients: ClientRecord[] = [
  { id: '20250601001', name: 'Ahmet Yildiz', phone: '05321111111', email: 'ahmet@email.com', kitCount: 2, activeKit: KitStatus.IN_ANALYSIS, createdAt: '2025-03-10' },
  { id: '20250601002', name: 'Selin Kara', phone: '05322222222', email: 'selin@email.com', kitCount: 1, activeKit: KitStatus.COMPLETED, createdAt: '2025-04-15' },
  { id: '20250601003', name: 'Emre Demir', phone: '05323333333', email: 'emre@email.com', kitCount: 1, activeKit: KitStatus.SAMPLE_SENT, createdAt: '2025-05-20' },
  { id: '20250601004', name: 'Deniz Ak', phone: '05324444444', email: 'deniz@email.com', kitCount: 3, activeKit: KitStatus.DELIVERED, createdAt: '2025-01-08' },
  { id: '20250601005', name: 'Buse Celik', phone: '05325555555', email: 'buse@email.com', kitCount: 0, activeKit: null, createdAt: '2025-06-14' },
]

interface ClientsState {
  clients: ClientRecord[]
  addClient: (data: { firstName: string; lastName: string; phone: string; email?: string; address?: string; birthDate?: string }) => { id: string }
  getClientById: (id: string) => ClientRecord | undefined
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set, get) => ({
      clients: initialClients,

      addClient: (data) => {
        const id = generateClientId()
        const name = `${data.firstName} ${data.lastName}`.trim()
        const client: ClientRecord = {
          id,
          name,
          phone: data.phone,
          email: data.email || '',
          kitCount: 0,
          activeKit: null,
          createdAt: new Date().toISOString().slice(0, 10),
        }
        set((state) => ({ clients: [client, ...state.clients] }))
        return { id }
      },

      getClientById: (id) => get().clients.find((c) => c.id === id),
    }),
    { name: 'omegatree-clients' }
  )
)
