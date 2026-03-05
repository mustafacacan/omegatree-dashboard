import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Laboratory } from '@/types/laboratory.types'
import {
  getLaboratories as apiGetLaboratories,
  createLaboratory as apiCreateLaboratory,
  updateLaboratory as apiUpdateLaboratory,
  deleteLaboratory as apiDeleteLaboratory,
  assignDietitianToLab,
} from '@/services/laboratories.service'

interface SubmitResult {
  ok: boolean
  message: string
}

interface LaboratoriesState {
  laboratories: Laboratory[]
  loading: boolean
  error: string | null
  fetchLaboratories: () => Promise<void>
  createLaboratory: (payload: Parameters<typeof apiCreateLaboratory>[0]) => Promise<SubmitResult>
  updateLaboratory: (id: string, payload: { cargofirm?: string; cargoNumber?: string }) => Promise<SubmitResult>
  deleteLaboratory: (id: string) => Promise<SubmitResult>
  assignDietitian: (laboratoryId: string, dietitianId: string) => Promise<SubmitResult>
  unassignDietitian: (laboratoryId: string, dietitianId: string) => SubmitResult
  setLaboratories: (labs: Laboratory[]) => void
}

export const useLaboratoriesStore = create<LaboratoriesState>()(
  persist(
    (set, get) => ({
      laboratories: [],
      loading: false,
      error: null,

      fetchLaboratories: async () => {
        set({ loading: true, error: null })
        try {
          const labs = await apiGetLaboratories()
          set({ laboratories: labs, loading: false })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Laboratuvarlar yüklenemedi'
          set({ error: msg, loading: false })
        }
      },

      createLaboratory: async (payload) => {
        try {
          const newLab = await apiCreateLaboratory(payload)
          set((state) => ({ laboratories: [newLab, ...state.laboratories] }))
          return { ok: true, message: 'Laboratuvar başarıyla oluşturuldu.' }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Laboratuvar oluşturulamadı.'
          return { ok: false, message: msg }
        }
      },

      updateLaboratory: async (id, payload) => {
        try {
          const updated = await apiUpdateLaboratory(id, payload)
          set((state) => ({
            laboratories: state.laboratories.map((l) => (l.id === id ? updated : l)),
          }))
          return { ok: true, message: 'Laboratuvar başarıyla güncellendi.' }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Laboratuvar güncellenemedi.'
          return { ok: false, message: msg }
        }
      },

      deleteLaboratory: async (id) => {
        try {
          await apiDeleteLaboratory(id)
          set((state) => ({
            laboratories: state.laboratories.filter((l) => l.id !== id),
          }))
          return { ok: true, message: 'Laboratuvar başarıyla silindi.' }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Laboratuvar silinemedi.'
          return { ok: false, message: msg }
        }
      },

      assignDietitian: async (laboratoryId, dietitianId) => {
        try {
          await assignDietitianToLab(Number(laboratoryId), Number(dietitianId))
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
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Diyetisyen atanamadı.'
          return { ok: false, message: msg }
        }
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

      setLaboratories: (labs) => set({ laboratories: labs }),
    }),
    {
      name: 'omegatree-laboratories',
      version: 2,
      migrate: () => ({
        laboratories: [],
        loading: false,
        error: null,
      }),
      partialize: (state) => ({ laboratories: state.laboratories }),
    }
  )
)
