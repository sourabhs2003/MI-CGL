import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { FullMockForm } from '../components/FullMockForm'
import { SectionalMockForm } from '../components/SectionalMockForm'
import { useAuth } from '../context/AuthContext'
import { useMocks } from '../hooks/useFirestoreData'
import { toMillis } from '../lib/firestoreTime'
import { addFullMock, addSectionalMock, deleteMock } from '../services/mocks'

export function MocksPage() {
  const { user } = useAuth()
  const uid = user?.uid
  const mocks = useMocks(uid)
  const [entryType, setEntryType] = useState<'full' | 'sectional'>('full')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)

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
          <div className="mock-form-container">
            {entryType === 'full' ? (
              <FullMockForm busy={busy || !uid} onSubmit={handleFullSubmit} />
            ) : (
              <SectionalMockForm busy={busy || !uid} onSubmit={handleSectionalSubmit} />
            )}
          </div>

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
