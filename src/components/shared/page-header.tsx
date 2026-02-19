import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title?: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  actions?: React.ReactNode
}

const W = {
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
  warmGrayLight: '#B5AFA5',
}

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  // Eğer hiçbir şey yoksa, hiçbir şey render etme
  if (!title && !description && !breadcrumbs?.length && !actions) {
    return null
  }

  return (
    <div className="mb-4">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-[12px] mb-3" style={{ color: W.warmGrayLight }}>
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3" style={{ color: W.warmGrayLight }} />}
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  className="transition-colors hover:opacity-80"
                  style={{ color: W.textLight }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium" style={{ color: W.text }}>{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {(title || description || actions) && (
        <div className="flex items-end justify-between gap-4">
          {(title || description) && (
            <div>
              {title && (
                <h1 className="text-[22px] font-semibold tracking-[-0.01em]" style={{ color: W.dark }}>
                  {title}
                </h1>
              )}
              {description && (
                <p className="mt-1 text-[14px]" style={{ color: W.textLight }}>{description}</p>
              )}
            </div>
          )}
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
    </div>
  )
}
