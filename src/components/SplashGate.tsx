import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { SplashScreen } from './SplashScreen'

export function SplashGate({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    let mounted = true
    let timerId = 0
    const startedAt = Date.now()
    const logo = new Image()

    function finish() {
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, 1200 - elapsed)
      timerId = window.setTimeout(() => {
        if (mounted) setDone(true)
      }, remaining)
    }

    logo.onload = finish
    logo.onerror = finish
    logo.src = '/icon.png'

    if (logo.complete) finish()

    return () => {
      mounted = false
      window.clearTimeout(timerId)
    }
  }, [])

  return (
    <AnimatePresence mode="wait">
      {done ? <>{children}</> : <SplashScreen key="splash" />}
    </AnimatePresence>
  )
}
