import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useApiClient } from '../utils/apiClient'
import { useAuth } from './AuthContext'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const api = useApiClient()
  const { token } = useAuth()

  const [worlds, setWorlds] = useState([])
  const [worldsLoading, setWorldsLoading] = useState(false)
  const [worldsError, setWorldsError] = useState(null)
  const [activeWorldId, setActiveWorldId] = useState(null)

  const [campaigns] = useState([])
  const [characters] = useState([])

  const loadWorlds = useCallback(async ({ signal } = {}) => {
    if (!token) {
      setWorlds([])
      setActiveWorldId(null)
      setWorldsError(null)
      setWorldsLoading(false)
      return
    }

    setWorldsLoading(true)
    try {
      const data = await api.get('/worlds', { signal })
      const list = Array.isArray(data) ? data : []
      if (signal?.aborted) return
      setWorlds(list)
      setWorldsError(null)
      setActiveWorldId((prev) => {
        if (prev && list.some((world) => world.id === prev)) {
          return prev
        }
        return list[0]?.id ?? null
      })
    } catch (error) {
      if (signal?.aborted) return
      console.error('Failed to load worlds', error)
      setWorlds([])
      setWorldsError(error)
      setActiveWorldId(null)
    } finally {
      if (!signal?.aborted) {
        setWorldsLoading(false)
      }
    }
  }, [api, token])

  useEffect(() => {
    const controller = new AbortController()

    loadWorlds({ signal: controller.signal })

    return () => {
      controller.abort()
    }
  }, [loadWorlds])

  const value = useMemo(
    () => ({
      worlds,
      worldsLoading,
      worldsError,
      activeWorldId,
      setActiveWorldId,
      refreshWorlds: loadWorlds,
      campaigns,
      characters,
    }),
    [
      worlds,
      worldsLoading,
      worldsError,
      activeWorldId,
      loadWorlds,
      campaigns,
      characters,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
