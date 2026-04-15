import { useEffect, useState, type ReactNode } from 'react'
import { SplashScreen } from './SplashScreen'

export function SplashGate({ children }: { children: ReactNode }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setDone(true), 1500)
    return () => window.clearTimeout(id)
  }, [])

  if (!done) return <SplashScreen />
  return <>{children}</>
}

