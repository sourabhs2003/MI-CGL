import { useMemo, useState, type FormEvent } from 'react'
import { getDefaultFullOverall, getDefaultFullSections } from '../services/mocks'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { todayKey } from '../lib/dates'
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

function buildEntryCoach(overall: MockOverall, sections: FullMockSection[]) {
  const scorePct = overall.total > 0 ? (overall.score / overall.total) * 100 : 0
  const weakSection = sections
    .filter((section) => section.total > 0)
    .map((section) => ({
      name: sectionLabels[section.name],
      scorePct: (section.score / section.total) * 100,
      accuracy: section.accuracy,
    }))
    .sort((a, b) => (a.scorePct + a.accuracy) - (b.scorePct + b.accuracy))[0]

  if (overall.score === 0 && overall.attempted === 0) {
    return 'Enter score, attempts, and accuracy to get instant repair advice before saving.'
  }
  if (overall.accuracy < 55 && overall.attempted > 0) {
    return `Accuracy is the pressure point. Review wrong attempts first, then take a 20-question ${weakSection?.name ?? 'weak-section'} drill.`
  }
  if (weakSection && weakSection.scorePct + 8 < scorePct) {
    return `${weakSection.name} is dragging the paper. Keep tomorrow's first block for targeted PYQ revision there.`
  }
  if (scorePct >= 70 && overall.accuracy >= 75) {
    return 'Strong entry. Save it, then inspect rank/time to decide whether speed or selectivity is the next upgrade.'
  }
  return 'Stable mock. Save it, then compare this with your last 5 mocks in analysis for the next action.'
}

export function FullMockForm({ onSubmit, busy = false }: Props) {
  const [exam, setExam] = useState<FullExamType>('SSC CGL Tier 1')
  const [overall, setOverall] = useState<MockOverall>(getDefaultFullOverall())
  const [sections, setSections] = useState<FullMockSection[]>(getDefaultFullSections())
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<SectionName>>(new Set())

  const validationError = useMemo(() => {
    const overallError = validateOverall(overall)
    if (overallError) return overallError
    for (const section of sections) {
      if (section.score < 0 || section.total < 0 || section.attempted < 0 || section.accuracy < 0 || section.time < 0) {
        return `${sectionLabels[section.name]} values cannot be negative.`
      }
      if (section.score > section.total) return `${sectionLabels[section.name]} score cannot exceed total.`
      if (section.attempted > section.total) return `${sectionLabels[section.name]} attempted cannot exceed total.`
      if (section.accuracy > 100) return `${sectionLabels[section.name]} accuracy cannot exceed 100.`
    }
    return ''
  }, [overall, sections])
  const coachMessage = useMemo(() => buildEntryCoach(overall, sections), [overall, sections])

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
    setShowPreview(false)
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

    if (!showPreview) {
      setError('')
      setShowPreview(true)
      return
    }

    setError('')
    await onSubmit({ exam, overall: { ...overall, rank: overall.rank ?? 0, rankTotal: overall.rankTotal ?? 0 }, sections })
    setOverall(getDefaultFullOverall(exam))
    setSections(getDefaultFullSections())
    setShowPreview(false)
  }

  return (
    <form className="mock-entry-form" onSubmit={handleSubmit}>
      <div className="mock-section-label">Basic Info</div>
      <div className="mock-field-full">
        <label className="mock-field">
          <span>Tier</span>
          <select value={exam} onChange={(e) => {
            setShowPreview(false)
            setExam(e.target.value as FullExamType)
          }}>
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
                  <div className="mock-field-row">
                    <label className="mock-field">
                      <span>Attempted</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Enter attempted"
                        value={section.attempted || ''}
                        onChange={(e) => updateSection(index, 'attempted', e.target.value ? Number(e.target.value) : 0)}
                      />
                    </label>
                    <label className="mock-field">
                      <span>Accuracy</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Enter accuracy"
                        value={section.accuracy || ''}
                        onChange={(e) => updateSection(index, 'accuracy', e.target.value ? Number(e.target.value) : 0)}
                      />
                    </label>
                  </div>
                  <div className="mock-field-full">
                    <label className="mock-field">
                      <span>Time (min)</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Enter time"
                        value={section.time || ''}
                        onChange={(e) => updateSection(index, 'time', e.target.value ? Number(e.target.value) : 0)}
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )
        })}
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
            <span>Exam</span>
            <strong>{exam.replace('SSC CGL ', '')}</strong>
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
