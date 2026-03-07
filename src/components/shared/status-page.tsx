import type { ReactNode } from 'react'
import { WifiOff, Construction, ShieldAlert, Info } from 'lucide-react'
import { Button } from '@/components/ui'

export type StatusPageVariant = 'offline' | 'maintenance' | 'forbidden' | 'info'

const VARIANTS: Record<
  StatusPageVariant,
  { icon: typeof WifiOff; title: string; description: string; iconBg: string; iconColor: string }
> = {
  offline: {
    icon: WifiOff,
    title: 'Baglanti yok',
    description:
      'Internet baglantiniz kesilmis gibi gorunuyor. Baglantinizi kontrol edip sayfayi yenileyin.',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  maintenance: {
    icon: Construction,
    title: 'Bakim calismasi',
    description:
      'Sistemimizde kisa sureli bakim yapiliyor. Lutfen birkac dakika sonra tekrar deneyin.',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  forbidden: {
    icon: ShieldAlert,
    title: 'Erisim engellendi',
    description: 'Bu sayfaya veya isleme erisim yetkiniz bulunmuyor.',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  info: {
    icon: Info,
    title: 'Bilgi',
    description: 'Bu sayfa gecici olarak kullanilamiyor.',
    iconBg: 'bg-surface-200 dark:bg-surface-300/50',
    iconColor: 'text-surface-600 dark:text-surface-400',
  },
}

interface StatusPageProps {
  variant: StatusPageVariant
  title?: string
  description?: string
  action?: { label: string; onClick: () => void }
  children?: ReactNode
}

/**
 * Hata ekrani ile ayni kart stilinde kullanilabilecek durum sayfalari:
 * offline, maintenance, forbidden, info.
 */
export function StatusPage({ variant, title, description, action, children }: StatusPageProps) {
  const config = VARIANTS[variant]
  const Icon = config.icon

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-100 px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-panel shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="flex items-start gap-4">
            <div
              className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${config.iconBg} ${config.iconColor}`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">
                {title ?? config.title}
              </h1>
              <p className="mt-2 text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                {description ?? config.description}
              </p>
            </div>
          </div>
          {children && <div className="mt-6">{children}</div>}
          {action && (
            <div className="mt-6">
              <Button variant="primary" onClick={action.onClick}>
                {action.label}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
