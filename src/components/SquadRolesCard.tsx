import { motion } from 'framer-motion'
import type { SquadRoleCard } from '../hooks/useSquadPageData'

type Props = {
  roles: SquadRoleCard[]
}

export function SquadRolesCard({ roles }: Props) {
  if (roles.length === 0) return null

  return (
    <section className="squad-shell squad-roles-card">
      <div className="squad-card-head">
        <div>
          <p className="squad-kicker">Squad Roles</p>
          <h3>Dynamic role system</h3>
        </div>
      </div>

      <div className="squad-roles-grid">
        {roles.map((role, index) => (
          <motion.div
            key={`${role.role}-${role.uid}`}
            className="squad-role-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
          >
            <span>{role.role}</span>
            <strong>{role.displayName}</strong>
            <p>{role.meta}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
