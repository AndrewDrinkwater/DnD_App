import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAVIGATION_ITEMS = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/worlds', label: 'Worlds', icon: '🌍' },
  { path: '/campaigns', label: 'Campaigns', icon: '🗺️' },
  { path: '/characters', label: 'Characters', icon: '🧙' },
  { path: '/npcs', label: 'NPCs', icon: '🧝' },
  { path: '/locations', label: 'Locations', icon: '📍' },
  { path: '/organisations', label: 'Organisations', icon: '🏛️' },
  { path: '/races', label: 'Races', icon: '🐉' },
]

function classNames(...values) {
  return values.filter(Boolean).join(' ')
}

export default function Sidebar({
  isPinned,
  isCollapsed,
  isCompactLayout,
  isMobileOpen,
  onPinToggle,
  onCollapseToggle,
  onRequestClose,
}) {
  const { currentUser } = useAuth()
  const [isHovering, setIsHovering] = useState(false)

  const links = [...NAVIGATION_ITEMS]
  if (currentUser?.roleNames?.includes('System Administrator')) {
    links.push({ path: '/admin', label: 'Admin', icon: '🛡️' })
  }

  const shouldCollapse = isCollapsed && !(isHovering && !isPinned)
  const sidebarClassName = classNames(
    'shell-sidebar',
    !isPinned && 'sidebar-floating',
    shouldCollapse && 'sidebar-collapsed',
    isMobileOpen && 'sidebar-mobile-open',
  )

  const handleMouseEnter = () => {
    if (!isPinned && isCollapsed) {
      setIsHovering(true)
    }
  }

  const handleMouseLeave = () => {
    if (!isPinned && isCollapsed) {
      setIsHovering(false)
    }
  }

  const handleLinkClick = () => {
    if (isCompactLayout) {
      onRequestClose?.()
    }
  }

  const sidebarLabel = isPinned ? 'Sidebar pinned' : 'Sidebar floating'
  const collapseButtonLabel = shouldCollapse ? 'Expand navigation' : 'Collapse navigation'

  return (
    <>
      <aside
        className={sidebarClassName}
        aria-label="Primary"
        data-sidebar-state={sidebarLabel}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="sidebar-brand">
          <span className="sidebar-logo" aria-hidden>
            DA
          </span>
          <div className="sidebar-copy">
            <span className="sidebar-title">Dungeons &amp; Data</span>
            <small>Campaign control center</small>
          </div>
          {!isCompactLayout && (
            <button
              type="button"
              className={classNames('icon-button', 'sidebar-pin-toggle', isPinned && 'active')}
              onClick={onPinToggle}
              aria-pressed={isPinned}
              aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
            >
              <span aria-hidden>{isPinned ? '📌' : '📍'}</span>
            </button>
          )}
          {isCompactLayout && (
            <button
              type="button"
              className="icon-button sidebar-close"
              onClick={onRequestClose}
              aria-label="Close navigation"
            >
              <span aria-hidden>✕</span>
            </button>
          )}
        </div>

        {!isCompactLayout && (
          <button
            type="button"
            className={classNames('sidebar-pin-inline', shouldCollapse && 'active')}
            onClick={onCollapseToggle}
          >
            <span className="sidebar-pin-icon" aria-hidden>
              {shouldCollapse ? '⤢' : '⤡'}
            </span>
            <span className="sidebar-pin-label">{collapseButtonLabel}</span>
          </button>
        )}

        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                classNames('sidebar-link', isActive && 'active')
              }
              onClick={handleLinkClick}
            >
              <span className="sidebar-icon" aria-hidden>
                {link.icon || link.label.charAt(0)}
              </span>
              <span className="sidebar-label">{link.label}</span>
            </NavLink>
          ))}
          {links.length === 0 && <p className="sidebar-empty">No modules available</p>}
        </nav>
      </aside>
      {isCompactLayout && isMobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={onRequestClose}
        />
      )}
    </>
  )
}
