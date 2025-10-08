import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'

export default function Header() {
  const { currentUser, logout } = useAuth()
  const { campaigns = [], characters = [] } = useData()

  const displayName = currentUser?.name || currentUser?.username || 'Unknown'
  const title = currentUser?.roleNames?.[0] || 'Adventurer'
  const status = currentUser?.status || 'Active'
  const dataSummary = `${campaigns.length} campaigns · ${characters.length} characters`

  return (
    <header className="app-header flex items-center justify-between p-2 bg-gray-900 text-white">
      <div className="flex items-center space-x-2">
        <h1 className="text-lg font-bold cursor-pointer">DnD App</h1>
        <span className="text-sm opacity-75" title={dataSummary}>
          {title} ({status})
        </span>
      </div>
      <div className="flex items-center space-x-3">
        <span>{displayName}</span>
        <button
          onClick={logout}
          className="text-sm px-2 py-1 bg-red-700 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
