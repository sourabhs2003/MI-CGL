import { useAuth } from '../context/AuthContext'
import { useMocks } from '../hooks/useFirestoreData'
import { toMillis } from '../lib/firestoreTime'
import { addSectionalMock, addFullMock, deleteMock } from '../services/mocks'
import { SectionalMockForm } from '../components/SectionalMockForm'
import { FullMockForm } from '../components/FullMockForm'
import type { MockKind, Subject } from '../types'

export function MocksPage() {
  const { user } = useAuth()
  const uid = user?.uid
  const mocks = useMocks(uid)

  async function handleSectionalSubmit(data: {
    subject: Subject
    score: number
    accuracyPct: number
    durationMin: number
  }) {
    if (!uid) return
    await addSectionalMock(uid, {
      subject: data.subject,
      score: data.score,
      maxScore: 50,
      accuracyPct: data.accuracyPct,
      durationMin: data.durationMin,
    })
  }

  async function handleFullMockSubmit(data: {
    kind: MockKind
    score: number
    accuracyPct: number
    durationMin: number
  }) {
    if (!uid) return
    await addFullMock(uid, {
      kind: data.kind,
      subject: 'Mixed',
      score: data.score,
      maxScore: 200,
      accuracyPct: data.accuracyPct,
      durationMin: data.durationMin,
    })
  }

  return (
    <>
      <header className="page-head">
        <p className="eyebrow">Mocks</p>
        <h1>Mock test tracker</h1>
        <p className="lede">
          Track sectional and full mock tests with automatic study time bonuses
        </p>
      </header>

      <div className="form-divider" />

      <SectionalMockForm onSubmit={handleSectionalSubmit} />

      <div className="form-divider" />

      <FullMockForm onSubmit={handleFullMockSubmit} />

      <div className="form-divider" />

      <section className="card">
        <h2>History</h2>
        {mocks.length === 0 ? (
          <p className="muted">No mocks logged.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Acc%</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mocks.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {toMillis(m.createdAt)
                        ? new Date(toMillis(m.createdAt)).toLocaleString()
                        : '—'}
                    </td>
                    <td>
                      {m.kind === 'sectional'
                        ? 'Sectional'
                        : m.kind === 'full_t1'
                          ? 'Full T1'
                          : 'Full T2'}
                    </td>
                    <td>{m.subject}</td>
                    <td>
                      {m.score}/{m.maxScore}
                    </td>
                    <td>{m.accuracyPct}%</td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => uid && void deleteMock(uid, m.id)}
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
    </>
  )
}
