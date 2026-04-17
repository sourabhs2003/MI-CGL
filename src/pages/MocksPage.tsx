import { useState } from 'react'
import { Link } from 'react-router-dom'
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
    <main className="tasks-stack">
      <header className="page-head">
        <p className="eyebrow">Mocks</p>
        <div className="page-head-row">
          <h1>Manual Mock Entry</h1>
          <Link to="/mocks/analysis" className="btn ghost sm">
            Analysis
          </Link>
        </div>
      </header>

      <section className="card">
        <div className="card-head">
          <h2>Entry</h2>
        </div>

        <div className="segmented-toggle">
          <button
            type="button"
            className={entryType === 'full' ? 'btn primary' : 'btn ghost'}
            onClick={() => setEntryType('full')}
          >
            Full Mock
          </button>
          <button
            type="button"
            className={entryType === 'sectional' ? 'btn primary' : 'btn ghost'}
            onClick={() => setEntryType('sectional')}
          >
            Sectional
          </button>
        </div>

        <div className="form-divider" />

        {entryType === 'full' ? (
          <FullMockForm busy={busy || !uid} onSubmit={handleFullSubmit} />
        ) : (
          <SectionalMockForm busy={busy || !uid} onSubmit={handleSectionalSubmit} />
        )}

        {error ? <p className="form-error">{error}</p> : null}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>History</h2>
        </div>

        {mocks.length === 0 ? (
          <p className="muted">No mocks logged.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Tier / Section</th>
                  <th>Score</th>
                  <th>Attempted</th>
                  <th>Accuracy</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mocks.map((mock) => (
                  <tr key={mock.id}>
                    <td>{toMillis(mock.createdAt) ? new Date(toMillis(mock.createdAt)).toLocaleString() : '-'}</td>
                    <td>{mock.type === 'full' ? 'Full' : 'Sectional'}</td>
                    <td>{mock.type === 'full' ? mock.exam.replace('SSC CGL ', '') : mock.subject === 'Maths' ? 'Quant' : mock.subject === 'GS' ? 'GA' : mock.subject}</td>
                    <td>{mock.overall.score}/{mock.overall.total}</td>
                    <td>{mock.overall.attempted}</td>
                    <td>{mock.overall.accuracy}%</td>
                    <td>{mock.overall.time}m</td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => uid && void deleteMock(uid, mock.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
