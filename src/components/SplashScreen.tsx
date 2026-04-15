import { motion } from 'framer-motion'

export function SplashScreen() {
  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="splash-core"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
      >
        <motion.div
          className="splash-glow"
          animate={{
            boxShadow: [
              '0 0 20px rgba(34, 197, 94, 0.3)',
              '0 0 40px rgba(34, 197, 94, 0.5)',
              '0 0 20px rgba(34, 197, 94, 0.3)',
            ],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <motion.img
            src="/icon.png"
            alt="MI CGL"
            className="splash-logo"
            animate={{
              scale: [0.8, 1.1, 1],
              opacity: [0, 1],
            }}
            transition={{
              duration: 1.5,
              ease: 'easeOut',
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
