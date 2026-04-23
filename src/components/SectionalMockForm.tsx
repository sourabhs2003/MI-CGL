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
    <form className="mock-entry-form" onSubmit={handleSubmit}>
      <div className="mock-section-label">Basic Info</div>
      <div className="mock-field-full">
        <label className="mock-field">
          <span>Section</span>
          <select value={subject} onChange={(e) => setSubject(e.target.value as SectionalMockDoc['subject'])}>
            {sectionalSubjects.map((item) => (
              <option key={item} value={item}>
                {item === 'Maths' ? 'Quant' : item === 'GS' ? 'GA' : item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mock-section-label">Performance</div>
      <div className="mock-field-row">
        <label className="mock-field">
          <span>Score</span>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Enter score"
            value={overall.score || ''}
            onChange={(e) => updateOverall('score', e.target.value ? Number(e.target.value) : 0)} 
          />
        </label>
        <label className="mock-field">
          <span>Total</span>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Enter total"
            value={overall.total || ''}
            onChange={(e) => updateOverall('total', e.target.value ? Number(e.target.value) : 0)} 
          />
        </label>
      </div>

      <div className="mock-field-row">
        <label className="mock-field">
          <span>Attempted</span>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Enter attempted"
            value={overall.attempted || ''}
            onChange={(e) => updateOverall('attempted', e.target.value ? Number(e.target.value) : 0)} 
          />
        </label>
        <label className="mock-field">
          <span>Accuracy</span>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Enter accuracy"
            value={overall.accuracy || ''}
            onChange={(e) => updateOverall('accuracy', e.target.value ? Number(e.target.value) : 0)} 
          />
        </label>
      </div>

      <div className="mock-field-row">
        <label className="mock-field">
          <span>Time (min)</span>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Enter time"
            value={overall.time || ''}
            onChange={(e) => updateOverall('time', e.target.value ? Number(e.target.value) : 0)} 
          />
        </label>
        <label className="mock-field">
          <span>Percentile</span>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Enter percentile"
            value={overall.percentile ?? ''}
            onChange={(e) => updateOverall('percentile', e.target.value ? Number(e.target.value) : undefined)} 
          />
        </label>
      </div>

      {error && <p className="mock-form-error">{error}</p>}

      <div className="mock-form-actions">
        <button type="submit" className="mock-save-btn" disabled={busy}>
          {busy ? 'Saving...' : 'Save Mock'}
        </button>
      </div>
    </form>
  )
}
