import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DietitianSettingsState {
  /** Diyetisyen bazinda minimum stok limiti; altina dusunce uyari verilir */
  minStockAlert: number
  setMinStockAlert: (value: number) => void
}

export const useDietitianSettingsStore = create<DietitianSettingsState>()(
  persist(
    (set) => ({
      minStockAlert: 0,
      setMinStockAlert: (value) => set({ minStockAlert: Math.max(0, value) }),
    }),
    { name: 'omegatree-dietitian-settings' }
  )
)
