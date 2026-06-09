import { cn } from '@/lib/utils'
import { publicAssetUrl } from '@/lib/media-url'

export const OMEGA_TREE_LOGO_SRC = publicAssetUrl('assets/omega-logo.png')

export type OmegaTreeLogoVariant =
  | 'auth'
  | 'auth-panel'
  | 'sidebar'
  | 'sidebar-collapsed'
  | 'footer'
  | 'loader'

interface OmegaTreeLogoProps {
  variant?: OmegaTreeLogoVariant
  className?: string
  alt?: string
}

export function OmegaTreeLogo({
  variant = 'auth',
  className,
  alt = 'OmegaTree — Personalized Wellness Analytics',
}: OmegaTreeLogoProps) {
  if (variant === 'sidebar-collapsed') {
    return (
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden',
          className,
        )}
      >
        <img
          src={OMEGA_TREE_LOGO_SRC}
          alt="OmegaTree"
          className="h-full w-full scale-[2.4] object-cover object-[center_8%]"
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  }

  const sizeClass: Record<Exclude<OmegaTreeLogoVariant, 'sidebar-collapsed'>, string> = {
    auth: 'h-[4.5rem] w-auto',
    'auth-panel': 'h-20 w-auto',
    sidebar: 'h-10 w-auto max-w-[8.75rem] object-contain',
    footer: 'h-3.5 w-auto opacity-90',
    loader: 'h-12 w-auto',
  }

  return (
    <img
      src={OMEGA_TREE_LOGO_SRC}
      alt={alt}
      className={cn('object-contain', sizeClass[variant], className)}
      loading="lazy"
      decoding="async"
    />
  )
}

/** Auth formları — mobilde üst marka alanı */
export function AuthMobileBrand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="mb-8 flex flex-col items-center lg:hidden">
      <OmegaTreeLogo variant="auth" />
      {subtitle ? (
        <p className="mt-2 text-center text-[11px] text-surface-400">{subtitle}</p>
      ) : null}
    </div>
  )
}
