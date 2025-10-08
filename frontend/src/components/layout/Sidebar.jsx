const classNames = (...values) => values.filter(Boolean).join(' ')

const moduleIcons = {
  world: '🌍',
  campaigns: '🗺️',
  characters: '🧙',
  npcs: '🧩',
  locations: '📍',
  organisations: '🏰',
  races: '🧬',
  'platform-admin': '🛡️'
}

export default function Sidebar({
  modules = [],
  activeModuleId = null,
  onSelectModule,
  brand
}) {
  const handleSelect = (path) => {
    if (!path) return
    onSelectModule?.(path)
  }

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
            const isActive = module.id === activeModuleId
            return (
              <button
                key={module.id}
                type="button"
                className={classNames('sidebar-link', isActive && 'active')}
                onClick={() => handleSelect(module.path)}
              >
                <span className="sidebar-icon" aria-hidden="true">
                  {icon}
                </span>
                <span className="sidebar-label">{module.label}</span>
              </button>
            )
          })
        )}
      </nav>
    </aside>
  )
}
