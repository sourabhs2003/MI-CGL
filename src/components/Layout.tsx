import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, BarChart, CheckSquare, Trophy } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Analytics', icon: BarChart },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/mocks', label: 'Mocks', icon: Trophy },
]

export function Layout() {
  const { logout, user } = useAuth()
  const label = user?.username ?? 'User'

  return (
    <div className="shell">
      <nav className="main-nav top">
        <div className="nav-brand">
          <span className="eyebrow">MI CGL</span>
          <strong>SmartPrep</strong>
        </div>
        <div className="nav-user">
          <span className="nav-email">{label}</span>
          <button type="button" className="btn ghost sm" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </nav>
      <div className="app-root mobile-pad">
        <Outlet />
      </div>
      <nav className="main-nav bottom" aria-label="Primary">
        <div className="nav-links bottom-links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                isActive ? 'nav-link active' : 'nav-link'
              }
            >
              {({ isActive }) => (
                <motion.div
                  className="nav-link-content"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <motion.div
                    initial={{ scale: 1 }}
                    animate={{ scale: isActive ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <l.icon size={16} className={isActive ? 'icon active' : 'icon'} />
                  </motion.div>
                  <span>{l.label}</span>
                  {isActive && (
                    <motion.div
                      className="active-indicator"
                      layoutId="activeIndicator"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
