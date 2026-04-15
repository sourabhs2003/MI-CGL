import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart3, CheckSquare, Home, LogOut, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Stats', icon: BarChart3 },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/mocks', label: 'Mocks', icon: Trophy },
]

export function Layout() {
  const { logout, user } = useAuth()
  const label = user?.username ?? 'Player'

  return (
    <div className="shell">
      <nav className="main-nav top">
        <div className="nav-brand">
          <span className="eyebrow">MI CGL</span>
          <strong>Prep Arena</strong>
        </div>
        <div className="nav-user">
          <span className="nav-email">{label}</span>
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
