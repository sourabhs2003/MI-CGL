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
import { getIdentity } from '../lib/identity'
import { syncQueuedStudySessions } from '../services/studySession'

export function HomePage() {
  const { user } = useAuth()
  const uid = user?.uid

  useEffect(() => {
    void syncQueuedStudySessions()
  }, [])

  const userIdentity = getIdentity(user?.username ?? 'user')

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
        <div className="home-main-column">
          {uid ? <PersonalStatus uid={uid} /> : null}
          {uid ? <SquadCompetition /> : null}
          {uid ? <TodayTaskHub uid={uid} /> : null}
          {uid ? <SessionControls /> : null}
        </div>

        <aside className="home-side-column">
          {uid ? <ActionCommand uid={uid} /> : null}
          <Countdown />
        </aside>
      </div>
    </main>
  )
}
