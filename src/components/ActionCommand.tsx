import { useMemo } from 'react'
import { Zap, Target, TrendingUp } from 'lucide-react'
import { useSessions } from '../hooks/useFirestoreData'
import { useDailyTarget } from '../hooks/useDailyTarget'
import { todayKey } from '../lib/dates'

type Props = {
  uid: string
}

export function ActionCommand({ uid }: Props) {
  const sessions = useSessions(uid, 500)
  const today = todayKey()
  const todaySessions = sessions.filter((s) => s.dayKey === today)
  const todaySec = todaySessions.reduce((sum, s) => sum + s.durationSec, 0)
  const { targetHours, targetSec, upgradedToday } = useDailyTarget(uid, todaySec)

  const insight = useMemo(() => {
    const remainingSec = targetSec - todaySec
    const now = new Date()
    const hour = now.getHours()
    const latestEnd = todaySessions
      .map((s) => {
        if (typeof s.endTime === 'string') return Date.parse(s.endTime)
        if (typeof s.startTime === 'string') return Date.parse(s.startTime)
        return 0
      })
      .filter(Number.isFinite)
      .sort((a, b) => b - a)[0]
    const inactiveMinutes = latestEnd ? Math.floor((Date.now() - latestEnd) / 60000) : null
    const progressPct = todaySec / targetSec

    if (remainingSec <= 0) {
      const nextTarget = Number((targetHours + 0.5).toFixed(1))
      return {
        icon: <TrendingUp size={18} />,
        message: `${targetHours}h target done. Push to ${nextTarget}h.`,
        subtext: upgradedToday ? `Target upgraded: ${targetHours}h` : `Target: ${targetHours}h`,
      }
    }

    const remainingHours = Math.floor(remainingSec / 3600)
    const remainingMin = Math.floor((remainingSec % 3600) / 60)

    if (hour < 12) {
      return {
        icon: <Zap size={18} />,
        message: progressPct >= 0.25 ? `You're close. ${remainingHours}h ${remainingMin}m to level up.` : `Slow day. Minimum ${targetHours}h still pending.`,
        subtext: upgradedToday ? `Target upgraded: ${targetHours}h` : `Target: ${targetHours}h`,
      }
    }

    if (hour < 17) {
      return {
        icon: <Target size={18} />,
        message: inactiveMinutes && inactiveMinutes > 90 ? 'You slowed down. Fix next 2 hours.' : `${remainingHours}h ${remainingMin}m more to level up.`,
        subtext: inactiveMinutes ? `${inactiveMinutes}m inactive` : `Target: ${targetHours}h`,
      }
    }

    if (hour >= 21 && progressPct < 0.7) {
      return {
        icon: <Zap size={18} />,
        message: "You're behind. Last chance to recover.",
        subtext: `Target: ${targetHours}h`
      }
    }

    return {
      icon: <Target size={18} />,
      message: progressPct < 0.5 ? `Slow day. Minimum ${targetHours}h still pending.` : `You're close. ${remainingHours}h ${remainingMin}m more.`,
      subtext: upgradedToday ? `Target upgraded: ${targetHours}h` : `Target: ${targetHours}h`,
    }
  }, [targetHours, targetSec, todaySec, todaySessions, upgradedToday])

  return (
    <section className="card ai-insight-card">
      <div className="ai-insight-content">
        <div className="ai-insight-icon">{insight.icon}</div>
        <div className="ai-insight-text">
          <p className="ai-insight-message">{insight.message}</p>
          <p className="ai-insight-subtext">{insight.subtext}</p>
        </div>
      </div>
    </section>
  )
}
