import { motion } from 'framer-motion'
import { Calculator, Globe, BookOpen, Brain, BookIcon } from 'lucide-react'
import type { Subject } from '../types'

type SubjectCardProps = {
  subject: Subject
  selected: boolean
  onClick: () => void
}

const DETAILS: Record<Subject, { 
  desc: string; 
  icon: any; 
  topics: string[] 
  color: string
}> = {
  Maths: { 
    desc: 'Arithmetic + Advanced', 
    icon: Calculator,
    topics: ['Arithmetic', 'Algebra', 'Geometry', 'Mensuration', 'Trigonometry', 'Coordinate Geometry'],
    color: '#22c55e'
  },
  GS: { 
    desc: 'History, Geo, Polity, Science, Current Affairs', 
    icon: Globe,
    topics: ['History', 'Geography', 'Polity', 'Economy', 'Science', 'Static GK', 'Current Affairs'],
    color: '#facc15'
  },
  English: { 
    desc: 'Vocabulary, Grammar, Reading', 
    icon: BookOpen,
    topics: ['Vocabulary', 'Grammar', 'Reading Comprehension', 'Cloze Test', 'Error Detection'],
    color: '#94a3b8'
  },
  Reasoning: { 
    desc: 'Verbal + Non-verbal', 
    icon: Brain,
    topics: ['Analogy', 'Classification', 'Series', 'Coding-Decoding', 'Blood Relations', 'Direction Sense'],
    color: '#ef4444'
  },
  Mixed: { 
    desc: 'Combined mocks or general practice', 
    icon: BookIcon,
    topics: ['Mixed Topics'],
    color: '#94a3b8'
  },
}

export function SubjectCard({ subject, selected, onClick }: SubjectCardProps) {
  const { desc, icon: Icon, color } = DETAILS[subject] ?? DETAILS.Mixed

  return (
    <motion.button
      type="button"
      className={`subject-card-horizontal ${selected ? 'selected' : ''}`}
      onClick={onClick}
      style={{
        borderColor: selected ? color : 'var(--border)',
        boxShadow: selected ? `0 0 20px ${color}40` : 'none'
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <div className="subject-icon" style={{ color: selected ? color : 'var(--muted)' }}>
        <Icon size={20} />
      </div>
      <div className="subject-content">
        <strong style={{ color: selected ? color : 'var(--text)' }}>{subject}</strong>
        <span className="subject-desc">{desc}</span>
      </div>
    </motion.button>
  )
}
