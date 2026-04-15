import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { completeTask, deleteTask } from '../services/tasks'
import type { TaskDoc } from '../types'
import { CheckSquare, Trash2 } from 'lucide-react'

type Props = {
  myUid: string
  tasks: TaskDoc[]
}

function burst() {
  try {
    confetti({
      particleCount: 100,
      spread: 70,
      startVelocity: 35,
      gravity: 0.9,
      ticks: 180,
      origin: { y: 0.7 },
      colors: ['#22c55e', '#3b82f6', '#facc15'],
    })
  } catch {
    // no-op
  }
}

export function TaskList({ myUid, tasks }: Props) {
  if (tasks.length === 0) {
    return <p className="muted">No tasks available.</p>
  }

  return (
    <ul className="task-list">
      <AnimatePresence mode="popLayout">
        {tasks.map((t) => (
          <motion.li
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`task-item ${t.completed ? 'completed' : ''} priority-${t.priority?.toLowerCase() || 'low'}`}
            layout
          >
            <div className="task-content">
              <div className="task-header">
                <span className={`task-priority ${t.priority?.toLowerCase() || 'low'}`}>
                  {t.priority || 'Low'}
                </span>
                <span className="task-subject">{t.subject}</span>
              </div>
              <p className={`task-title ${t.completed ? 'completed' : ''}`}>{t.title}</p>
              {t.dateKey && (
                <span className="task-date">{t.dateKey}</span>
              )}
            </div>
            <div className="task-actions">
              <motion.button
                type="button"
                className="task-checkbox"
                disabled={t.completed}
                onClick={async () => {
                  await completeTask(myUid, t.id!)
                  burst()
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Complete task"
              >
                {t.completed ? <CheckSquare className="completed-icon" /> : <CheckSquare />}
              </motion.button>
              <motion.button
                type="button"
                className="btn-icon delete-btn"
                onClick={() => void deleteTask(myUid, t.id!)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Delete task"
              >
                <Trash2 size={18} />
              </motion.button>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  )
}
