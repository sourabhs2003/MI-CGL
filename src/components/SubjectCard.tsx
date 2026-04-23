import { motion } from 'framer-motion'
import { BookOpen, Brain, Calculator, ClipboardList, Globe, Layers3, Folder } from 'lucide-react'
import type { Subject } from '../types'

type SubjectCardProps = {
  subject: Subject
  selected: boolean
  onClick: () => void
}

const DETAILS: Record<Subject, { icon: typeof Calculator; color: string }> = {
  Maths: { icon: Calculator, color: '#3ABEFF' },
  GS: { icon: Globe, color: '#FF9F43' },
  English: { icon: BookOpen, color: '#A66CFF' },
  Reasoning: { icon: Brain, color: '#2ED573' },
  Mock: { icon: ClipboardList, color: '#38bdf8' },
  Mixed: { icon: Layers3, color: '#94a3b8' },
  Miscellaneous: { icon: Folder, color: '#a855f7' },
}

export function SubjectCard({ subject, selected, onClick }: SubjectCardProps) {
  const { icon: Icon, color } = DETAILS[subject] ?? DETAILS.Mixed

  return (
    <motion.button
      type="button"
      className={`subject-card-horizontal ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{
        borderColor: selected ? color : 'var(--border)',
        boxShadow: selected ? `0 0 18px ${color}22` : 'none',
      }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
    >
      <div className="subject-icon" style={{ color: selected ? color : 'var(--muted)' }}>
        <Icon size={18} />
      </div>
      <div className="subject-content">
        <strong style={{ color: selected ? color : 'var(--text)' }}>{subject}</strong>
      </div>
    </motion.button>
  )
}
