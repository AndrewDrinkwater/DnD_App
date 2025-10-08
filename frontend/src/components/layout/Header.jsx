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
  const { campaigns = [], characters = [] } = useData()
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
            <div className="context-select">
              <span>Campaigns</span>
              <strong>{campaigns.length}</strong>
            </div>
            <div className="context-select">
              <span>Characters</span>
              <strong>{characters.length}</strong>
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
