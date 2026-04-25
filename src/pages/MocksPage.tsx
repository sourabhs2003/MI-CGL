import { useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, ImageUp, LoaderCircle } from 'lucide-react'
import { FullMockForm } from '../components/FullMockForm'
import { MockScreenshotReview, type ScreenshotReviewPayload } from '../components/MockScreenshotReview'
import { SectionalMockForm } from '../components/SectionalMockForm'
import { useAuth } from '../context/AuthContext'
import { useMocks } from '../hooks/useFirestoreData'
import { toMillis } from '../lib/firestoreTime'
import { extractMockScreenshot, toScreenshotReviewDraft, type ScreenshotReviewDraft } from '../services/mockScreenshotExtraction'
import { addFullMock, addSectionalMock, deleteMock } from '../services/mocks'

export function MocksPage() {
  const { user } = useAuth()
  const uid = user?.uid
  const mocks = useMocks(uid)
  const [entryType, setEntryType] = useState<'full' | 'sectional'>('full')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [screenshotBusy, setScreenshotBusy] = useState(false)
  const [screenshotProgress, setScreenshotProgress] = useState('')
  const [screenshotError, setScreenshotError] = useState('')
  const [reviewDraft, setReviewDraft] = useState<ScreenshotReviewDraft | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function handleFullSubmit(data: Parameters<typeof addFullMock>[1]) {
    if (!uid) return
    setBusy(true)
    setError('')

    try {
      await addFullMock(uid, data)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not save mock.')
    } finally {
      setBusy(false)
    }
  }

  async function handleSectionalSubmit(data: Parameters<typeof addSectionalMock>[1]) {
    if (!uid) return
    setBusy(true)
    setError('')

    try {
      await addSectionalMock(uid, data)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not save mock.')
    } finally {
      setBusy(false)
    }
  }

  async function handleScreenshotSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setScreenshotBusy(true)
    setScreenshotProgress('Preparing screenshot...')
    setScreenshotError('')
    setError('')

    try {
      const extraction = await extractMockScreenshot(file, (progress) => {
        const percent =
          'progress' in progress && typeof progress.progress === 'number'
            ? ` ${Math.round(progress.progress * 100)}%`
            : ''
        setScreenshotProgress(`${progress.message}${percent}`)
      })

      const nextDraft = toScreenshotReviewDraft(extraction)
      setReviewDraft(nextDraft)
      setEntryType(nextDraft.mockType)
    } catch (nextError) {
      setReviewDraft(null)
      setScreenshotError(nextError instanceof Error ? nextError.message : 'Could not process screenshot.')
    } finally {
      setScreenshotBusy(false)
    }
  }

  async function handleScreenshotConfirm(payload: ScreenshotReviewPayload) {
    if (!uid) return
    setBusy(true)
    setError('')
    setScreenshotError('')

    try {
      if (payload.mockType === 'full') {
        await addFullMock(
          uid,
          {
            exam: payload.exam,
            overall: payload.overall,
            sections: [
              { name: 'Reasoning', score: payload.sectionScores.Reasoning, total: 50, attempted: 0, accuracy: 0, time: 0 },
              { name: 'GA', score: payload.sectionScores.GA, total: 50, attempted: 0, accuracy: 0, time: 0 },
              { name: 'Maths', score: payload.sectionScores.Maths, total: 50, attempted: 0, accuracy: 0, time: 0 },
              { name: 'English', score: payload.sectionScores.English, total: 50, attempted: 0, accuracy: 0, time: 0 },
            ],
          },
          payload.source,
        )
      } else {
        await addSectionalMock(
          uid,
          {
            subject: payload.subject,
            overall: payload.overall,
          },
          payload.source,
        )
      }

      setReviewDraft(null)
      setScreenshotProgress('')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not save extracted mock.')
    } finally {
      setBusy(false)
    }
  }

  function openFilePicker() {
    fileInputRef.current?.click()
  }

  function resetReview() {
    setReviewDraft(null)
    setScreenshotError('')
    setScreenshotProgress('')
    setEntryType('full')
  }

  return (
    <main className="mock-entry-page">
      <div className="mock-sticky-header">
        <div className="mock-header-content">
          <h1>Mock Entry</h1>
          <Link to="/mocks/analysis" className="mock-analysis-btn">
            Analysis
          </Link>
        </div>
      </div>

      <div className="mock-entry-content">
        {/* Left Column: Input Form (70%) */}
        <div className="mock-form-main">
          <div className="mock-upload-card">
            <div className="mock-upload-copy">
              <p className="mock-upload-eyebrow">Auto-Fill</p>
              <h2>Upload Screenshot</h2>
            </div>

            <div className="mock-upload-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="mock-hidden-input"
                onChange={handleScreenshotSelect}
              />
              <button type="button" className="mock-upload-btn" onClick={openFilePicker} disabled={!uid || screenshotBusy}>
                {screenshotBusy ? <LoaderCircle size={18} className="spin" /> : <ImageUp size={18} />}
                <span>{screenshotBusy ? 'Processing...' : 'Upload Screenshot'}</span>
              </button>
              {screenshotProgress ? <p className="mock-upload-status">{screenshotProgress}</p> : null}
              {screenshotError ? <p className="mock-form-error">{screenshotError}</p> : null}
            </div>
          </div>

          {reviewDraft ? (
            <div className="mock-form-container">
              <MockScreenshotReview
                initialDraft={reviewDraft}
                busy={busy || !uid}
                onCancel={resetReview}
                onConfirm={handleScreenshotConfirm}
              />
            </div>
          ) : null}

          {!reviewDraft ? (
            <div className="mock-form-container">
              {entryType === 'full' ? (
                <FullMockForm busy={busy || !uid} onSubmit={handleFullSubmit} />
              ) : (
                <SectionalMockForm busy={busy || !uid} onSubmit={handleSectionalSubmit} />
              )}
            </div>
          ) : null}

          {error ? <p className="mock-form-error">{error}</p> : null}
        </div>

        {/* Right Column: History + Mode Toggle (30%) */}
        <div className="mock-sidebar">
          <div className="mock-entry-toggle">
            <button
              type="button"
              className={`mock-toggle-btn ${entryType === 'full' ? 'active' : ''}`}
              onClick={() => setEntryType('full')}
            >
              Full Mock
            </button>
            <button
              type="button"
              className={`mock-toggle-btn ${entryType === 'sectional' ? 'active' : ''}`}
              onClick={() => setEntryType('sectional')}
            >
              Sectional
            </button>
          </div>

          <div className="mock-history-section">
            <button
              type="button"
              className="mock-history-toggle"
              onClick={() => setShowHistory((current) => !current)}
            >
              <span>History ({mocks.length})</span>
              {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showHistory ? (
              <div className="mock-history-list">
                {mocks.length === 0 ? (
                  <p className="mock-history-empty">No mocks logged.</p>
                ) : (
                  mocks.map((mock) => (
                    <div key={mock.id} className="mock-history-item">
                      <div className="mock-history-main">
                        <span className="mock-history-type">{mock.type === 'full' ? 'Full' : 'Sectional'}</span>
                        <span className="mock-history-info">
                          {mock.type === 'full'
                            ? mock.exam.replace('SSC CGL ', '')
                            : mock.subject === 'Maths'
                              ? 'Quant'
                              : mock.subject === 'GS'
                                ? 'GA'
                                : mock.subject}
                        </span>
                      </div>

                      <div className="mock-history-stats">
                        <span>
                          {mock.overall.score}/{mock.overall.total}
                        </span>
                        <span>{mock.overall.attempted} att</span>
                        <span>{mock.overall.accuracy}% acc</span>
                        <span>{mock.overall.time}m</span>
                      </div>

                      <div className="mock-history-meta">
                        <span className="mock-history-date">
                          {toMillis(mock.createdAt)
                            ? new Date(toMillis(mock.createdAt)).toLocaleDateString()
                            : '-'}
                        </span>
                        <button
                          type="button"
                          className="mock-history-delete"
                          onClick={() => uid && void deleteMock(uid, mock.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
