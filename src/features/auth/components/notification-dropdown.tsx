import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui'
import { useNotificationStore } from '@/stores/notification.store'
import type { NotificationType } from '@/types/notification.types'
import {
  Bell,
  Package,
  FileText,
  Truck,
  FlaskConical,
  ShieldCheck,
  UserCheck,
  Inbox,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const W = {
  orange: '#E8913A',
  cream: '#F9F7F3',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Az once'
  if (minutes < 60) return `${minutes} dk once`
  if (hours < 24) return `${hours} saat once`
  if (days < 7) return `${days} gun once`
  return formatDateTime(dateStr)
}

const typeConfig: Record<string, { icon: typeof Bell; color: string; bgColor: string; label: string }> = {
  KIT_DELIVERED: { icon: Package, color: 'text-primary-600', bgColor: 'bg-primary-50', label: 'Kit' },
  KIT_ASSIGNED: { icon: Package, color: 'text-primary-600', bgColor: 'bg-primary-50', label: 'Kit' },
  KIT_DAMAGED: { icon: Package, color: 'text-primary-600', bgColor: 'bg-primary-50', label: 'Kit' },
  REPORT_READY: { icon: FileText, color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Rapor' },
  REPORT_APPROVED: { icon: FileText, color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'Rapor' },
  ORDER_PLACED: { icon: Truck, color: 'text-violet-600', bgColor: 'bg-violet-50', label: 'Siparis' },
  ORDER_SHIPPED: { icon: Truck, color: 'text-violet-600', bgColor: 'bg-violet-50', label: 'Siparis' },
  ANALYSIS_COMPLETE: { icon: FlaskConical, color: 'text-cyan-600', bgColor: 'bg-cyan-50', label: 'Analiz' },
  SAMPLE_RECEIVED: { icon: FlaskConical, color: 'text-cyan-600', bgColor: 'bg-cyan-50', label: 'Analiz' },
  SAMPLE_REJECTED: { icon: FlaskConical, color: 'text-cyan-600', bgColor: 'bg-cyan-50', label: 'Analiz' },
  SYSTEM: { icon: ShieldCheck, color: 'text-amber-600', bgColor: 'bg-amber-50', label: 'Sistem' },
  USER_APPROVED: { icon: UserCheck, color: 'text-pink-600', bgColor: 'bg-pink-50', label: 'Kullanici' },
  STOCK_LOW: { icon: Package, color: 'text-amber-600', bgColor: 'bg-amber-50', label: 'Stok' },
}

function getConfig(type: NotificationType) {
  return typeConfig[type] || typeConfig.SYSTEM
}

export function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore()
  const displayList = notifications.slice(0, 8)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative p-2.5 rounded-xl transition-colors"
          style={{ color: W.text }}
          onMouseEnter={(e) => { e.currentTarget.style.background = W.cream }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-bold text-white px-1"
              style={{ background: W.orange }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[380px] max-w-[calc(100vw-2rem)] p-0"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="border-b border-surface-100 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: W.dark }}>
            Bildirimler
          </span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllAsRead()}
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              Tumunu okundu isaretle
            </button>
          )}
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Inbox className="h-10 w-10 text-surface-300 mb-2" />
              <p className="text-sm text-surface-500">Bildirim yok</p>
            </div>
          ) : (
            displayList.map((n) => {
              const config = getConfig(n.type)
              const Icon = config.icon
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => !n.read && markAsRead(n.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      if (!n.read) markAsRead(n.id)
                    }
                  }}
                  className={`
                    flex gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-surface-50 last:border-0
                    hover:bg-surface-50/80
                    ${!n.read ? 'bg-primary-50/30' : ''}
                  `}
                >
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${n.read ? 'bg-surface-100' : config.bgColor}`}
                  >
                    <Icon className={`h-4 w-4 ${n.read ? 'text-surface-400' : config.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium truncate ${n.read ? 'text-surface-600' : 'text-surface-900'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-surface-500 line-clamp-2 mt-0.5">{n.message}</p>
                    <p className="text-[11px] text-surface-400 mt-1">{getRelativeTime(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <span className="shrink-0 w-2 h-2 rounded-full bg-primary-500 mt-2" />
                  )}
                </div>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
