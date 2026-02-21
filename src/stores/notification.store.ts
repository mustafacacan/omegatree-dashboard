import { create } from 'zustand'
import type { Notification } from '@/types/notification.types'

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', userId: '', type: 'KIT_DELIVERED', title: 'Kit teslim alindi', message: 'OT-2025-00142 numarali kit basariyla danisana atandi ve kargo surecine hazirlandi.', read: false, createdAt: new Date(Date.now() - 120000).toISOString() },
  { id: '2', userId: '', type: 'REPORT_READY', title: 'Rapor onaylandi', message: 'Ahmet Yildiz\'a ait beslenme analiz raporu uzman tarafindan onaylandi.', read: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: '3', userId: '', type: 'ORDER_PLACED', title: 'Yeni siparis olusturuldu', message: 'Diyetisyen Elif Kaya 5 adet OmegaTree Premium Kit siparisi verdi.', read: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '4', userId: '', type: 'ANALYSIS_COMPLETE', title: 'Analiz tamamlandi', message: 'Numune #LAB-0892 icin mikrobiyom analizi basariyla tamamlandi.', read: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '5', userId: '', type: 'SYSTEM', title: 'Sistem guncellemesi', message: 'Planlanan bakim calismasi: 20 Haziran Cuma 02:00 - 04:00 arasi sistem erisime kapali olacaktir.', read: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '6', userId: '', type: 'USER_APPROVED', title: 'Yeni kullanici onaylandi', message: 'Dr. Selin Ozturk hesabi basariyla onaylandi ve diyetisyen paneline erisim saglandi.', read: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
]

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  setNotifications: (notifications: Notification[]) => void
  addNotification: (notification: Notification) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: DEMO_NOTIFICATIONS,
  unreadCount: DEMO_NOTIFICATIONS.filter((n) => !n.read).length,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),

  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),

  markAsRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      }
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => {
      const removed = state.notifications.find((n) => n.id === id)
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount:
          state.unreadCount - (removed && !removed.read ? 1 : 0),
      }
    }),
}))
