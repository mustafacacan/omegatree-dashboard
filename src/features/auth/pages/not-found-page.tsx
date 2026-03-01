import { Link } from 'react-router-dom'
import { ROUTES } from '@/utils/routes'
import { Button } from '@/components/ui'
import { TreePine, Home } from 'lucide-react'

const W = {
  olive: '#8B9A4B',
  oliveLight: '#EEF2DE',
  cream: '#F9F7F3',
  warmBorder: '#E8E4DE',
  dark: '#2D2A26',
  text: '#4A4640',
  textLight: '#9C968D',
}

export function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: W.cream }}
    >
      <div
        className="rounded-3xl border-2 p-10 max-w-md w-full text-center shadow-sm"
        style={{ borderColor: W.warmBorder, background: '#fff' }}
      >
        <div
          className="h-20 w-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: W.oliveLight }}
        >
          <TreePine className="h-10 w-10" style={{ color: W.olive }} />
        </div>
        <h1 className="text-6xl font-black mb-2" style={{ color: W.dark }}>
          404
        </h1>
        <p className="text-lg font-medium mb-1" style={{ color: W.text }}>
          Sayfa bulunamadi
        </p>
        <p className="text-sm mb-8" style={{ color: W.textLight }}>
          Aradiginiz sayfa kaldirilmis veya adresi yanlis olabilir.
        </p>
        <Button
          variant="primary"
          size="md"
          asChild
          style={{ background: W.olive }}
        >
          <Link to={ROUTES.GIRIS} className="inline-flex items-center gap-2">
            <Home className="h-4 w-4" />
            Giris sayfasina don
          </Link>
        </Button>
      </div>
    </div>
  )
}
