import { Fragment, forwardRef, useEffect, useMemo, useRef, useState } from 'react'

const classNames = (...values) => values.filter(Boolean).join(' ')

const formatCapability = (value) =>
  value
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')

const describeStatusClass = (status) => {
  const normalized = (status || '').toLowerCase()
  if (normalized.includes('active')) return 'status-active'
  if (normalized.includes('invite')) return 'status-invited'
  if (normalized.includes('suspend')) return 'status-suspended'
  return ''
}

const Header = forwardRef(function Header(
  {
    brand,
    onNavigateHome,
    onNavigateProfile,
    campaignOptions = [],
    selectedCampaignId = '',
    onSelectCampaign,
    campaignPlaceholder = 'Choose campaign',
    showCampaignSelector = true,
    disableCampaignSelector = false,
    characterOptions = [],
    selectedCharacterId = '',
    onSelectCharacter,
    characterPlaceholder = 'Choose character',
    showCharacterSelector = true,
    disableCharacterSelector = false,
    currentUser = {},
    capabilityBadges = [],
    onLogout,
    isWorldBuilder = false
  },
  ref
) {
  const [menuOpen, setMenuOpen] = useState(false)
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)

  const safeUser = useMemo(
    () => ({
      name: 'Guest adventurer',
      initials: 'AD',
      title: 'Adventurer',
      email: '—',
      status: 'Guest',
      roleNames: [],
      preferences: {},
      isAuthenticated: false,
      ...currentUser
    }),
    [currentUser]
  )

  const displayCampaignSelector =
    showCampaignSelector && (campaignOptions.length > 0 || selectedCampaignId)
  const displayCharacterSelector =
    showCharacterSelector && (characterOptions.length > 0 || selectedCharacterId)

  useEffect(() => {
    if (!menuOpen) return

    const handlePointerDown = (event) => {
      if (!dropdownRef.current || !triggerRef.current) return
      if (
        dropdownRef.current.contains(event.target) ||
        triggerRef.current.contains(event.target)
      ) {
        return
      }
      setMenuOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev)
  }

  const handleNavigateProfile = () => {
    setMenuOpen(false)
    onNavigateProfile?.()
  }

  const handleLogout = () => {
    setMenuOpen(false)
    onLogout?.()
  }

  const statusClass = describeStatusClass(safeUser.status)

  return (
    <header ref={ref} className="app-header">
      <div className="header-bar">
        <div className="brand-identity">
          <button
            type="button"
            className="brand-home-link"
            onClick={onNavigateHome}
          >
            <span className="brand-logo" aria-hidden="true">
              <span>{brand?.initials ?? 'DD'}</span>
            </span>
            <span className="brand-copy">
              <span className="brand-title">{brand?.title ?? 'D&D Shared Space'}</span>
              {brand?.subtitle ? (
                <span className="brand-subtitle">{brand.subtitle}</span>
              ) : null}
            </span>
          </button>
        </div>

        <div className="header-actions">
          {(displayCampaignSelector || displayCharacterSelector) && (
            <div className="context-switchers">
              {displayCampaignSelector && (
                <label className="context-select">
                  <span>Campaign</span>
                  <select
                    value={selectedCampaignId ?? ''}
                    onChange={(event) => onSelectCampaign?.(event.target.value)}
                    disabled={disableCampaignSelector || campaignOptions.length === 0}
                  >
                    <option value="">{campaignPlaceholder}</option>
                    {campaignOptions.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {displayCharacterSelector && (
                <label className="context-select">
                  <span>Character</span>
                  <select
                    value={selectedCharacterId ?? ''}
                    onChange={(event) => onSelectCharacter?.(event.target.value)}
                    disabled={
                      disableCharacterSelector || characterOptions.length === 0
                    }
                  >
                    <option value="">{characterPlaceholder}</option>
                    {characterOptions.map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          <div className="current-user-menu">
            <button
              type="button"
              className="current-user-button"
              onClick={toggleMenu}
              ref={triggerRef}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <span className="user-avatar" aria-hidden="true">
                {safeUser.initials}
              </span>
              <span className="user-meta">
                <span className="user-name">{safeUser.name}</span>
                <span className="user-role">
                  {isWorldBuilder ? 'Worldbuilder access' : safeUser.title}
                </span>
              </span>
            </button>

            {menuOpen && (
              <div className="profile-dropdown" ref={dropdownRef} role="menu">
                <div className="profile-overview">
                  <span className="profile-overview-name">{safeUser.name}</span>
                  <span className="profile-overview-role">{safeUser.title}</span>
                  {safeUser.email && safeUser.email !== '—' ? (
                    <span className="profile-overview-email">{safeUser.email}</span>
                  ) : null}
                  <span className="profile-overview-status">
                    <span
                      className={classNames('status-badge', statusClass)}
                    >
                      {safeUser.status}
                    </span>
                  </span>
                </div>

                {capabilityBadges.length > 0 && (
                  <div className="profile-overview">
                    <span className="profile-overview-title">
                      Platform capabilities
                    </span>
                    <ul className="profile-role-list">
                      {capabilityBadges.map((capability) => (
                        <li key={capability}>{formatCapability(capability)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {safeUser.roleNames && safeUser.roleNames.length > 0 && (
                  <div className="profile-overview">
                    <span className="profile-overview-title">Campaign roles</span>
                    <ul className="profile-role-list">
                      {safeUser.roleNames.map((role) => (
                        <li key={role}>{role}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {safeUser.preferences && Object.keys(safeUser.preferences).length > 0 && (
                  <div className="profile-overview">
                    <span className="profile-overview-title">Preferences</span>
                    <dl className="profile-preferences">
                      {Object.entries(safeUser.preferences).map(([key, value]) => (
                        <Fragment key={key}>
                          <dt>{key}</dt>
                          <dd>{value}</dd>
                        </Fragment>
                      ))}
                    </dl>
                  </div>
                )}

                <div className="profile-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={handleNavigateProfile}
                  >
                    View profile
                  </button>
                  {safeUser.isAuthenticated && (
                    <button
                      type="button"
                      className="primary"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
})

export default Header
