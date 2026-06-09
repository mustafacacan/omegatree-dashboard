import { OmegaTreeLogo } from '@/components/shared/omega-tree-logo'

export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
      <div className="relative mb-6 flex items-center justify-center">
        <div
          className="absolute inset-0 rounded-full bg-primary-200/40 animate-ping"
          style={{ animationDuration: '2s' }}
        />
        <div className="relative">
          <OmegaTreeLogo variant="loader" />
        </div>
      </div>

      {/* Animated dots */}
      <div className="flex items-center gap-1.5 mb-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full bg-primary-400"
            style={{
              animation: 'page-loader-bounce 1.4s ease-in-out infinite',
              animationDelay: `${i * 0.16}s`,
            }}
          />
        ))}
      </div>

      {/* Loading text */}
      <p className="text-sm font-medium text-surface-500 mb-8">Sayfa yukleniyor...</p>

      {/* Skeleton content preview */}
      <div className="w-full max-w-2xl space-y-4 px-6">
        <div className="flex gap-4">
          <div className="h-20 flex-1 rounded-xl bg-surface-200/60" style={{ animation: 'page-loader-shimmer 2s ease-in-out infinite' }} />
          <div className="h-20 flex-1 rounded-xl bg-surface-200/60" style={{ animation: 'page-loader-shimmer 2s ease-in-out infinite', animationDelay: '0.15s' }} />
          <div className="h-20 flex-1 rounded-xl bg-surface-200/60 hidden sm:block" style={{ animation: 'page-loader-shimmer 2s ease-in-out infinite', animationDelay: '0.3s' }} />
        </div>
        <div className="h-10 rounded-xl bg-surface-200/40" style={{ animation: 'page-loader-shimmer 2s ease-in-out infinite', animationDelay: '0.1s' }} />
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 rounded-lg bg-surface-200/30"
              style={{
                animation: 'page-loader-shimmer 2s ease-in-out infinite',
                animationDelay: `${0.2 + i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
