import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const { isSystemAdmin } = useAuth();

  const links = [
    { path: '/', label: 'Home' },
    { path: '/worlds', label: 'Worlds' },
    { path: '/campaigns', label: 'Campaigns' },
    { path: '/characters', label: 'Characters' },
    { path: '/npcs', label: 'NPCs' },
    { path: '/locations', label: 'Locations' },
    { path: '/organisations', label: 'Organisations' },
    { path: '/races', label: 'Races' },
  ];

  if (isSystemAdmin) {
    links.push({ path: '/admin', label: 'Admin' });
  }

  return (
    <aside className="app-sidebar bg-gray-800 text-white w-56 p-3">
      <nav className="flex flex-col space-y-2">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className="hover:bg-gray-700 rounded px-2 py-1"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
