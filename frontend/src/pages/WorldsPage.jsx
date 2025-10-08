import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api').replace(/\/$/, '')

export default function WorldsPage() {
  const { currentUser, token } = useAuth()
  const [worlds, setWorlds] = useState([])
  const apiUrl = useMemo(() => `${API_BASE_URL}/worlds`, [])

  useEffect(() => {
    async function loadWorlds() {
      try {
        const res = await fetch(apiUrl, {
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        })
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`)
        }
        const data = await res.json()
        if (data.success) setWorlds(data.data)
      } catch (err) {
        console.error('Failed to load worlds', err)
      }
    }
    if (token) {
      loadWorlds()
    }
  }, [apiUrl, token])

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Worlds</h1>
      {worlds.length === 0 && <p>No worlds found.</p>}
      <ul>
        {worlds.map((w) => (
          <li key={w.id} className="border-b py-1">
            {w.name}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-gray-600">
        Logged in as: {currentUser?.name} ({currentUser?.roleNames?.join(', ')})
      </p>
    </div>
  )
}
