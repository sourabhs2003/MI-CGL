import { Flame } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function MobileHeader() {
  const { user } = useAuth()

  return (
    <header className="mobile-header">
      <div className="header-left">
        <h1 className="header-title">MI CGL</h1>
        <span className="header-badge">AI Coach</span>
      </div>
      <div className="header-right">
        <div className="mini-streak">
          <Flame size={14} className="streak-icon" />
          <span className="streak-count">5</span>
        </div>
        <div className="mini-avatar">
          {user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
