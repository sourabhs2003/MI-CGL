import { useMemo, useState, type FormEvent } from 'react'
import { getDefaultFullOverall, getDefaultFullSections } from '../services/mocks'
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
    <form className="dynamic-mock-form" onSubmit={handleSubmit}>
      <div className="field full">
        <span>Tier</span>
        <select value={exam} onChange={(e) => setExam(e.target.value as FullExamType)}>
          <option value="SSC CGL Tier 1">Tier 1</option>
          <option value="SSC CGL Tier 2">Tier 2</option>
        </select>
      </div>

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

      <section className="mock-sections-grid">
        {sections.map((section, index) => (
          <div key={section.name} className="mock-section-card">
            <div className="home-block-head">
              <h3>{sectionLabels[section.name]}</h3>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Score</span>
                <input type="number" min={0} value={section.score} onChange={(e) => updateSection(index, 'score', Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Total</span>
                <input type="number" min={0} value={section.total} onChange={(e) => updateSection(index, 'total', Number(e.target.value))} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Attempted</span>
                <input type="number" min={0} value={section.attempted} onChange={(e) => updateSection(index, 'attempted', Number(e.target.value))} />
              </label>
              <label className="field">
                <span>Accuracy</span>
                <input type="number" min={0} max={100} value={section.accuracy} onChange={(e) => updateSection(index, 'accuracy', Number(e.target.value))} />
              </label>
            </div>
            <label className="field full">
              <span>Time</span>
              <input type="number" min={0} value={section.time} onChange={(e) => updateSection(index, 'time', Number(e.target.value))} />
            </label>
          </div>
        ))}
      </section>

      {error ? <p className="form-error">{error}</p> : null}

      <button type="submit" className="btn primary full-width" disabled={busy}>
        {busy ? 'Saving mock...' : 'Save full mock'}
      </button>
    </form>
  )
}
