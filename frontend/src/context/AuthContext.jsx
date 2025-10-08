import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)
const STORAGE_KEY = 'dnd-shared-space:user'

const readStoredUser = () => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch (error) {
    console.warn('Failed to parse stored user', error)
    return null
  }
}

const writeStoredUser = (user) => {
  if (typeof window === 'undefined') return

  try {
    if (user) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch (error) {
    console.warn('Failed to persist user', error)
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => readStoredUser())

  useEffect(() => {
    writeStoredUser(currentUser)
  }, [currentUser])

  const login = useCallback((user) => {
    setCurrentUser(user)
  }, [])

  const logout = useCallback(() => {
    setCurrentUser(null)
  }, [])

  const value = useMemo(
    () => ({
      currentUser,
      login,
      logout,
    }),
    [currentUser, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
