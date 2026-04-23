import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { FullExamType, MockOverall, SectionalMockDoc } from '../types'
import type { ScreenshotReviewDraft } from '../services/mockScreenshotExtraction'

export type ScreenshotReviewPayload =
  | {
      mockType: 'full'
      exam: FullExamType
      overall: MockOverall
      sectionScores: {
        Reasoning: number
        GA: number
        Maths: number
        English: number
      }
      source: 'ocr'
    }
  | {
      mockType: 'sectional'
      subject: SectionalMockDoc['subject']
      overall: MockOverall
      source: 'ocr'
    }

type Props = {
  initialDraft: ScreenshotReviewDraft
  busy?: boolean
  onCancel: () => void
  onConfirm: (payload: ScreenshotReviewPayload) => Promise<void>
}

type DraftField = keyof ScreenshotReviewDraft

const sectionalSubjects: SectionalMockDoc['subject'][] = ['Maths', 'GS', 'English', 'Reasoning']

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function toRequiredNumber(value: string): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function buildWarning(draft: ScreenshotReviewDraft) {
  let warning = draft.warning
  const attempted = toOptionalNumber(draft.attempted)
  const correct = toOptionalNumber(draft.correct)
  const incorrect = toOptionalNumber(draft.incorrect)
  const totalQuestions = toOptionalNumber(draft.totalQuestions)
  const unattempted = toOptionalNumber(draft.unattempted)
  const accuracy = toOptionalNumber(draft.accuracy)

  if (attempted != null && correct != null && incorrect != null && correct + incorrect !== attempted) {
    warning = true
  }

  if (attempted != null && totalQuestions != null && unattempted != null && totalQuestions - attempted !== unattempted) {
    warning = true
  }

  if (attempted != null && attempted > 0 && correct != null && accuracy != null) {
    const expected = (correct / attempted) * 100
    if (Math.abs(expected - accuracy) > 1.5) {
      warning = true
    }
  }

  return warning
}

function buildOverall(draft: ScreenshotReviewDraft): MockOverall {
  return {
    score: toRequiredNumber(draft.scoreObtained),
    total: toRequiredNumber(draft.scoreTotal),
    attempted: toRequiredNumber(draft.attempted),
    accuracy: toRequiredNumber(draft.accuracy),
    time: 0,
    percentile: toOptionalNumber(draft.percentile),
    rank: toOptionalNumber(draft.rank),
    rankTotal: toOptionalNumber(draft.rankTotal),
    correct: toOptionalNumber(draft.correct),
    incorrect: toOptionalNumber(draft.incorrect),
    unattempted: toOptionalNumber(draft.unattempted),
  }
}

