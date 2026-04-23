import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

const QUOTES = [
  "You don't need motivation. You need momentum.",
  'Consistency beats talent every single time.',
  'One clean session changes the day.',
  'Win the next hour. Then repeat.',
  'Small study blocks become rank jumps.',
  'Stop negotiating. Start the timer.',
]

const STORAGE_KEY = 'home-motivation-index'

function nextQuoteIndex(previousIndex: number | null) {
  if (QUOTES.length <= 1) return 0

  let next = Math.floor(Math.random() * QUOTES.length)
  if (previousIndex != null && next === previousIndex) {
    next = (next + 1) % QUOTES.length
  }
  return next
}

export function MotivationQuote() {
  const [quoteIndex, setQuoteIndex] = useState(0)

  useEffect(() => {
    let previous: number | null = null

    try {
      const stored = Number(sessionStorage.getItem(STORAGE_KEY))
      previous = Number.isFinite(stored) ? stored : null
    } catch {
      previous = null
    }

    const next = nextQuoteIndex(previous)
    setQuoteIndex(next)

    try {
      sessionStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Ignore storage write issues and keep UI responsive.
    }

    const intervalId = window.setInterval(() => {
      setQuoteIndex((current) => {
        const upcoming = nextQuoteIndex(current)
        try {
          sessionStorage.setItem(STORAGE_KEY, String(upcoming))
        } catch {
          // Ignore storage write issues and keep UI responsive.
        }
        return upcoming
      })
    }, 45000)

    return () => window.clearInterval(intervalId)
  }, [])

  const quote = QUOTES[quoteIndex] ?? QUOTES[0]

  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={quote}
        className="home-motivation"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.22 }}
      >
        {quote}
      </motion.p>
    </AnimatePresence>
  )
}
