import { cn } from '@/lib/utils'
import { OmegaTreeLogo } from '@/components/shared/omega-tree-logo'

interface AppFooterProps {
  className?: string
  fixed?: boolean
}

export function AppFooter({ className, fixed = true }: AppFooterProps) {
  return (
    <footer
      className={cn(
        'flex items-center border-t border-surface-200/60 px-4 py-2.5 sm:px-5 lg:px-8',
        'bg-panel/95 backdrop-blur-sm supports-[backdrop-filter]:bg-panel/90',
        'pb-[calc(0.625rem+env(safe-area-inset-bottom))]',
        fixed && 'fixed bottom-0 left-0 right-0 z-30',
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1360px] items-center justify-center gap-2 text-[10px] leading-none text-surface-400 sm:text-[11px]">
        <OmegaTreeLogo variant="footer" className="hidden sm:block" />
        <span className="text-surface-500">Omega Tree</span>
        <span aria-hidden className="text-surface-300">
          |
        </span>
        <span>
          Powered by{' '}
          <a
            href="https://dreaxm.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-surface-500 transition-colors hover:text-primary-600 hover:underline underline-offset-2"
          >
            Dreaxm AI
          </a>
        </span>
      </div>
    </footer>
  )
}

/** İçerik footer altında kalmasın diye main alanına eklenir */
export function appFooterMainPaddingClassName() {
  return 'pb-[calc(2.25rem+env(safe-area-inset-bottom))]'
}
