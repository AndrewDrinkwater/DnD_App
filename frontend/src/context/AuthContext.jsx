import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { login as authenticate } from '../services/auth.js'

const AuthContext = createContext(null)
const STORAGE_KEY = 'dnd-shared-space:user'

const readStoredSession = () => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)

    if (!parsed) return null

    if (parsed.user || parsed.token) {
      return parsed
    }

    return { user: parsed, token: null }
  } catch (error) {
    console.warn('Failed to parse stored session', error)
    return null
  }
}

const writeStoredSession = (session) => {
  if (typeof window === 'undefined') return

  try {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.warn('Failed to persist session', error)
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession())

  useEffect(() => {
    writeStoredSession(session)
  }, [session])

  const login = useCallback(async (credentials) => {
    const authenticatedSession = await authenticate(credentials)
    setSession(authenticatedSession)
    return authenticatedSession
  }, [])

  const logout = useCallback(() => {
    setSession(null)
  }, [])

  const value = useMemo(
    () => ({
      currentUser: session?.user ?? null,
      token: session?.token ?? null,
      login,
      logout,
    }),
    [session, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
