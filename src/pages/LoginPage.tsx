import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ensureUserProfile } from '../services/userProfile'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const nextUser = login(username.trim(), password)
      if (!nextUser) {
        setErr('Invalid credentials')
        return
      }

      try {
        await ensureUserProfile(nextUser.uid)
      } catch {
        /* Firestore may be blocked until rules are deployed */
      }

      navigate('/', { replace: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <p className="eyebrow">MI CGL </p>
        <h1>Command Center</h1>
        <p className="card-sub">
          Sign in with your assigned username and password. Data syncs to Firestore under your user id.
        </p>

        <form onSubmit={submit} className="login-form">
          <label className="field full">
            <span>Username</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="field full">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {err ? <p className="form-error">{err}</p> : null}

          <button type="submit" className="btn primary full-width" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
