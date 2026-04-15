import { SUBJECTS } from '../lib/calculations'
import type { Subject } from '../types'
import { SubjectCard } from './SubjectCard'

type Props = {
  value: Subject
  onChange: (subject: Subject) => void
  includeMixed?: boolean
}

export function SubjectSelector({ value, onChange, includeMixed = false }: Props) {
  const options = includeMixed ? [...SUBJECTS, 'Mixed' as Subject] : SUBJECTS

  return (
    <div className="subject-selector-grid">
      {options.map((s) => (
        <SubjectCard
          key={s}
          subject={s}
          selected={value === s}
          onClick={() => onChange(s)}
        />
      ))}
    </div>
  )
}
