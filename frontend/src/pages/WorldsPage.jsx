import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function WorldsPage() {
  const { currentUser } = useAuth()
  const [worlds, setWorlds] = useState([])

  useEffect(() => {
    async function loadWorlds() {
      try {
        const res = await fetch('/api/worlds')
        const data = await res.json()
        if (data.success) setWorlds(data.data)
      } catch (err) {
        console.error('Failed to load worlds', err)
      }
    }
    loadWorlds()
  }, [])

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
