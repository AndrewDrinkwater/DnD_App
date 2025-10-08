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

  const [campaigns, setCampaigns] = useState([])
  const [activeCampaignId, setActiveCampaignId] = useState(null)
  const [characters, setCharacters] = useState([])
  const [activeCharacterId, setActiveCharacterId] = useState(null)

  const loadWorlds = useCallback(async ({ signal } = {}) => {
    if (!token) {
      setWorlds([])
      setActiveWorldId(null)
      setWorldsError(null)
      setWorldsLoading(false)
      setCampaigns([])
      setActiveCampaignId(null)
      setCharacters([])
      setActiveCharacterId(null)
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
      setCampaigns([])
      setActiveCampaignId(null)
      setCharacters([])
      setActiveCharacterId(null)
    } finally {
      if (!signal?.aborted) {
        setWorldsLoading(false)
      }
    }
  }, [api, token])

  const loadCampaigns = useCallback(
    async (worldId, { signal } = {}) => {
      if (!worldId) {
        setCampaigns([])
        setActiveCampaignId(null)
        setCharacters([])
        setActiveCharacterId(null)
        return
      }

      try {
        const data = await api.get(`/worlds/${worldId}/campaigns`, { signal })
        if (signal?.aborted) return

        const list = Array.isArray(data) ? data : []
        setCampaigns(list)
        setActiveCampaignId((prev) => {
          if (prev && list.some((campaign) => campaign.id === prev)) {
            return prev
          }
          return list[0]?.id ?? null
        })
      } catch (error) {
        if (signal?.aborted) return
        console.error('Failed to load campaigns', error)
        setCampaigns([])
        setActiveCampaignId(null)
        setCharacters([])
        setActiveCharacterId(null)
      }
    },
    [api],
  )

  const loadCharacters = useCallback(
    async (campaignId, { signal } = {}) => {
      if (!campaignId) {
        setCharacters([])
        setActiveCharacterId(null)
        return
      }

      try {
        const data = await api.get(`/campaigns/${campaignId}/characters`, { signal })
        if (signal?.aborted) return

        const list = Array.isArray(data) ? data : []
        setCharacters(list)
        setActiveCharacterId((prev) => {
          if (prev && list.some((character) => character.id === prev)) {
            return prev
          }
          return list[0]?.id ?? null
        })
      } catch (error) {
        if (signal?.aborted) return
        console.error('Failed to load characters', error)
        setCharacters([])
        setActiveCharacterId(null)
      }
    },
    [api],
  )

  useEffect(() => {
    const controller = new AbortController()

    loadWorlds({ signal: controller.signal })

    return () => {
      controller.abort()
    }
  }, [loadWorlds])

  useEffect(() => {
    if (!activeWorldId) {
      setCampaigns([])
      setActiveCampaignId(null)
      setCharacters([])
      setActiveCharacterId(null)
      return
    }

    const controller = new AbortController()
    loadCampaigns(activeWorldId, { signal: controller.signal })

    return () => controller.abort()
  }, [activeWorldId, loadCampaigns])

  useEffect(() => {
    if (!activeCampaignId) {
      setCharacters([])
      setActiveCharacterId(null)
      return
    }

    const controller = new AbortController()
    loadCharacters(activeCampaignId, { signal: controller.signal })

    return () => controller.abort()
  }, [activeCampaignId, loadCharacters])

  const value = useMemo(
    () => ({
      worlds,
      worldsLoading,
      worldsError,
      activeWorldId,
      setActiveWorldId,
      refreshWorlds: loadWorlds,
      campaigns,
      activeCampaignId,
      setActiveCampaignId,
      characters,
      activeCharacterId,
      setActiveCharacterId,
    }),
    [
      worlds,
      worldsLoading,
      worldsError,
      activeWorldId,
      loadWorlds,
      campaigns,
      activeCampaignId,
      characters,
      activeCharacterId,
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
