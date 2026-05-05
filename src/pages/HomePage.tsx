import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { AvatarIcon } from '../components/AvatarIcon'
import { ActionCommand } from '../components/ActionCommand'
import { Countdown } from '../components/Countdown'
import { MotivationQuote } from '../components/MotivationQuote'
import { PersonalStatus } from '../components/PersonalStatus'
import { SessionControls } from '../components/SessionControls'
import { SquadCompetition } from '../components/SquadCompetition'
import { TodayTaskHub } from '../components/TodayTaskHub'
import { useAuth } from '../context/AuthContext'
import { useMocks, useTasks } from '../hooks/useFirestoreData'
import { useMotivationNotifications } from '../hooks/useNotifications'
import { useUserProfile } from '../hooks/useUserProfile'
import { getIdentity } from '../lib/identity'
import { syncQueuedStudySessions } from '../services/studySession'

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

export function HomePage() {
  const { user } = useAuth()
  const uid = user?.uid
  const { profile } = useUserProfile(uid)
  const tasks = useTasks(uid)
  const mocks = useMocks(uid)

  useEffect(() => {
    void syncQueuedStudySessions()
  }, [])

  const userIdentity = getIdentity(user?.username ?? 'user')
  useMotivationNotifications(uid, profile, tasks, mocks)

  return (
    <main className="home-v2">
      <motion.header className="home-hero card hero-live center-brand" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <div className="brand-center">
          <p className="eyebrow">MI CGL</p>
          <div className="brand-identity" style={{ color: userIdentity.avatar.color }}>
            <AvatarIcon username={user?.username ?? userIdentity.username} size={32} />
            <strong>{userIdentity.displayName}</strong>
          </div>
          <MotivationQuote />
        </div>
      </motion.header>

      <div className="home-desktop-shell">
        <motion.div
          className="home-main-column"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.08 } } }}
        >
          {uid ? <motion.div variants={sectionVariants} transition={{ duration: 0.24 }}><PersonalStatus uid={uid} /></motion.div> : null}
          {uid ? <motion.div variants={sectionVariants} transition={{ duration: 0.24 }}><SquadCompetition /></motion.div> : null}
          {uid ? <motion.div variants={sectionVariants} transition={{ duration: 0.24 }}><TodayTaskHub uid={uid} /></motion.div> : null}
          {uid ? <motion.div variants={sectionVariants} transition={{ duration: 0.24 }}><SessionControls /></motion.div> : null}
        </motion.div>

        <motion.aside
          className="home-side-column"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08, delayChildren: 0.14 } } }}
        >
          {uid ? <motion.div className="home-primary-cta" variants={sectionVariants} transition={{ duration: 0.24 }}><ActionCommand uid={uid} /></motion.div> : null}
          <motion.div variants={sectionVariants} transition={{ duration: 0.24 }}><Countdown /></motion.div>
        </motion.aside>
      </div>
    </main>
  )
}
