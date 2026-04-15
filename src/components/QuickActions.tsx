import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, CheckSquare, Trophy } from 'lucide-react'

const actions = [
  {
    to: '/mocks',
    title: 'Log mock score',
    subtitle: 'Track every test run',
    icon: Trophy,
    accent: 'yellow',
  },
  {
    to: '/tasks',
    title: 'Daily mission',
    subtitle: 'Lock in your routine',
    icon: CheckSquare,
    accent: 'green',
  },
  {
    to: '/dashboard',
    title: 'Open analytics',
    subtitle: 'See momentum and weak spots',
    icon: BarChart3,
    accent: 'red',
  },
] as const

export function QuickActions() {
  return (
    <motion.section
      className="card actions-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: 0.08 }}
    >
      <h2>Quick actions</h2>
      <p className="card-sub">Fast jumps into your most-used flows.</p>
      <div className="action-grid">
        {actions.map((action, index) => (
          <motion.div
            key={action.to}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.06 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link to={action.to} className={`action-link premium-action ${action.accent}`}>
              <div className="action-icon">
                <action.icon size={18} />
              </div>
              <div className="action-copy">
                <strong>{action.title}</strong>
                <span>{action.subtitle}</span>
              </div>
              <ArrowRight size={16} className="action-arrow" />
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.section>
  )
}