export function MockScreenshotReview({ initialDraft, busy = false, onCancel, onConfirm }: Props) {
  const [draft, setDraft] = useState<ScreenshotReviewDraft>(initialDraft)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(initialDraft)
    setError('')
  }, [initialDraft])

  const warning = useMemo(() => buildWarning(draft), [draft])

  function updateField<K extends DraftField>(key: K, value: ScreenshotReviewDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const validationError = useMemo(() => {
    if (!draft.scoreObtained.trim()) return 'Score obtained is required before saving.'
    if (!draft.scoreTotal.trim()) return 'Score total is required before saving.'
    if (!draft.attempted.trim()) return 'Attempted questions are required before saving.'
    if (!draft.totalQuestions.trim()) return 'Total questions are required before saving.'
    if (!draft.accuracy.trim()) return 'Accuracy is required before saving.'

    const score = toRequiredNumber(draft.scoreObtained)
    const scoreTotal = toRequiredNumber(draft.scoreTotal)
    const attempted = toRequiredNumber(draft.attempted)
    const totalQuestions = toRequiredNumber(draft.totalQuestions)
    const accuracy = toRequiredNumber(draft.accuracy)

    if (score > scoreTotal) return 'Score obtained cannot exceed total score.'
    if (attempted > totalQuestions) return 'Attempted questions cannot exceed total questions.'
    if (accuracy > 100) return 'Accuracy cannot exceed 100%.'
    return ''
  }, [draft])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (validationError) {
      setError(validationError)
      return
    }

    setError('')
    const overall = buildOverall(draft)

    if (draft.mockType === 'full') {
      await onConfirm({
        mockType: 'full',
        exam: draft.exam,
        overall,
        sectionScores: {
          Reasoning: toRequiredNumber(draft.reasoningScore),
          GA: toRequiredNumber(draft.gaScore),
          Maths: toRequiredNumber(draft.quantScore),
          English: toRequiredNumber(draft.englishScore),
        },
        source: draft.source,
      })
      return
    }

    await onConfirm({
      mockType: 'sectional',
      subject: draft.sectionalSubject,
      overall,
      source: draft.source,
    })
  }

  return (
    <form className="mock-entry-form mock-screenshot-review" onSubmit={handleSubmit}>
      <div className="mock-section-label">AI Review</div>
      <div className="mock-screenshot-banner">
        <div>
          <strong>Auto-filled from screenshot</strong>
          <p>Review the extracted values, edit anything that looks off, then confirm the save.</p>
        </div>
        {warning ? <span className="mock-warning-pill">Warning detected</span> : <span className="mock-ready-pill">Ready to save</span>}
      </div>

      {warning ? (
        <div className="mock-warning-box">
          Validation found a mismatch in the extracted numbers. Please verify before saving.
        </div>
      ) : null}

      <div className="mock-section-label">Mock Setup</div>
      <div className="mock-field-row">
        <label className="mock-field">
          <span>Mock Type</span>
          <select value={draft.mockType} onChange={(e) => updateField('mockType', e.target.value as ScreenshotReviewDraft['mockType'])}>
            <option value="full">Full Mock</option>
            <option value="sectional">Sectional</option>
          </select>
        </label>

        {draft.mockType === 'full' ? (
          <label className="mock-field">
            <span>Tier</span>
            <select value={draft.exam} onChange={(e) => updateField('exam', e.target.value as FullExamType)}>
              <option value="SSC CGL Tier 1">Tier 1</option>
              <option value="SSC CGL Tier 2">Tier 2</option>
            </select>
          </label>
        ) : (
          <label className="mock-field">
            <span>Section</span>
            <select
              value={draft.sectionalSubject}
              onChange={(e) => updateField('sectionalSubject', e.target.value as SectionalMockDoc['subject'])}
            >
              {sectionalSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject === 'Maths' ? 'Quant' : subject === 'GS' ? 'GA' : subject}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="mock-section-label">Performance</div>
      <div className="mock-field-row">
        <label className="mock-field">
          <span>Score Obtained</span>
          <input type="number" step="0.01" value={draft.scoreObtained} onChange={(e) => updateField('scoreObtained', e.target.value)} />
        </label>
        <label className="mock-field">
          <span>Score Total</span>
          <input type="number" step="0.01" value={draft.scoreTotal} onChange={(e) => updateField('scoreTotal', e.target.value)} />
        </label>
      </div>

      <div className="mock-field-row">
        <label className="mock-field">
          <span>Rank</span>
          <input type="number" value={draft.rank} onChange={(e) => updateField('rank', e.target.value)} />
        </label>
        <label className="mock-field">
          <span>Total Rank Count</span>
          <input type="number" value={draft.rankTotal} onChange={(e) => updateField('rankTotal', e.target.value)} />
        </label>
      </div>

      <div className="mock-field-row">
        <label className="mock-field">
          <span>Percentile</span>
          <input type="number" step="0.01" value={draft.percentile} onChange={(e) => updateField('percentile', e.target.value)} />
        </label>
        <label className="mock-field">
          <span>Accuracy</span>
          <input type="number" step="0.01" value={draft.accuracy} onChange={(e) => updateField('accuracy', e.target.value)} />
        </label>
      </div>

      <div className="mock-section-label">Questions</div>
      <div className="mock-field-row">
        <label className="mock-field">
          <span>Attempted</span>
          <input type="number" value={draft.attempted} onChange={(e) => updateField('attempted', e.target.value)} />
        </label>
        <label className="mock-field">
          <span>Total Questions</span>
          <input type="number" value={draft.totalQuestions} onChange={(e) => updateField('totalQuestions', e.target.value)} />
        </label>
      </div>

      <div className="mock-field-row">
        <label className="mock-field">
          <span>Correct</span>
          <input type="number" value={draft.correct} onChange={(e) => updateField('correct', e.target.value)} />
        </label>
        <label className="mock-field">
          <span>Incorrect</span>
          <input type="number" value={draft.incorrect} onChange={(e) => updateField('incorrect', e.target.value)} />
        </label>
      </div>

      <div className="mock-field-full">
        <label className="mock-field">
          <span>Unattempted</span>
          <input type="number" value={draft.unattempted} onChange={(e) => updateField('unattempted', e.target.value)} />
        </label>
      </div>

      <div className="mock-section-label">Sections</div>
      <div className="mock-field-row">
        <label className="mock-field">
          <span>Reasoning</span>
          <input type="number" step="0.01" value={draft.reasoningScore} onChange={(e) => updateField('reasoningScore', e.target.value)} />
        </label>
        <label className="mock-field">
          <span>GA</span>
          <input type="number" step="0.01" value={draft.gaScore} onChange={(e) => updateField('gaScore', e.target.value)} />
        </label>
      </div>

      <div className="mock-field-row">
        <label className="mock-field">
          <span>Quant</span>
          <input type="number" step="0.01" value={draft.quantScore} onChange={(e) => updateField('quantScore', e.target.value)} />
        </label>
        <label className="mock-field">
          <span>English</span>
          <input type="number" step="0.01" value={draft.englishScore} onChange={(e) => updateField('englishScore', e.target.value)} />
        </label>
      </div>

      {error ? <p className="mock-form-error">{error}</p> : null}

      <div className="mock-screenshot-actions">
        <button type="button" className="mock-secondary-btn" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="mock-save-btn" disabled={busy}>
          {busy ? 'Saving...' : 'Confirm & Save'}
        </button>
      </div>
    </form>
  )
}
