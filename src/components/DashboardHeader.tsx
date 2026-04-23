import { Flame } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function DashboardHeader() {
  const { user } = useAuth()

  return (
    <header className="dashboard-header">
      <div className="header-content">
        <div className="header-brand">
          <h1>MI CGL</h1>
          <span className="header-subtitle">AI Study Coach</span>
        </div>
        <div className="header-profile">
          <div className="streak-indicator">
            <Flame size={20} className="streak-icon" />
            <span className="streak-text">5 Day Streak</span>
          </div>
          <div className="profile-avatar">
            {user?.displayName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </div>
      <p className="streak-message">Don't break it today</p>
    </header>
  )
}
