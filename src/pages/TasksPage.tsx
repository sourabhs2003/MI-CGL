import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { useTasks } from '../hooks/useFirestoreData'
import { TaskForm } from '../components/TaskForm'
import { TaskList } from '../components/TaskList'

export function TasksPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const tasks = useTasks(user?.uid)

  return (
    <main className="tasks-stack">
      <header className="page-head compact">
        <p className="eyebrow">Tasks</p>
        <h1>Tasks</h1>
      </header>

      <div className="tasks-main">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
        >
          <TaskList myUid={uid} tasks={tasks} />
        </motion.div>
      </div>

      {uid ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut', delay: 0.04 }}
          className="tasks-side"
        >
          <TaskForm myUid={uid} />
        </motion.div>
      ) : null}
    </main>
  )
}
