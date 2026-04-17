import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart3, CheckSquare, Home, LogOut, Trophy, Users } from 'lucide-react'
import { AvatarIcon } from '../components/AvatarIcon'
import { useAuth } from '../context/AuthContext'
import { getIdentity } from '../lib/identity'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/mocks', label: 'Mocks', icon: Trophy },
  { to: '/dashboard', label: 'Analytics', icon: BarChart3 },
  { to: '/squad', label: 'Squad', icon: Users },
]

export function Layout() {
  const { logout, user } = useAuth()
  const identity = getIdentity(user?.username ?? 'player')
  const label = user?.displayName ?? identity.displayName

  return (
    <div className="shell">
      <nav className="main-nav top">
        <div className="nav-brand centered">
          <span className="eyebrow"></span>
          <strong>MI  CGL</strong>
        </div>
        <div className="nav-user">
          <div className="nav-email avatar-inline" style={{ color: user?.avatarColor ?? identity.avatar.color }}>
            <AvatarIcon username={user?.username ?? identity.username} size={24} />
            <span>{label}</span>
          </div>
          <button type="button" className="btn ghost sm nav-logout" onClick={() => logout()}>
            <LogOut size={14} />
          </button>
        </div>
      </nav>

      <div className="app-root mobile-pad">
        <Outlet />
      </div>

      <nav className="main-nav bottom" aria-label="Primary">
        <div className="nav-links bottom-links">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {({ isActive }) => (
                <motion.div
                  className="nav-link-content"
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 24 }}
                >
                  <link.icon size={16} className={isActive ? 'icon active' : 'icon'} />
                  <span>{link.label}</span>
                  {isActive ? (
                    <motion.div
                      className="active-indicator"
                      layoutId="activeIndicator"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  ) : null}
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
