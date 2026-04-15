import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

export function QuickActions() {
  return (
    <motion.section
      className="card actions-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
    >
      <h2>Quick actions</h2>
      <p className="card-sub">Jump to logging and analysis.</p>
      <div className="action-grid">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link to="/mocks" className="btn ghost action-link">
            Log mock score
          </Link>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link to="/tasks" className="btn ghost action-link">
            Daily & weekly tasks
          </Link>
        </motion.div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link to="/dashboard" className="btn ghost action-link">
            Analytics
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}
