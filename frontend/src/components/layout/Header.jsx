import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'

function getInitials(name) {
  if (!name) return 'DA'
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
  if (parts.length === 0) return 'DA'
  return parts
    .map((part) => part[0].toUpperCase())
    .join('')
}

export default function Header({
  isCompactLayout,
  isSidebarCollapsed,
  onRequestMobileMenu,
  onRequestCollapseToggle,
}) {
  const { currentUser, logout } = useAuth()
  const {
    worlds = [],
    activeWorldId,
    setActiveWorldId,
    campaigns = [],
    activeCampaignId,
    setActiveCampaignId,
    characters = [],
    activeCharacterId,
    setActiveCharacterId,
  } = useData()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const menuRef = useRef(null)

  const displayName = currentUser?.name || currentUser?.username || 'Unknown Adventurer'
  const title = currentUser?.roleNames?.[0] || 'Adventurer'
  const status = currentUser?.status || 'Active'
  const dataSummary = useMemo(
    () => `${campaigns.length} campaigns · ${characters.length} characters`,
    [campaigns.length, characters.length],
  )
  const initials = getInitials(displayName)

  useEffect(() => {
    if (!isProfileOpen) return
    const handleClickOutside = (event) => {
      if (!menuRef.current || menuRef.current.contains(event.target)) return
      setIsProfileOpen(false)
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isProfileOpen])

  const handleLogout = () => {
    setIsProfileOpen(false)
    logout()
  }

  const collapseLabel = isSidebarCollapsed ? 'Expand menu' : 'Collapse menu'
  const collapseIcon = isSidebarCollapsed ? '⤢' : '⤡'
  const contextSelectStyle = {
    backgroundColor: '#1f2937',
    color: '#f8fafc',
    borderRadius: '0.65rem',
    border: '1px solid rgba(148, 163, 184, 0.45)',
    padding: '0.35rem 0.75rem',
  }

  return (
    <header className="app-header">
      <div className="header-bar">
        <div className="brand-identity">
          {isCompactLayout && (
            <button
              type="button"
              className="icon-button"
              onClick={onRequestMobileMenu}
              aria-label="Open navigation"
            >
              <span aria-hidden>☰</span>
            </button>
          )}
          <Link to="/" className="brand-home-link">
            <span className="brand-logo">
              <span aria-hidden>DA</span>
            </span>
            <span className="brand-copy">
              <span className="brand-title">DnD Atlas</span>
              <span className="brand-subtitle">Campaign control center</span>
            </span>
          </Link>
        </div>

        <div className="header-actions">
          {!isCompactLayout && (
            <button
              type="button"
              className={`sidebar-pin-inline${isSidebarCollapsed ? '' : ' active'}`}
              onClick={onRequestCollapseToggle}
            >
              <span className="sidebar-pin-icon" aria-hidden>
                {collapseIcon}
              </span>
              <span className="sidebar-pin-label">{collapseLabel}</span>
            </button>
          )}

          <div className="context-switchers" aria-live="polite">
            {worlds.length > 0 && (
              <select
                value={activeWorldId || ''}
                onChange={(event) => setActiveWorldId(event.target.value || null)}
                className="bg-gray-700 text-white rounded p-1"
                style={contextSelectStyle}
                aria-label="Select world context"
              >
                <option value="">Select World</option>
                {worlds.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            )}
            <div className="flex space-x-2 items-center">
              {campaigns.length > 0 && (
                <select
                  value={activeCampaignId || ''}
                  onChange={(e) => setActiveCampaignId(e.target.value || null)}
                  className="bg-gray-700 text-white rounded p-1"
                  style={contextSelectStyle}
                  aria-label="Select campaign context"
                >
                  <option value="">Select Campaign</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {characters.length > 0 && (
                <select
                  value={activeCharacterId || ''}
                  onChange={(e) => setActiveCharacterId(e.target.value || null)}
                  className="bg-gray-700 text-white rounded p-1"
                  style={contextSelectStyle}
                  aria-label="Select character context"
                >
                  <option value="">Select Character</option>
                  {characters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="current-user-menu" ref={menuRef}>
            <button
              type="button"
              className="current-user-button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
            >
              <span className="user-avatar" aria-hidden>
                {initials}
              </span>
              <span className="user-meta">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{title}</span>
              </span>
            </button>

            {isProfileOpen && (
              <div className="profile-dropdown" role="menu">
                <div className="profile-overview">
                  <span className="profile-overview-name">{displayName}</span>
                  <span className="profile-overview-role">{title}</span>
                  {currentUser?.email && (
                    <span className="profile-overview-email">{currentUser.email}</span>
                  )}
                  <div className="profile-overview-status">
                    <span className="status-pill">{status}</span>
                    <span>{dataSummary}</span>
                  </div>
                </div>
                <div className="profile-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="primary destructive"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
