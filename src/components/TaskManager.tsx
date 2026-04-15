import type { TaskDoc } from '../types'
import { TaskForm } from './TaskForm'
import { TaskList } from './TaskList'

type Props = {
  myUid: string
  tasks: TaskDoc[]
}

export function TaskManager({ myUid, tasks }: Props) {
  return (
    <>
      <TaskForm myUid={myUid} />
      <TaskList myUid={myUid} tasks={tasks} />
    </>
  )
}
