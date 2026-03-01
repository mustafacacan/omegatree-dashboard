import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useNotificationStore } from '@/stores/notification.store'
import { PageHeader } from '@/components/shared/page-header'
import {
  Card, CardContent, Button, Badge,
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui'
import {
  ArrowLeft, Bell, Package, FileCheck, AlertCircle, CheckCircle,
  BellRing, Inbox, Filter, Trash2, MailOpen, Clock, ShieldCheck,
  Truck, FlaskConical, FileText, UserCheck,
} from 'lucide-react'
import { getBasePath } from '@/utils/routes'
import { formatDateTime } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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

type NotifCategory = 'kit' | 'report' | 'system' | 'order' | 'analysis' | 'user'

interface DemoNotification {
  id: string
  type: NotifCategory
  title: string
  message: string
  time: string
  read: boolean
}

const categoryConfig: Record<NotifCategory, {
  icon: typeof Bell
  color: string
  bgColor: string
  borderColor: string
  label: string
}> = {
  kit: {
    icon: Package,
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    borderColor: 'border-l-primary-500',
    label: 'Kit',
  },
  report: {
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-l-orange-500',
    label: 'Rapor',
  },
  system: {
    icon: ShieldCheck,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-l-amber-500',
    label: 'Sistem',
  },
  order: {
    icon: Truck,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-l-violet-500',
    label: 'Siparis',
  },
  analysis: {
    icon: FlaskConical,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-l-cyan-500',
    label: 'Analiz',
  },
  user: {
    icon: UserCheck,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-l-pink-500',
    label: 'Kullanici',
  },
}

const demoNotifications: DemoNotification[] = [
  {
    id: '1',
    type: 'kit',
    title: 'Kit teslim alindi',
    message: 'OT-2025-00142 numarali kit basariyla danisana atandi ve kargo surecine hazirlandi.',
    time: new Date(Date.now() - 120000).toISOString(),
    read: false,
  },
  {
    id: '2',
    type: 'report',
    title: 'Rapor onaylandi',
    message: 'Ahmet Yildiz\'a ait beslenme analiz raporu uzman tarafindan onaylandi.',
    time: new Date(Date.now() - 1800000).toISOString(),
    read: false,
  },
  {
    id: '3',
    type: 'order',
    title: 'Yeni siparis olusturuldu',
    message: 'Diyetisyen Elif Kaya 5 adet OmegaTree Premium Kit siparisi verdi.',
    time: new Date(Date.now() - 3600000).toISOString(),
    read: false,
  },
  {
    id: '4',
    type: 'analysis',
    title: 'Analiz tamamlandi',
    message: 'Numune #LAB-0892 icin mikrobiyom analizi basariyla tamamlandi.',
    time: new Date(Date.now() - 7200000).toISOString(),
    read: true,
  },
  {
    id: '5',
    type: 'system',
    title: 'Sistem guncellemesi',
    message: 'Planlanan bakim calismasi: 20 Haziran Cuma 02:00 - 04:00 arasi sistem erisime kapali olacaktir.',
    time: new Date(Date.now() - 86400000).toISOString(),
    read: true,
  },
  {
    id: '6',
    type: 'user',
    title: 'Yeni kullanici onaylandi',
    message: 'Dr. Selin Ozturk hesabi basariyla onaylandi ve diyetisyen paneline erisim saglandi.',
    time: new Date(Date.now() - 172800000).toISOString(),
    read: true,
  },
  {
    id: '7',
    type: 'kit',
    title: 'Kit hasarli bildirildi',
    message: 'OT-2025-00138 numarali kit kargo sirasinda hasar gordu, yenisi gonderiliyor.',
    time: new Date(Date.now() - 259200000).toISOString(),
    read: true,
  },
  {
    id: '8',
    type: 'report',
    title: 'Rapor gonderildi',
    message: 'Zeynep Demir\'e ait analiz raporu e-posta ile danisana iletildi.',
    time: new Date(Date.now() - 345600000).toISOString(),
    read: true,
  },
]

const statCards = [
  {
    label: 'Toplam',
    icon: Inbox,
    getValue: (notifs: DemoNotification[]) => notifs.length,
    color: 'text-surface-700',
    bgColor: 'bg-surface-50',
    iconColor: 'text-surface-400',
  },
  {
    label: 'Okunmamis',
    icon: BellRing,
    getValue: (notifs: DemoNotification[]) => notifs.filter(n => !n.read).length,
    color: 'text-primary-700',
    bgColor: 'bg-primary-50',
    iconColor: 'text-primary-500',
  },
  {
    label: 'Okunmus',
    icon: MailOpen,
    getValue: (notifs: DemoNotification[]) => notifs.filter(n => n.read).length,
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-500',
  },
  {
    label: 'Bu Hafta',
    icon: Clock,
    getValue: (notifs: DemoNotification[]) => {
      const weekAgo = Date.now() - 7 * 86400000
      return notifs.filter(n => new Date(n.time).getTime() > weekAgo).length
    },
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-500',
  },
]

export function NotificationsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const basePath = getBasePath(location.pathname)
  const { markAllAsRead } = useNotificationStore()
  const [notifications, setNotifications] = useState(demoNotifications)
  const [activeTab, setActiveTab] = useState('all')

  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter(n => !n.read)
      case 'kit':
        return notifications.filter(n => n.type === 'kit')
      case 'report':
        return notifications.filter(n => n.type === 'report')
      case 'system':
        return notifications.filter(n => n.type === 'system' || n.type === 'user')
      default:
        return notifications
    }
  }, [notifications, activeTab])

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    markAllAsRead()
  }

  const handleDelete = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="primary" size="sm" onClick={handleMarkAllRead}>
                <CheckCircle className="h-3.5 w-3.5" />
                Tumunu Okundu Yap
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Geri
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon
          const value = stat.getValue(notifications)
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="relative overflow-hidden group hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-surface-400 uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${stat.color}`}>
                        {value}
                      </p>
                    </div>
                    <div className={`h-11 w-11 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Tabs + Notification List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="bg-surface-100/80">
            <TabsTrigger value="all" className="gap-1.5">
              <Inbox className="h-3.5 w-3.5" />
              Tumu
              <Badge size="sm" variant="default" className="ml-1">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-1.5">
              <BellRing className="h-3.5 w-3.5" />
              Okunmamis
              {unreadCount > 0 && (
                <Badge size="sm" variant="primary" dot pulse className="ml-1">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="kit" className="gap-1.5">
              <Package className="h-3.5 w-3.5" />
              Kit
            </TabsTrigger>
            <TabsTrigger value="report" className="gap-1.5">
              <FileCheck className="h-3.5 w-3.5" />
              Rapor
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              Sistem
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-1.5 text-[11px] text-surface-400">
            <Filter className="h-3.5 w-3.5" />
            {filteredNotifications.length} bildirim gosteriliyor
          </div>
        </div>

        {['all', 'unread', 'kit', 'report', 'system'].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {filteredNotifications.length === 0 ? (
              <EmptyState tab={tab} />
            ) : (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredNotifications.map((n, index) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      index={index}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

function NotificationItem({
  notification: n,
  index,
  onMarkAsRead,
  onDelete,
}: {
  notification: DemoNotification
  index: number
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const config = categoryConfig[n.type] || categoryConfig.system
  const Icon = config.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <Card
        className={`
          group relative overflow-hidden border-l-[3px] transition-all duration-200
          ${n.read
            ? 'border-l-surface-200 hover:border-l-surface-300 bg-white'
            : `${config.borderColor} bg-gradient-to-r from-white to-surface-50/50 shadow-sm`
          }
          hover:shadow-md cursor-pointer
        `}
        onClick={() => !n.read && onMarkAsRead(n.id)}
      >
        <CardContent className="p-0">
          <div className="flex items-start gap-4 p-4">
            {/* Icon */}
            <div className={`
              h-11 w-11 rounded-xl flex items-center justify-center shrink-0
              transition-transform duration-200 group-hover:scale-105
              ${n.read ? 'bg-surface-100' : config.bgColor}
            `}>
              <Icon className={`h-5 w-5 ${n.read ? 'text-surface-400' : config.color}`} />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className={`text-sm font-semibold truncate ${n.read ? 'text-surface-600' : 'text-surface-900'}`}>
                      {n.title}
                    </h4>
                    {!n.read && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-60" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
                      </span>
                    )}
                  </div>
                  <p className={`text-[13px] leading-relaxed ${n.read ? 'text-surface-400' : 'text-surface-500'}`}>
                    {n.message}
                  </p>
                </div>

                {/* Actions (visible on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                  {!n.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onMarkAsRead(n.id) }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Okundu olarak isaretle"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(n.id) }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-danger hover:bg-red-50 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center gap-3 mt-2.5">
                <Badge
                  size="sm"
                  className={`${config.bgColor} ${config.color} border-0`}
                >
                  {config.label}
                </Badge>
                <span className="text-[11px] text-surface-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {getRelativeTime(n.time)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function EmptyState({ tab }: { tab: string }) {
  const messages: Record<string, { title: string; desc: string; icon: typeof Bell }> = {
    all: { title: 'Bildirim yok', desc: 'Henuz hicbir bildiriminiz bulunmuyor.', icon: Inbox },
    unread: { title: 'Harika!', desc: 'Tum bildirimlerinizi okudunuz.', icon: CheckCircle },
    kit: { title: 'Kit bildirimi yok', desc: 'Kit ile ilgili bildirim bulunmuyor.', icon: Package },
    report: { title: 'Rapor bildirimi yok', desc: 'Rapor ile ilgili bildirim bulunmuyor.', icon: FileText },
    system: { title: 'Sistem bildirimi yok', desc: 'Sistem bildirimi bulunmuyor.', icon: ShieldCheck },
  }

  const msg = messages[tab] || messages.all
  const Icon = msg.icon

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-dashed">
        <CardContent className="p-12">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-2xl bg-surface-50 flex items-center justify-center mb-4">
              <Icon className="h-8 w-8 text-surface-300" />
            </div>
            <h3 className="text-sm font-semibold text-surface-700 mb-1">{msg.title}</h3>
            <p className="text-[13px] text-surface-400 max-w-xs">{msg.desc}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
