import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui'
import { queryClient } from '@/lib/query-client'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <Toaster
          position="bottom-right"
          expand={false}
          richColors
          closeButton
          duration={4000}
          visibleToasts={3}
          toastOptions={{
            style: {
              borderRadius: '12px',
              padding: '14px 18px',
              fontSize: '14px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.06)',
              border: '1px solid rgba(0,0,0,0.06)',
            },
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
