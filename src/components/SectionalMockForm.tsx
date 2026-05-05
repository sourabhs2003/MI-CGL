import { useMemo, useState, type FormEvent } from 'react'
import { Sparkles } from 'lucide-react'
import { getDefaultSectionalOverall } from '../services/mocks'
import { todayKey } from '../lib/dates'
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
  if (overall.score < 0 || overall.total < 0 || overall.attempted < 0 || overall.accuracy < 0 || overall.time < 0) {
    return 'Values cannot be negative.'
  }
  if (overall.score > overall.total) return 'Score cannot exceed total.'
  if (overall.attempted > overall.total) return 'Attempted cannot exceed total.'
  if (overall.accuracy > 100) return 'Accuracy cannot exceed 100.'
  if ((overall.percentile ?? 0) > 100) return 'Percentile cannot exceed 100.'
  if ((overall.rank ?? 0) > 0 && (overall.rankTotal ?? 0) > 0 && (overall.rank ?? 0) > (overall.rankTotal ?? 0)) {
    return 'Rank cannot be greater than total rank count.'
  }
  return ''
}

function buildSectionCoach(subject: SectionalMockDoc['subject'], overall: MockOverall) {
  const label = subject === 'Maths' ? 'Quant' : subject === 'GS' ? 'GA' : subject
  const scorePct = overall.total > 0 ? (overall.score / overall.total) * 100 : 0

  if (overall.score === 0 && overall.attempted === 0) {
    return `Enter ${label} numbers to get a quick action hint before saving.`
  }
  if (overall.accuracy < 55 && overall.attempted > 0) {
    return `${label} needs error cleanup. Rework wrong questions before adding new sets.`
  }
  if (scorePct < 50) {
    return `${label} score is below target. Do one concept block, then one timed sectional.`
  }
  if (scorePct >= 70 && overall.accuracy >= 75) {
    return `${label} is in a strong zone. Next push should be speed without losing accuracy.`
  }
  return `${label} is workable. Save it, then check analysis for trend and weak-section context.`
}

export function SectionalMockForm({ onSubmit, busy = false }: Props) {
  const [subject, setSubject] = useState<SectionalMockDoc['subject']>('Maths')
  const [overall, setOverall] = useState<MockOverall>(getDefaultSectionalOverall())
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const validationError = useMemo(() => validateOverall(overall), [overall])
  const coachMessage = useMemo(() => buildSectionCoach(subject, overall), [subject, overall])
  const preview = useMemo(() => {
    const percentage = overall.total > 0 ? (overall.score / overall.total) * 100 : 0
    const rank = overall.rank ?? 0
    const rankTotal = overall.rankTotal ?? 0
    const indicator =
      overall.accuracy >= 80 && percentage >= 70
        ? 'Strong'
        : overall.accuracy >= 65 || percentage >= 55
          ? 'Stable'
          : 'Needs review'

    return {
      date: todayKey(),
      percentage: Number(percentage.toFixed(1)),
      rankLabel: rank > 0 ? (rankTotal > 0 ? `${rank} / ${rankTotal}` : String(rank)) : 'Not applicable',
      indicator,
    }
  }, [overall])

  function updateOverall<K extends keyof MockOverall>(key: K, value: MockOverall[K]) {
    setShowPreview(false)
    setOverall((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!showPreview) {
      setError('')
      setShowPreview(true)
      return
    }

    setError('')
    await onSubmit({ subject, overall: { ...overall, rank: overall.rank ?? 0, rankTotal: overall.rankTotal ?? 0 } })
    setOverall(getDefaultSectionalOverall())
    setShowPreview(false)
  }

  return (
    <form className="mock-entry-form" onSubmit={handleSubmit}>
      <div className="mock-section-label">Basic Info</div>
      <div className="mock-field-full">
        <label className="mock-field">
          <span>Section</span>
          <select value={subject} onChange={(e) => {
            setShowPreview(false)
            setSubject(e.target.value as SectionalMockDoc['subject'])
          }}>
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

      <div className="mock-field-row">
        <label className="mock-field">
          <span>Rank</span>
          <input
            type="number"
            step="1"
            placeholder="Optional"
            value={overall.rank || ''}
            onChange={(e) => updateOverall('rank', e.target.value ? Number(e.target.value) : 0)}
          />
        </label>
        <label className="mock-field">
          <span>Out of</span>
          <input
            type="number"
            step="1"
            placeholder="Optional"
            value={overall.rankTotal || ''}
            onChange={(e) => updateOverall('rankTotal', e.target.value ? Number(e.target.value) : 0)}
          />
        </label>
      </div>

      <section className="mock-ai-coach" aria-live="polite">
        <div className="mock-ai-coach-icon">
          <Sparkles size={16} />
        </div>
        <div>
          <span>Smart coach</span>
          <strong>{coachMessage}</strong>
        </div>
      </section>

      {error && <p className="mock-form-error">{error}</p>}

      {showPreview ? (
        <section className="mock-save-preview" aria-live="polite">
          <div>
            <span>Section</span>
            <strong>{subject === 'Maths' ? 'Quant' : subject === 'GS' ? 'GA' : subject}</strong>
          </div>
          <div>
            <span>Date</span>
            <strong>{preview.date}</strong>
          </div>
          <div>
            <span>Percentage</span>
            <strong>{preview.percentage}%</strong>
          </div>
          <div>
            <span>Rank</span>
            <strong>{preview.rankLabel}</strong>
          </div>
          <div>
            <span>Indicator</span>
            <strong>{preview.indicator}</strong>
          </div>
        </section>
      ) : null}

      <div className="mock-form-actions">
        <button type="submit" className="mock-save-btn" disabled={busy}>
          {busy ? 'Saving...' : showPreview ? 'Confirm & Save' : 'Preview Mock'}
        </button>
      </div>
    </form>
  )
}
