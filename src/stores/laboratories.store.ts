import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'
import type { Laboratory, CreateLaboratoryRequest, UpdateLaboratoryRequest } from '@/types/laboratory.types'

interface SubmitResult {
  ok: boolean
  message: string
}

interface LaboratoriesState {
  laboratories: Laboratory[]
  createLaboratory: (request: CreateLaboratoryRequest) => SubmitResult
  updateLaboratory: (id: string, request: UpdateLaboratoryRequest) => SubmitResult
  deleteLaboratory: (id: string) => SubmitResult
  assignDietitian: (laboratoryId: string, dietitianId: string) => SubmitResult
  unassignDietitian: (laboratoryId: string, dietitianId: string) => SubmitResult
}

const seedLaboratories: Laboratory[] = [
  {
    id: 'lab-1',
    name: 'OmegaTree Merkez Laboratuvar',
    address: 'Atatürk Bulvarı No:123',
    city: 'Ankara',
    district: 'Çankaya',
    postalCode: '06100',
    phone: '03121234567',
    email: 'merkez@omegatree.com',
    assignedDietitians: ['u-dietitian-1'],
    createdAt: '2025-01-01T09:00:00.000Z',
    updatedAt: '2025-01-01T09:00:00.000Z',
  },
]

export const useLaboratoriesStore = create<LaboratoriesState>()(
  persist(
    (set, get) => ({
      laboratories: seedLaboratories,

      createLaboratory: (request) => {
        if (!request.name || !request.address || !request.city) {
          return { ok: false, message: 'Laboratuvar adı, adres ve şehir zorunludur.' }
        }

        const now = new Date().toISOString()
        const newLaboratory: Laboratory = {
          id: generateId('lab-'),
          name: request.name.trim(),
          address: request.address.trim(),
          city: request.city.trim(),
          district: request.district?.trim(),
          postalCode: request.postalCode?.trim(),
          phone: request.phone?.trim(),
          email: request.email?.trim(),
          assignedDietitians: [],
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          laboratories: [newLaboratory, ...state.laboratories],
        }))

        return { ok: true, message: 'Laboratuvar başarıyla oluşturuldu.' }
      },

      updateLaboratory: (id, request) => {
        const target = get().laboratories.find((l) => l.id === id)
        if (!target) {
          return { ok: false, message: 'Laboratuvar bulunamadı.' }
        }

        set((state) => ({
          laboratories: state.laboratories.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...(request.name && { name: request.name.trim() }),
                  ...(request.address && { address: request.address.trim() }),
                  ...(request.city && { city: request.city.trim() }),
                  ...(request.district !== undefined && { district: request.district?.trim() }),
                  ...(request.postalCode !== undefined && { postalCode: request.postalCode?.trim() }),
                  ...(request.phone !== undefined && { phone: request.phone?.trim() }),
                  ...(request.email !== undefined && { email: request.email?.trim() }),
                  ...(request.assignedDietitians !== undefined && { assignedDietitians: request.assignedDietitians }),
                  updatedAt: new Date().toISOString(),
                }
              : l
          ),
        }))

        return { ok: true, message: 'Laboratuvar başarıyla güncellendi.' }
      },

      deleteLaboratory: (id) => {
        const target = get().laboratories.find((l) => l.id === id)
        if (!target) {
          return { ok: false, message: 'Laboratuvar bulunamadı.' }
        }

        set((state) => ({
          laboratories: state.laboratories.filter((l) => l.id !== id),
        }))

        return { ok: true, message: 'Laboratuvar başarıyla silindi.' }
      },

      assignDietitian: (laboratoryId, dietitianId) => {
        const laboratory = get().laboratories.find((l) => l.id === laboratoryId)
        if (!laboratory) {
          return { ok: false, message: 'Laboratuvar bulunamadı.' }
        }

        if (laboratory.assignedDietitians.includes(dietitianId)) {
          return { ok: false, message: 'Bu diyetisyen zaten bu laboratuvara atanmış.' }
        }

        set((state) => ({
          laboratories: state.laboratories.map((l) =>
            l.id === laboratoryId
              ? {
                  ...l,
                  assignedDietitians: [...l.assignedDietitians, dietitianId],
                  updatedAt: new Date().toISOString(),
                }
              : l
          ),
        }))

        return { ok: true, message: 'Diyetisyen laboratuvara atandı.' }
      },

      unassignDietitian: (laboratoryId, dietitianId) => {
        const laboratory = get().laboratories.find((l) => l.id === laboratoryId)
        if (!laboratory) {
          return { ok: false, message: 'Laboratuvar bulunamadı.' }
        }

        set((state) => ({
          laboratories: state.laboratories.map((l) =>
            l.id === laboratoryId
              ? {
                  ...l,
                  assignedDietitians: l.assignedDietitians.filter((id) => id !== dietitianId),
                  updatedAt: new Date().toISOString(),
                }
              : l
          ),
        }))

        return { ok: true, message: 'Diyetisyen ataması kaldırıldı.' }
      },
    }),
    {
      name: 'omegatree-laboratories',
      version: 1,
      migrate: () => ({
        laboratories: seedLaboratories,
      }),
      partialize: (state) => ({ laboratories: state.laboratories }),
    }
  )
)

