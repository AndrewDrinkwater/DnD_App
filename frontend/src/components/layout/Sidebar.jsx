import { NavLink } from 'react-router-dom'

const classNames = (...values) => values.filter(Boolean).join(' ')

const moduleIcons = {
  world: '🌍',
  campaigns: '🗺️',
  characters: '🧙',
  npcs: '🧩',
  locations: '📍',
  organisations: '🏰',
  races: '🧬',
  'platform-admin': '🛡️',
}

export default function Sidebar({ modules = [], brand }) {
  return (
    <aside className="shell-sidebar" aria-label="Primary navigation">
      <div className="sidebar-brand">
        <div className="sidebar-logo" aria-hidden="true">
          <span>{brand?.initials ?? 'DD'}</span>
        </div>
        <div className="sidebar-copy">
          <span className="sidebar-title">{brand?.title ?? 'D&D Shared Space'}</span>
          {brand?.subtitle ? <small>{brand.subtitle}</small> : null}
        </div>
      </div>

      <nav className="sidebar-nav">
        {modules.length === 0 ? (
          <p className="sidebar-empty">
            You do not have access to any workspace modules yet.
          </p>
        ) : (
          modules.map((module) => {
            const icon = moduleIcons[module.id] ?? '•'

            return (
              <NavLink
                key={module.id}
                to={module.path}
                end={module.exact}
                className={({ isActive }) => classNames('sidebar-link', isActive && 'active')}
              >
                <span className="sidebar-icon" aria-hidden="true">
                  {icon}
                </span>
                <span className="sidebar-label">{module.label}</span>
              </NavLink>
            )
          })
        )}
      </nav>
    </aside>
  )
}
