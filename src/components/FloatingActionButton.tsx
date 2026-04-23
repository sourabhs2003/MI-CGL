import { motion } from 'framer-motion'
import { Play } from 'lucide-react'

interface FloatingActionButtonProps {
  onClick: () => void
  label?: string
}

export function FloatingActionButton({ onClick, label = 'Start Study' }: FloatingActionButtonProps) {
  return (
    <motion.button
      type="button"
      className="fab-button"
      onClick={onClick}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      aria-label={label}
    >
      <Play size={24} fill="currentColor" />
      <span className="fab-label">{label}</span>
    </motion.button>
  )
}
