import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getUser, login as loginWithCredentials, logout as clearSession, type SessionUser } from '../lib/auth'

type AuthCtx = {
  user: SessionUser | null
  /** Always false — session is read synchronously from localStorage. */
  loading: boolean
  login: (username: string, password: string) => SessionUser | null
  logout: () => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => getUser())

  const login = useCallback((username: string, password: string) => {
    const u = loginWithCredentials(username, password)
    if (u) setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading: false,
      login,
      logout,
    }),
    [user, login, logout],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
