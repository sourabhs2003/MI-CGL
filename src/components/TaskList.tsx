import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckSquare, Trash2, Users } from 'lucide-react'
import { completeTask, deleteTask } from '../services/tasks'
import type { TaskDoc } from '../types'

type Props = {
  myUid: string
  tasks: TaskDoc[]
}

function burst() {
  try {
    confetti({
      particleCount: 70,
      spread: 55,
      startVelocity: 35,
      gravity: 0.9,
      ticks: 180,
      origin: { y: 0.7 },
      colors: ['#22c55e', '#38bdf8', '#facc15'],
    })
  } catch {
    /* no-op */
  }
}

export function TaskList({ myUid, tasks }: Props) {
  if (tasks.length === 0) {
    return <p className="muted">No tasks</p>
  }

  return (
    <section className="card task-list-card">
      <div className="card-head">
        <h2>Tasks</h2>
      </div>

      <ul className="task-list">
        <AnimatePresence mode="popLayout">
          {tasks.map((task) => (
            <motion.li
              key={task.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className={`task-item ${task.completed ? 'completed' : ''} priority-${task.priority?.toLowerCase() || 'low'}`}
              layout
            >
              <div className="task-content">
                <div className="task-header">
                  <span className={`task-priority ${task.priority?.toLowerCase() || 'low'}`}>
                    {task.priority || 'Low'}
                  </span>
                  <span className="task-subject">{task.subject}</span>
                  {task.isGroupTask ? (
                    <span className="task-badge">
                      <Users size={12} />
                      Group
                    </span>
                  ) : null}
                </div>
                <p className={`task-title ${task.completed ? 'completed' : ''}`}>{task.title}</p>
                {task.dateKey ? <span className="task-date">{task.dateKey}</span> : null}
              </div>

              <div className="task-actions">
                <motion.button
                  type="button"
                  className="task-checkbox"
                  disabled={task.completed}
                  onClick={async () => {
                    await completeTask(myUid, task)
                    burst()
                  }}
                  whileTap={{ scale: 0.97 }}
                  aria-label="Complete task"
                >
                  {task.completed ? <CheckSquare className="completed-icon" /> : <CheckSquare />}
                </motion.button>

                {!task.isGroupTask || task.createdBy === myUid ? (
                  <motion.button
                    type="button"
                    className="btn-icon delete-btn"
                    onClick={() => void deleteTask(myUid, task)}
                    whileTap={{ scale: 0.97 }}
                    aria-label="Delete task"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                ) : null}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  )
}
