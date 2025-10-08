import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!username) {
      setError('Please enter a username')
      return
    }

    const user = { username, roles: ['Adventurer'] }
    login(user)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 rounded-lg p-8 w-80 flex flex-col space-y-4 shadow-lg"
      >
        <h2 className="text-xl font-bold text-center">Sign in to D&amp;D Shared Space</h2>
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Username"
          className="p-2 rounded bg-gray-700 border border-gray-600"
        />
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          className="p-2 rounded bg-gray-700 border border-gray-600"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 rounded py-2 font-semibold"
        >
          Login
        </button>
      </form>
    </div>
  )
}
