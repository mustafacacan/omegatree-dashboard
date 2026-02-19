import { create } from 'zustand'
import type { ReactNode } from 'react'

interface HeaderState {
  actions: ReactNode | null
  setActions: (actions: ReactNode | null) => void
  clearActions: () => void
}

export const useHeaderStore = create<HeaderState>((set) => ({
  actions: null,
  setActions: (actions) => set({ actions }),
  clearActions: () => set({ actions: null }),
}))
