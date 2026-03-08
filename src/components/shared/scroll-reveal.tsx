import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  /** Viewport'a ne kadar girince tetiklensin (0–1) */
  amount?: number
  /** Animasyon gecikmesi (saniye) */
  delay?: number
}

/**
 * İçerik viewport'a girdiğinde (scroll'da) tek seferlik animasyon.
 * Sayfa yüklenince değil, kullanıcı aşağı kaydırdıkça bloklar canlanır.
 */
export function ScrollReveal({ children, className, amount = 0.15, delay = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  )
}
