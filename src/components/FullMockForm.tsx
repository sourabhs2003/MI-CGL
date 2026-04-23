import { useMemo, useState, type FormEvent } from 'react'
import { getDefaultFullOverall, getDefaultFullSections } from '../services/mocks'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { FullExamType, FullMockSection, MockOverall, SectionName } from '../types'

type Props = {
  busy?: boolean
  onSubmit: (data: {
    exam: FullExamType
    overall: MockOverall
    sections: FullMockSection[]
  }) => Promise<void>
}

const sectionLabels: Record<SectionName, string> = {
  Reasoning: 'Reasoning',
  GA: 'GA',
  Maths: 'Quant',
  English: 'English',
}

function validateOverall(overall: MockOverall) {
  if (overall.score > overall.total) return 'Score cannot exceed total.'
  if (overall.attempted > overall.total) return 'Attempted cannot exceed total.'
  if (overall.accuracy > 100) return 'Accuracy cannot exceed 100.'
  if ((overall.percentile ?? 0) > 100) return 'Percentile cannot exceed 100.'
  return ''
}

export function FullMockForm({ onSubmit, busy = false }: Props) {
  const [exam, setExam] = useState<FullExamType>('SSC CGL Tier 1')
  const [overall, setOverall] = useState<MockOverall>(getDefaultFullOverall())
  const [sections, setSections] = useState<FullMockSection[]>(getDefaultFullSections())
  const [error, setError] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<SectionName>>(new Set())

  const validationError = useMemo(() => {
    const overallError = validateOverall(overall)
    if (overallError) return overallError
    for (const section of sections) {
      if (section.score > section.total) return `${sectionLabels[section.name]} score cannot exceed total.`
      if (section.attempted > section.total) return `${sectionLabels[section.name]} attempted cannot exceed total.`
      if (section.accuracy > 100) return `${sectionLabels[section.name]} accuracy cannot exceed 100.`
    }
    return ''
  }, [overall, sections])

  function updateOverall<K extends keyof MockOverall>(key: K, value: MockOverall[K]) {
    setOverall((current) => ({ ...current, [key]: value }))
  }

  function toggleSection(sectionName: SectionName) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionName)) {
        next.delete(sectionName)
      } else {
        next.add(sectionName)
      }
      return next
    })
  }

  function updateSection(index: number, key: keyof FullMockSection, value: number) {
    setSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [key]: value } : section,
      ),
    )
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const nextError = validationError
    if (nextError) {
      setError(nextError)
      return
    }

    setError('')
    await onSubmit({ exam, overall, sections })
    setOverall(getDefaultFullOverall(exam))
    setSections(getDefaultFullSections())
  }

  return (
    <form className="mock-entry-form" onSubmit={handleSubmit}>
      <div className="mock-section-label">Basic Info</div>
      <div className="mock-field-full">
        <label className="mock-field">
          <span>Tier</span>
          <select value={exam} onChange={(e) => setExam(e.target.value as FullExamType)}>
            <option value="SSC CGL Tier 1">Tier 1</option>
            <option value="SSC CGL Tier 2">Tier 2</option>
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

      <div className="mock-section-label">Section-wise Breakdown</div>
      <div className="mock-sections-accordion">
        {sections.map((section, index) => {
          const isExpanded = expandedSections.has(section.name)
          return (
            <div key={section.name} className="mock-accordion-item">
              <button
                type="button"
                className="mock-accordion-header"
                onClick={() => toggleSection(section.name)}
              >
                <span>{sectionLabels[section.name]}</span>
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {isExpanded && (
                <div className="mock-accordion-content">
                  <div className="mock-field-row">
                    <label className="mock-field">
                      <span>Score</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Enter score"
                        value={section.score || ''}
                        onChange={(e) => updateSection(index, 'score', e.target.value ? Number(e.target.value) : 0)} 
                      />
                    </label>
                    <label className="mock-field">
                      <span>Total</span>
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="Enter total"
                        value={section.total || ''}
                        onChange={(e) => updateSection(index, 'total', e.target.value ? Number(e.target.value) : 0)} 
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )
        })}
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
