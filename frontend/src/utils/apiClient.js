import { useCallback, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

const normalizeBaseUrl = (value) => {
  if (!value) return ''
  return value.endsWith('/') ? value.slice(0, -1) : value
}

const API_BASE_URL =
  normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL) || 'http://localhost:3000/api'

const resolveUrl = (path) => {
  if (!path) return API_BASE_URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

const applyContextHeaders = (headers, context = {}) => {
  if (!context || typeof context !== 'object') return
  if (context.worldId) headers.set('X-Active-World', context.worldId)
  if (context.campaignId) headers.set('X-Active-Campaign', context.campaignId)
  if (context.characterId) headers.set('X-Active-Character', context.characterId)
}

const parsePayload = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return null
  }

  try {
    return await response.json()
  } catch (error) {
    console.warn('Failed to parse response body', error)
    return null
  }
}

export function useApiClient() {
  const { token, logout } = useAuth()

  const request = useCallback(
    async (path, options = {}) => {
      const {
        method = 'GET',
        headers: providedHeaders,
        body,
        context,
        ...rest
      } = options

      const url = resolveUrl(path)
      const headers = new Headers(providedHeaders || {})

      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      applyContextHeaders(headers, context)

      const response = await fetch(url, {
        method,
        body,
        headers,
        ...rest,
      })

      const payload = await parsePayload(response)

      if (response.status === 401 && token) {
        logout?.()
      }

      if (!response.ok || payload?.success === false) {
        const error = new Error(
          payload?.message || `Request failed with status ${response.status}`,
        )
        error.status = response.status
        error.payload = payload
        throw error
      }

      if (payload && typeof payload === 'object') {
        if ('data' in payload) {
          return payload.data
        }
        return payload
      }

      return payload
    },
    [token, logout],
  )

  return useMemo(
    () => ({
      request,
      get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
    }),
    [request],
  )
}

export { API_BASE_URL }
