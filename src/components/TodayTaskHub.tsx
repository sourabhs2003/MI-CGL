import { Check, Sparkles } from 'lucide-react'
import confetti from 'canvas-confetti'
import { useMemo, useState } from 'react'
import { completeTask } from '../services/tasks'
import { useTasks } from '../hooks/useFirestoreData'
import { todayKey } from '../lib/dates'
import type { Subject, TaskDoc } from '../types'

type Props = {
  uid: string
}

const SUBJECT_ORDER: Subject[] = ['Maths', 'English', 'Reasoning', 'GS', 'Mock', 'Mixed']
const SUBJECT_COLORS: Record<string, string> = {
  Maths: '#3ABEFF',
  English: '#A66CFF',
  Reasoning: '#2ED573',
  GS: '#FF9F43',
  Mock: '#94a3b8',
  Mixed: '#ec4899',
  Miscellaneous: '#a855f7',
  Other: '#14b8a6',
}

function taskKey(task: TaskDoc) {
  return `${task.isGroupTask ? 'group' : 'personal'}-${task.id}`
}

function getTaskXp(task: TaskDoc) {
  if (task.priority === 'High') return 15
  if (task.priority === 'Medium') return 10
  return 5
}

function getGroupName(task: TaskDoc) {
  if (SUBJECT_ORDER.includes(task.subject as Subject)) return task.subject
  return 'Other Tasks'
}

export function TodayTaskHub({ uid }: Props) {
  const tasks = useTasks(uid)
  const today = todayKey()
  const [completing, setCompleting] = useState<Record<string, number>>({})
  const [justCompleted, setJustCompleted] = useState(false)

  const todayTasks = useMemo(
    () => tasks.filter((task) => task.dateKey === today),
    [tasks, today],
  )
  const pendingTasks = todayTasks.filter((task) => !task.completed)

  const groupedTasks = useMemo(() => {
    const groups = new Map<string, TaskDoc[]>()
    pendingTasks.forEach((task) => {
      const group = getGroupName(task)
      groups.set(group, [...(groups.get(group) ?? []), task])
    })
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === 'Other Tasks') return 1
      if (b === 'Other Tasks') return -1
      return SUBJECT_ORDER.indexOf(a as Subject) - SUBJECT_ORDER.indexOf(b as Subject)
    })
  }, [pendingTasks])

  const isAllDone = todayTasks.length > 0 && pendingTasks.length === 0

  async function handleComplete(task: TaskDoc) {
    if (!task.id || task.completed || completing[taskKey(task)]) return
    const key = taskKey(task)
    const xp = getTaskXp(task)
    setCompleting((prev) => ({ ...prev, [key]: xp }))
    try {
      await completeTask(uid, task)
      setJustCompleted(true)
      if (pendingTasks.length === 1) {
        void confetti({
          particleCount: 18,
          spread: 46,
          startVelocity: 18,
          scalar: 0.65,
          origin: { y: 0.58 },
          ticks: 90,
        })
      }
    } catch (error) {
      console.error('Failed to complete task:', error)
      setCompleting((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    } finally {
      window.setTimeout(() => {
        setCompleting((prev) => {
          const next = { ...prev }
          delete next[key]
          return next
        })
      }, 320)
      window.setTimeout(() => setJustCompleted(false), 900)
    }
  }

  return (
    <section className={`card today-task-hub ${isAllDone ? 'all-done' : ''} ${justCompleted ? 'reward-pop' : ''}`}>
      <div className="card-head task-hub-head">
        <div>
          <p className="eyebrow">Today Task Hub</p>
          <h2>{pendingTasks.length} tasks left</h2>
        </div>
        {isAllDone ? <Sparkles size={18} className="task-hub-spark" /> : null}
      </div>

      {todayTasks.length === 0 ? (
        <p className="muted task-hub-empty">No tasks for today.</p>
      ) : isAllDone ? (
        <p className="task-hub-done">Everything done. You're ahead of 90% users.</p>
      ) : (
        <div className="task-hub-groups">
          {groupedTasks.map(([group, groupTasks]) => (
            <div key={group} className="task-hub-group">
              <div className="task-hub-group-title">
                <span>{group}</span>
                <span>{groupTasks.length}</span>
              </div>
              <div className="task-hub-list">
                {groupTasks.map((task) => {
                  const key = taskKey(task)
                  const color = SUBJECT_COLORS[task.subject] ?? SUBJECT_COLORS.Other
                  const xp = completing[key]
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`task-hub-item ${xp ? 'completing' : ''}`}
                      onClick={() => void handleComplete(task)}
                    >
                      <span className="task-hub-checkbox" style={{ borderColor: color }}>
                        <Check size={12} />
                      </span>
                      <span className="task-hub-title">{task.title}</span>
                      <span className="task-hub-tag" style={{ color, borderColor: `${color}66` }}>
                        {task.subject || 'Other'}
                      </span>
                      {xp ? <span className="task-xp-float">+{xp} XP</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
