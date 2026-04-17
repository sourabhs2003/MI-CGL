import { useMemo, useState, type FormEvent } from 'react'
import { getDefaultSectionalOverall } from '../services/mocks'
import type { MockOverall, SectionalMockDoc } from '../types'

type Props = {
  busy?: boolean
  onSubmit: (data: {
    subject: SectionalMockDoc['subject']
    overall: MockOverall
  }) => Promise<void>
}

const sectionalSubjects: SectionalMockDoc['subject'][] = ['Maths', 'GS', 'English', 'Reasoning']

function validateOverall(overall: MockOverall) {
  if (overall.score > overall.total) return 'Score cannot exceed total.'
  if (overall.attempted > overall.total) return 'Attempted cannot exceed total.'
  if (overall.accuracy > 100) return 'Accuracy cannot exceed 100.'
  if ((overall.percentile ?? 0) > 100) return 'Percentile cannot exceed 100.'
  return ''
}

export function SectionalMockForm({ onSubmit, busy = false }: Props) {
  const [subject, setSubject] = useState<SectionalMockDoc['subject']>('Maths')
  const [overall, setOverall] = useState<MockOverall>(getDefaultSectionalOverall())
  const [error, setError] = useState('')

  const validationError = useMemo(() => validateOverall(overall), [overall])

  function updateOverall<K extends keyof MockOverall>(key: K, value: MockOverall[K]) {
    setOverall((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    await onSubmit({ subject, overall })
    setOverall(getDefaultSectionalOverall())
  }

  return (
    <form className="dynamic-mock-form" onSubmit={handleSubmit}>
      <label className="field full">
        <span>Section</span>
        <select value={subject} onChange={(e) => setSubject(e.target.value as SectionalMockDoc['subject'])}>
          {sectionalSubjects.map((item) => (
            <option key={item} value={item}>
              {item === 'Maths' ? 'Quant' : item === 'GS' ? 'GA' : item}
            </option>
          ))}
        </select>
      </label>

      <div className="field-row">
        <label className="field">
          <span>Score</span>
          <input type="number" min={0} value={overall.score} onChange={(e) => updateOverall('score', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Total</span>
          <input type="number" min={0} value={overall.total} onChange={(e) => updateOverall('total', Number(e.target.value))} />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Attempted</span>
          <input type="number" min={0} value={overall.attempted} onChange={(e) => updateOverall('attempted', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Accuracy</span>
          <input type="number" min={0} max={100} value={overall.accuracy} onChange={(e) => updateOverall('accuracy', Number(e.target.value))} />
        </label>
      </div>

      <div className="field-row">
        <label className="field">
          <span>Time</span>
          <input type="number" min={0} value={overall.time} onChange={(e) => updateOverall('time', Number(e.target.value))} />
        </label>
        <label className="field">
          <span>Percentile</span>
          <input type="number" min={0} max={100} value={overall.percentile ?? 0} onChange={(e) => updateOverall('percentile', Number(e.target.value))} />
        </label>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="btn primary full-width" disabled={busy}>
        {busy ? 'Saving mock...' : 'Save sectional mock'}
      </button>
    </form>
  )
}
