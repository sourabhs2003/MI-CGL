import { motion } from 'framer-motion'

export function SplashScreen() {
  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
    >
      <motion.div
        className="splash-core"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      >
        <motion.div
          className="splash-glow"
          animate={{ opacity: [0.55, 0.9, 0.72], scale: [0.98, 1.03, 1] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.img
          src="/icon.png"
          alt="MI CGL Pro"
          className="splash-logo"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.75, ease: 'easeInOut', delay: 0.08 }}
        />
        <motion.div
          className="splash-copy"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut', delay: 0.18 }}
        >
          <p className="splash-eyebrow">SSC CGL Command Center</p>
          <p className="splash-text">MI CGL Pro</p>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
