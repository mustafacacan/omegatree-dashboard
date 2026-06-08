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

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  if (!title && !description && !breadcrumbs?.length && !actions) {
    return null
  }

  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-3 text-description text-sm">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3 opacity-70" />}
              {crumb.href ? (
                <Link to={crumb.href} className="transition-colors hover:opacity-80 hover:text-surface-700">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-surface-800">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      {(title || description || actions) && (
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          {(title || description) && (
            <div className="min-w-0">
              {title && (
                <h1 className="text-page-title tracking-tight text-surface-900">
                  {title}
                </h1>
              )}
              {description && (
                <p className="mt-1.5 text-description max-w-2xl">
                  {description}
                </p>
              )}
            </div>
          )}
          {actions && <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">{actions}</div>}
        </div>
      )}
    </div>
  )
}
