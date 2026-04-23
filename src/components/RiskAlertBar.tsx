import { AlertTriangle, TimerReset } from 'lucide-react'

type RiskAlert = {
  tone: 'warning' | 'critical'
  message: string
}

type RiskAlertBarProps = {
  alerts: RiskAlert[]
}

export function RiskAlertBar({ alerts }: RiskAlertBarProps) {
  if (alerts.length === 0) return null

  return (
    <section className="squad-alert-strip" aria-label="Squad alerts">
      {alerts.map((alert) => (
        <div key={alert.message} className={`squad-alert-pill ${alert.tone}`}>
          {alert.tone === 'critical' ? <AlertTriangle size={14} /> : <TimerReset size={14} />}
          <span>{alert.message}</span>
        </div>
      ))}
    </section>
  )
}
