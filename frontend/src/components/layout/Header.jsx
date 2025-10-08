import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

export default function Header() {
  const { currentUser, logout } = useAuth();
  const { campaigns, characters } = useData();

  return (
    <header className="app-header flex items-center justify-between p-2 bg-gray-900 text-white">
      <div className="flex items-center space-x-2">
        <h1 className="text-lg font-bold cursor-pointer">DnD App</h1>

        {/* Campaign Selector */}
        <select className="bg-gray-800 border border-gray-700 rounded px-2 py-1">
          <option>Choose Campaign</option>
          {campaigns.map((c) => (
            <option key={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Character Selector */}
        <select className="bg-gray-800 border border-gray-700 rounded px-2 py-1">
          <option>Choose Character</option>
          {characters.map((ch) => (
            <option key={ch.id}>{ch.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-3">
        <span>{currentUser ? currentUser.username : 'Guest'}</span>
        {currentUser && (
          <button
            onClick={logout}
            className="text-sm px-2 py-1 bg-red-700 rounded hover:bg-red-600"
          >
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
