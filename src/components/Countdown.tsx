import { useMemo } from 'react'

function getDaysUntil(dateString: string) {
  const now = new Date()
  const target = new Date(dateString)
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export function Countdown() {
  const countdown = useMemo(
    () => ({
      examDays: getDaysUntil('2027-06-01'),
      syllabusDays: getDaysUntil('2026-12-31'),
    }),
    [],
  )

  return (
    <section className="home-countdown" aria-label="SSC countdown">
      <div>
        <span>SSC CGL 2027</span>
        <strong>{countdown.examDays} days left</strong>
      </div>
      <div>
        <span>Syllabus target</span>
        <strong>{countdown.syllabusDays} days to Dec 2026</strong>
      </div>
    </section>
  )
}
