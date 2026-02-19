export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center py-32 animate-fade-in">
      {/* Leaf icon with gentle pulse */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary-200/40 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center shadow-sm">
          <svg
            viewBox="0 0 24 24"
            className="h-7 w-7 text-primary-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'page-loader-sway 3s ease-in-out infinite' }}
          >
            <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 17 3.5s1 7-4 11.5" />
            <path d="M11 20v-8" />
            <path d="M7 15c2-1.5 4-2.5 6-3" />
          </svg>
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
