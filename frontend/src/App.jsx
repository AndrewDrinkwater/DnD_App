import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'dnd-platform-state'

const readStoredState = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch (error) {
    console.warn('Failed to read platform state from storage', error)
    return null
  }
}

const writeStoredState = (payload) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.warn('Failed to persist platform state', error)
  }
}

const normalizePath = (path) => {
  if (!path) return '/'
  const trimmed = path.trim()
  if (!trimmed) return '/'
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  const withoutTrailing = withLeading.replace(/\/+$/, '')
  return withoutTrailing === '' ? '/' : withoutTrailing
}

const pathMatches = (path, target) => {
  if (!path || !target) return false
  if (path === target) return true
  return path.startsWith(`${target}/`)
}

const getCampaignIdFromPath = (path) => {
  if (!pathMatches(path, '/campaigns')) return null
  const segments = path.split('/').filter(Boolean)
  return segments[1] || null
}

const seededRoles = [
  {
    id: 'role-system-admin',
    name: 'System Administrator',
    description: 'Full platform access and configuration rights.',
    createdAt: '2024-01-12T10:15:00Z',
    updatedAt: '2024-04-01T08:25:00Z'
  },
  {
    id: 'role-world-admin',
    name: 'World Admin',
    description: 'Curate the shared world, lore, and regions available to campaigns.',
    createdAt: '2024-01-14T11:00:00Z',
    updatedAt: '2024-03-28T16:12:00Z'
  },
  {
    id: 'role-dungeon-master',
    name: 'Dungeon Master',
    description: 'Owns the storytelling experience for a campaign.',
    createdAt: '2024-02-06T14:10:00Z',
    updatedAt: '2024-03-18T09:32:00Z'
  },
  {
    id: 'role-player',
    name: 'Player',
    description: 'Participates in assigned campaigns with scoped permissions.',
    createdAt: '2024-02-06T14:10:00Z',
    updatedAt: '2024-03-18T09:32:00Z'
  }
]

const seededUsers = [
  {
    id: 'user-aelar',
    displayName: 'Aelar Morningstar',
    email: 'aelar@example.com',
    username: 'aelar',
    password: 'Temp!123',
    status: 'Active',
    roles: ['role-system-admin', 'role-world-admin'],
    updatedAt: '2024-04-18T12:02:00Z'
  },
  {
    id: 'user-lyra',
    displayName: 'Lyra Willowstep',
    email: 'lyra@example.com',
    username: 'lyra',
    password: 'Welcome1',
    status: 'Invited',
    roles: ['role-player'],
    updatedAt: '2024-04-11T09:44:00Z'
  }
]

const seededCampaigns = [
  {
    id: 'campaign-tiamat',
    name: 'Rise of Tiamat',
    status: 'Planning',
    summary: 'High level threat from the Dragon Queen.',
    worldId: 'world-faerun',
    assignments: [
      { id: 'assign-1', userId: 'user-aelar', roleId: 'role-dungeon-master' },
      { id: 'assign-2', userId: 'user-lyra', roleId: 'role-player' }
    ],
    updatedAt: '2024-04-14T21:00:00Z'
  }
]

const seededWorlds = [
  {
    id: 'world-faerun',
    name: 'Forgotten Realms',
    tagline: 'A classic high fantasy setting packed with legends.',
    description:
      'The Forgotten Realms spans the continent of Faerûn, from the Spine of the World to the jungles of Chult. Adventurers uncover ancient ruins, broker uneasy alliances, and confront lurking threats from gods and monsters alike.',
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-04-05T18:42:00Z'
  }
]

const seededCharacters = [
  {
    id: 'character-lyra',
    name: 'Lyra Willowstep',
    ancestry: 'Lightfoot Halfling',
    className: 'College of Lore Bard',
    level: 7,
    ownerId: 'user-lyra',
    campaignId: 'campaign-tiamat',
    updatedAt: '2024-04-12T14:18:00Z'
  }
]

const accountProfiles = {
  'user-aelar': {
    fallbackName: 'Aelar Morningstar',
    email: 'aelar@example.com',
    title: 'System Administrator',
    capabilityRoles: ['system-admin'],
    preferences: {
      language: 'English (UK)',
      region: 'United Kingdom',
      timezone: 'Europe/London'
    }
  },
  'user-lyra': {
    fallbackName: 'Lyra Willowstep',
    email: 'lyra@example.com',
    title: 'Campaign Player',
    capabilityRoles: [],
    preferences: {
      language: 'Common',
      region: 'The Feywild',
      timezone: 'Faerûn Standard Time'
    }
  }
}

const modules = [
  {
    id: 'world',
    label: 'World',
    icon: '🌍',
    description: 'Curate worlds, lore, and locations that power your campaigns.',
    requiredRoleNames: ['World Admin', 'System Administrator'],
    path: '/worlds'
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: '📜',
    description: 'Coordinate the adventures you are part of and align your party context.',
    path: '/campaigns'
  },
  {
    id: 'characters',
    label: 'Characters',
    icon: '🧙',
    description: 'Manage your roster of heroes, sidekicks, and alter egos across worlds.',
    path: '/characters'
  },
  {
    id: 'platform-admin',
    label: 'Platform Admin',
    icon: '🛠️',
    description: 'Manage users, roles, and campaigns across the multiverse.',
    requiredCapability: 'canViewPlatformAdmin',
    path: '/admin'
  }
]

const sections = [
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles' },
  { id: 'campaigns', label: 'Campaigns' }
]

const capabilityMatrix = {
  'platform-admin': {
    'system-admin': ['view', 'manage-users', 'manage-roles', 'manage-campaigns']
  }
}

const newId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

const classNames = (...values) => values.filter(Boolean).join(' ')

const statusVariantFromStatus = (status) => {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'planning') return 'planning'
  if (normalized === 'active') return 'active'
  if (normalized === 'archived') return 'archived'
  if (normalized === 'completed') return 'archived'
  if (normalized === 'on hold') return 'neutral'
  return 'neutral'
}

const formatRelativeTime = (value) => {
  if (!value) return '—'
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return '—'
  }

  const now = Date.now()
  const diff = timestamp.getTime() - now
  const absoluteDiff = Math.abs(diff)

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (absoluteDiff > year) {
    const valueYears = Math.round(diff / year)
    return formatter.format(valueYears, 'year')
  }
  if (absoluteDiff > month) {
    const valueMonths = Math.round(diff / month)
    return formatter.format(valueMonths, 'month')
  }
  if (absoluteDiff > week) {
    const valueWeeks = Math.round(diff / week)
    return formatter.format(valueWeeks, 'week')
  }
  if (absoluteDiff > day) {
    const valueDays = Math.round(diff / day)
    return formatter.format(valueDays, 'day')
  }
  if (absoluteDiff > hour) {
    const valueHours = Math.round(diff / hour)
    return formatter.format(valueHours, 'hour')
  }
  const valueMinutes = Math.round(diff / minute)
  if (valueMinutes === 0) {
    return 'just now'
  }
  return formatter.format(valueMinutes, 'minute')
}

function Badge({ variant = 'neutral', children, className = '', ...props }) {
  const classes = classNames('badge', `badge-${variant}`, className)
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}

function Button({
  variant = 'primary',
  tone = 'default',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const classes = classNames('btn', `btn-${variant}`, tone === 'danger' && 'btn-danger', className)
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}

function IconButton({ label, children, className = '', ...props }) {
  const classes = classNames('btn', 'btn-icon', className)
  return (
    <button type="button" className={classes} aria-label={label} {...props}>
      {children}
    </button>
  )
}

function Card({ as: Component = 'div', className = '', children, ...props }) {
  return (
    <Component className={classNames('surface-card', className)} {...props}>
      {children}
    </Component>
  )
}

function App() {
  const storedState = useMemo(() => readStoredState(), [])
  const [session, setSession] = useState(() => {
    const savedSession =
      storedState && typeof storedState === 'object' && typeof storedState.session === 'object'
        ? storedState.session
        : null

    if (savedSession && typeof savedSession.authenticatedUserId === 'string') {
      return { authenticatedUserId: savedSession.authenticatedUserId }
    }

    return { authenticatedUserId: null }
  })
  const [activeSectionId, setActiveSectionId] = useState('users')
  const [currentPath, setCurrentPath] = useState(() => {
    if (typeof window === 'undefined') return '/'
    return normalizePath(window.location.pathname || '/')
  })
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  const currentPathRef = useRef(currentPath)

  const [roles, setRoles] = useState(() => (Array.isArray(storedState?.roles) ? storedState.roles : seededRoles))
  const [users, setUsers] = useState(() => (Array.isArray(storedState?.users) ? storedState.users : seededUsers))
  const [campaigns, setCampaigns] = useState(() =>
    Array.isArray(storedState?.campaigns) ? storedState.campaigns : seededCampaigns
  )
  const [worlds, setWorlds] = useState(() =>
    Array.isArray(storedState?.worlds) ? storedState.worlds : seededWorlds
  )
  const [characters, setCharacters] = useState(() =>
    Array.isArray(storedState?.characters) ? storedState.characters : seededCharacters
  )
  const [appContext, setAppContext] = useState(() => {
    if (storedState?.appContext && typeof storedState.appContext === 'object') {
      return {
        campaignId: storedState.appContext.campaignId || '',
        characterId: storedState.appContext.characterId || ''
      }
    }
    return { campaignId: '', characterId: '' }
  })
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    if (storedState?.ui && typeof storedState.ui === 'object') {
      const value = storedState.ui.sidebarPinned
      if (typeof value === 'boolean') return value
    }
    return true
  })
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [authError, setAuthError] = useState(null)
  const headerRef = useRef(null)
  const profileMenuRef = useRef(null)
  const authenticatedUserId = session?.authenticatedUserId ?? null

  useEffect(() => {
    currentPathRef.current = currentPath
  }, [currentPath])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname || '/'))
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigate = useCallback((nextPath, { replace = false } = {}) => {
    if (typeof window === 'undefined') return
    const normalized = normalizePath(nextPath)
    if (replace) {
      if (normalized === currentPathRef.current) {
        return
      }
      window.history.replaceState({}, '', normalized)
      setCurrentPath(normalized)
      return
    }
    if (normalized === currentPathRef.current) {
      return
    }
    window.history.pushState({}, '', normalized)
    setCurrentPath(normalized)
  }, [])

  useEffect(() => {
    if (!authenticatedUserId) {
      navigate('/', { replace: true })
    }
  }, [authenticatedUserId, navigate])

  const campaignRouteId = useMemo(() => getCampaignIdFromPath(currentPath), [currentPath])

  const resolvedCurrentUser = useMemo(
    () => (authenticatedUserId ? users.find((user) => user.id === authenticatedUserId) ?? null : null),
    [users, authenticatedUserId]
  )

  const currentAccountProfile = useMemo(() => {
    if (!authenticatedUserId) {
      return null
    }

    const profile = accountProfiles[authenticatedUserId]
    if (profile) {
      return profile
    }

    if (!resolvedCurrentUser) {
      return {
        fallbackName: 'Adventurer',
        email: '',
        title: 'Adventurer',
        capabilityRoles: [],
        preferences: {}
      }
    }

    return {
      fallbackName: resolvedCurrentUser.displayName || resolvedCurrentUser.username || 'Adventurer',
      email: resolvedCurrentUser.email || '',
      title: 'Adventurer',
      capabilityRoles: [],
      preferences: {}
    }
  }, [authenticatedUserId, resolvedCurrentUser])

  const currentUserDisplayName =
    resolvedCurrentUser?.displayName ?? currentAccountProfile?.fallbackName ?? 'Guest Adventurer'
  const currentUserEmail = resolvedCurrentUser?.email ?? currentAccountProfile?.email ?? '—'
  const currentUserStatus = resolvedCurrentUser?.status ?? 'Active'
  const currentUserTitle = currentAccountProfile?.title ?? 'Adventurer'
  const currentUserPreferences = currentAccountProfile?.preferences ?? {}
  const currentUserInitials = useMemo(() => {
    const source = (currentUserDisplayName || '').trim()
    if (!source) return 'AD'
    const segments = source.split(/\s+/).filter(Boolean)
    if (segments.length === 0) return 'AD'
    const initials = segments
      .slice(0, 2)
      .map((segment) => segment.charAt(0).toUpperCase())
      .join('')
    return initials || 'AD'
  }, [currentUserDisplayName])
  const currentUserCapabilityRoles = useMemo(() => {
    const capabilitySet = new Set(currentAccountProfile?.capabilityRoles ?? [])

    if (resolvedCurrentUser?.roles && resolvedCurrentUser.roles.length > 0) {
      resolvedCurrentUser.roles.forEach((roleId) => {
        const matchedRole = roles.find((role) => role.id === roleId)
        if (matchedRole && matchedRole.name === 'System Administrator') {
          capabilitySet.add('system-admin')
        }
      })
    }

    return Array.from(capabilitySet)
  }, [currentAccountProfile, resolvedCurrentUser, roles])
  const loginExamples = useMemo(
    () =>
      seededUsers.map((user) => ({
        id: user.id,
        name: user.displayName,
        username: user.username,
        password: user.password
      })),
    []
  )

  const currentUserRoleNames = useMemo(() => {
    if (resolvedCurrentUser?.roles && resolvedCurrentUser.roles.length > 0) {
      const mappedRoles = resolvedCurrentUser.roles
        .map((roleId) => roles.find((role) => role.id === roleId)?.name)
        .filter(Boolean)

      if (mappedRoles.length > 0) {
        return mappedRoles
      }

      return ['Unknown role']
    }

    if (currentUserCapabilityRoles.length > 0) {
      return currentUserCapabilityRoles.map((role) => role.replace(/-/g, ' '))
    }

    return ['No roles assigned']
  }, [resolvedCurrentUser, roles, currentUserCapabilityRoles])

  const assignedRoleNames = useMemo(() => {
    if (!resolvedCurrentUser?.roles) return []
    return resolvedCurrentUser.roles
      .map((roleId) => roles.find((role) => role.id === roleId)?.name)
      .filter(Boolean)
  }, [resolvedCurrentUser, roles])

  const isSystemAdmin = useMemo(
    () => currentUserCapabilityRoles.includes('system-admin') || assignedRoleNames.includes('System Administrator'),
    [currentUserCapabilityRoles, assignedRoleNames]
  )

  const permissions = useMemo(() => {
    const modulePermissions = capabilityMatrix['platform-admin'] || {}
    const derivedPermissions = new Set()

    currentUserCapabilityRoles.forEach((roleKey) => {
      const capabilities = modulePermissions[roleKey]
      if (capabilities) {
        capabilities.forEach((cap) => derivedPermissions.add(cap))
      }
    })

    return {
      canViewPlatformAdmin: derivedPermissions.has('view'),
      canManageUsers: derivedPermissions.has('manage-users'),
      canManageRoles: derivedPermissions.has('manage-roles'),
      canManageCampaigns: derivedPermissions.has('manage-campaigns')
    }
  }, [currentUserCapabilityRoles])

  const accessibleCampaigns = useMemo(() => {
    if (isSystemAdmin) {
      return campaigns
    }

    if (!authenticatedUserId) {
      return []
    }

    return campaigns.filter((campaign) =>
      Array.isArray(campaign.assignments)
        ? campaign.assignments.some((assignment) => assignment.userId === authenticatedUserId)
        : false
    )
  }, [campaigns, authenticatedUserId, isSystemAdmin])

  const myCharacters = useMemo(() => {
    if (!authenticatedUserId) return []
    return characters.filter((character) => character.ownerId === authenticatedUserId)
  }, [characters, authenticatedUserId])

  useEffect(() => {
    if (authenticatedUserId && !resolvedCurrentUser) {
      setSession({ authenticatedUserId: null })
      setActiveSectionId('users')
      setAuthError('Your account is no longer available. Please sign in again.')
      setProfileMenuOpen(false)
      setAppContext({ campaignId: '', characterId: '' })
      navigate('/', { replace: true })
    }
  }, [authenticatedUserId, resolvedCurrentUser, navigate])

  useEffect(() => {
    if (!appContext.campaignId) return
    if (!accessibleCampaigns.some((campaign) => campaign.id === appContext.campaignId)) {
      setAppContext((prev) => ({ ...prev, campaignId: '' }))
    }
  }, [accessibleCampaigns, appContext.campaignId])

  useEffect(() => {
    if (!appContext.characterId) return
    if (!myCharacters.some((character) => character.id === appContext.characterId)) {
      setAppContext((prev) => ({ ...prev, characterId: '' }))
    }
  }, [myCharacters, appContext.characterId])

  useEffect(() => {
    writeStoredState({
      users,
      roles,
      campaigns,
      worlds,
      characters,
      session,
      appContext,
      ui: { sidebarPinned }
    })
  }, [users, roles, campaigns, worlds, characters, session, appContext, sidebarPinned])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined

    const headerElement = headerRef.current
    if (!headerElement) return undefined

    const updateHeaderHeight = () => {
      if (!headerRef.current) return
      const { height } = headerRef.current.getBoundingClientRect()
      document.documentElement.style.setProperty('--app-header-height', `${height}px`)
    }

    updateHeaderHeight()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateHeaderHeight)
      observer.observe(headerElement)
      return () => observer.disconnect()
    }

    window.addEventListener('resize', updateHeaderHeight)
    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

  const sidebarModules = useMemo(
    () =>
      modules.filter((module) => {
        if (module.requiredCapability && !permissions[module.requiredCapability]) {
          return false
        }
        if (Array.isArray(module.requiredRoleNames) && module.requiredRoleNames.length > 0) {
          return module.requiredRoleNames.some((roleName) => assignedRoleNames.includes(roleName))
        }
        return true
      }),
    [permissions, assignedRoleNames]
  )

  const activeModuleId = useMemo(() => {
    const match = sidebarModules.find((module) => pathMatches(currentPath, module.path))
    return match?.id ?? null
  }, [sidebarModules, currentPath])

  const defaultModulePath = useMemo(() => {
    if (sidebarModules.length > 0) {
      return sidebarModules[0].path
    }
    return '/profile'
  }, [sidebarModules])

  useEffect(() => {
    if (currentPath === '/') {
      navigate(defaultModulePath, { replace: true })
    }
  }, [currentPath, defaultModulePath, navigate])

  useEffect(() => {
    const isModuleRoute = modules.some((module) => pathMatches(currentPath, module.path))
    if (!isModuleRoute) {
      return
    }
    if (activeModuleId) {
      return
    }
    if (sidebarModules.length > 0) {
      navigate(sidebarModules[0].path, { replace: true })
    } else {
      navigate('/profile', { replace: true })
    }
  }, [currentPath, activeModuleId, sidebarModules, navigate])

  useEffect(() => {
    if (!profileMenuOpen) return undefined
    const handlePointer = (event) => {
      if (!profileMenuRef.current) return
      if (profileMenuRef.current.contains(event.target)) return
      setProfileMenuOpen(false)
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false)
      }
    }
    window.addEventListener('mousedown', handlePointer)
    window.addEventListener('touchstart', handlePointer)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('mousedown', handlePointer)
      window.removeEventListener('touchstart', handlePointer)
      window.removeEventListener('keydown', handleKey)
    }
  }, [profileMenuOpen])

  useEffect(() => {
    setProfileMenuOpen(false)
  }, [currentPath])

  const handleLogout = () => {
    setSession({ authenticatedUserId: null })
    setActiveSectionId('users')
    setAuthError('You have been signed out. Sign in again to continue.')
    setAppContext({ campaignId: '', characterId: '' })
    setSidebarMobileOpen(false)
    setSidebarHovered(false)
    setProfileMenuOpen(false)
    navigate('/', { replace: true })
  }

  const handleAuthenticate = ({ identifier, password }) => {
    const trimmedIdentifier = typeof identifier === 'string' ? identifier.trim() : ''
    const providedPassword = typeof password === 'string' ? password : ''

    if (!trimmedIdentifier || !providedPassword) {
      setAuthError('Enter your username or email and password to continue.')
      return false
    }

    const normalizedIdentifier = trimmedIdentifier.toLowerCase()
    const matchedUser = users.find((user) => {
      const username = typeof user.username === 'string' ? user.username.toLowerCase() : ''
      const email = typeof user.email === 'string' ? user.email.toLowerCase() : ''
      return username === normalizedIdentifier || email === normalizedIdentifier
    })

    if (!matchedUser || matchedUser.password !== providedPassword) {
      setAuthError('The provided credentials are invalid. Please try again.')
      return false
    }

    setSession({ authenticatedUserId: matchedUser.id })
    setActiveSectionId('users')
    setProfileMenuOpen(false)
    setAuthError(null)
    setSidebarMobileOpen(false)
    navigate('/', { replace: true })
    return true
  }

  const handleSidebarMouseEnter = () => {
    if (!sidebarPinned && !sidebarMobileOpen) {
      setSidebarHovered(true)
    }
  }

  const handleSidebarMouseLeave = () => {
    if (!sidebarPinned) {
      setSidebarHovered(false)
    }
  }

  const isSidebarCollapsed = !sidebarPinned && !sidebarMobileOpen && !sidebarHovered
  const sidebarClassName = [
    'shell-sidebar',
    isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded',
    sidebarPinned ? 'sidebar-pinned' : 'sidebar-floating',
    sidebarMobileOpen ? 'sidebar-mobile-open' : ''
  ]
    .filter(Boolean)
    .join(' ')
  const showSidebarBackdrop = sidebarMobileOpen
  const showSidebarPinToggle = sidebarPinned || sidebarHovered || sidebarMobileOpen

  const updateUsersWithRoleRemoval = (roleId) => {
    setUsers((prev) =>
      prev.map((user) => {
        if (!user.roles.includes(roleId)) return user
        const nextRoles = user.roles.filter((id) => id !== roleId)
        return { ...user, roles: nextRoles, updatedAt: new Date().toISOString() }
      })
    )
  }

  const updateCampaignsWithRoleRemoval = (roleId) => {
    setCampaigns((prev) =>
      prev.map((campaign) => {
        const nextAssignments = campaign.assignments.filter((assignment) => assignment.roleId !== roleId)
        if (nextAssignments.length === campaign.assignments.length) {
          return campaign
        }
        return { ...campaign, assignments: nextAssignments, updatedAt: new Date().toISOString() }
      })
    )
  }

  const updateCampaignsWithUserRemoval = (userId) => {
    setCampaigns((prev) =>
      prev.map((campaign) => {
        const nextAssignments = campaign.assignments.filter((assignment) => assignment.userId !== userId)
        if (nextAssignments.length === campaign.assignments.length) {
          return campaign
        }
        return { ...campaign, assignments: nextAssignments, updatedAt: new Date().toISOString() }
      })
    )
  }

  const handleSaveRole = (payload, mode) => {
    if (mode === 'edit') {
      setRoles((prev) =>
        prev.map((role) => (role.id === payload.id ? { ...role, ...payload, updatedAt: new Date().toISOString() } : role))
      )
      return
    }

    setRoles((prev) => [
      ...prev,
      {
        ...payload,
        id: newId('role'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ])
  }

  const handleDeleteRole = (roleId) => {
    setRoles((prev) => prev.filter((role) => role.id !== roleId))
    updateUsersWithRoleRemoval(roleId)
    updateCampaignsWithRoleRemoval(roleId)
  }

  const handleSaveUser = (payload, mode) => {
    if (mode === 'edit') {
      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== payload.id) return user
          const nextPassword = payload.password ? payload.password : user.password
          return {
            ...user,
            ...payload,
            password: nextPassword,
            updatedAt: new Date().toISOString()
          }
        })
      )
      return
    }

    setUsers((prev) => [
      ...prev,
      {
        ...payload,
        id: newId('user'),
        status: payload.status || 'Invited',
        updatedAt: new Date().toISOString()
      }
    ])
  }

  const handleDeleteUser = (userId) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId))
    updateCampaignsWithUserRemoval(userId)
  }

  const handleSaveCampaign = (payload, mode) => {
    if (mode === 'edit') {
      setCampaigns((prev) =>
        prev.map((campaign) =>
          campaign.id === payload.id
            ? {
                ...campaign,
                ...payload,
                updatedAt: new Date().toISOString()
              }
            : campaign
        )
      )
      return
    }

    setCampaigns((prev) => [
      ...prev,
      {
        ...payload,
        id: newId('campaign'),
        updatedAt: new Date().toISOString()
      }
    ])
  }

  const handleDeleteCampaign = (campaignId) => {
    setCampaigns((prev) => prev.filter((campaign) => campaign.id !== campaignId))
    setCharacters((prev) =>
      prev.map((character) =>
        character.campaignId === campaignId ? { ...character, campaignId: '' } : character
      )
    )
    setAppContext((prev) =>
      prev.campaignId === campaignId ? { ...prev, campaignId: '' } : prev
    )
  }

  const handleSaveWorld = (payload, mode) => {
    if (mode === 'edit') {
      setWorlds((prev) =>
        prev.map((world) =>
          world.id === payload.id
            ? { ...world, ...payload, updatedAt: new Date().toISOString() }
            : world
        )
      )
      return
    }

    setWorlds((prev) => [
      ...prev,
      {
        ...payload,
        id: newId('world'),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ])
  }

  const handleDeleteWorld = (worldId) => {
    setWorlds((prev) => prev.filter((world) => world.id !== worldId))
    setCampaigns((prev) =>
      prev.map((campaign) =>
        campaign.worldId === worldId
          ? { ...campaign, worldId: '', updatedAt: new Date().toISOString() }
          : campaign
      )
    )
  }

  const handleSaveCharacter = (payload, mode) => {
    const nextLevel = Number(payload.level) || 1
    if (mode === 'edit') {
      setCharacters((prev) =>
        prev.map((character) =>
          character.id === payload.id
            ? {
                ...character,
                ...payload,
                ownerId: payload.ownerId || character.ownerId,
                level: nextLevel,
                updatedAt: new Date().toISOString()
              }
            : character
        )
      )
      return
    }

    setCharacters((prev) => [
      ...prev,
      {
        ...payload,
        id: newId('character'),
        ownerId: payload.ownerId || authenticatedUserId,
        level: nextLevel,
        updatedAt: new Date().toISOString()
      }
    ])
  }

  const handleDeleteCharacter = (characterId) => {
    setCharacters((prev) => prev.filter((character) => character.id !== characterId))
    setAppContext((prev) =>
      prev.characterId === characterId ? { ...prev, characterId: '' } : prev
    )
  }

  const canCreateCampaigns = useMemo(
    () =>
      assignedRoleNames.includes('Dungeon Master') ||
      assignedRoleNames.includes('System Administrator'),
    [assignedRoleNames]
  )

  const handleRouteCampaignChange = useCallback(
    (nextId) => {
      if (nextId) {
        navigate(`/campaigns/${nextId}`)
      } else {
        navigate('/campaigns')
      }
    },
    [navigate]
  )

  const profileReturnHandler = sidebarModules.length > 0 ? () => navigate(defaultModulePath) : undefined

  let mainContent = null

  if (currentPath === '/profile') {
    mainContent = (
      <MyProfile
        name={currentUserDisplayName}
        title={currentUserTitle}
        email={currentUserEmail}
        status={currentUserStatus}
        username={resolvedCurrentUser?.username}
        roleNames={currentUserRoleNames}
        onClose={profileReturnHandler}
        onLogout={handleLogout}
        lastUpdated={resolvedCurrentUser?.updatedAt}
        preferences={currentUserPreferences}
      />
    )
  } else if (pathMatches(currentPath, '/worlds')) {
    mainContent = (
      <WorldPage worlds={worlds} onSaveWorld={handleSaveWorld} onDeleteWorld={handleDeleteWorld} />
    )
  } else if (pathMatches(currentPath, '/campaigns')) {
    mainContent = (
      <CampaignsPage
        accessibleCampaigns={accessibleCampaigns}
        onSaveCampaign={handleSaveCampaign}
        onDeleteCampaign={handleDeleteCampaign}
        currentUserId={authenticatedUserId}
        roles={roles}
        users={users}
        characters={characters}
        isSystemAdmin={isSystemAdmin}
        onSelectCampaign={(campaignId) =>
          setAppContext((prev) => ({ ...prev, campaignId }))
        }
        currentCampaignId={appContext.campaignId}
        worlds={worlds}
        canCreateCampaigns={canCreateCampaigns}
        routeCampaignId={campaignRouteId}
        onRouteChange={handleRouteCampaignChange}
      />
    )
  } else if (pathMatches(currentPath, '/characters')) {
    mainContent = (
      <CharactersPage
        characters={characters}
        campaigns={campaigns}
        currentUserId={authenticatedUserId}
        onSaveCharacter={handleSaveCharacter}
        onDeleteCharacter={handleDeleteCharacter}
        appCampaignId={appContext.campaignId}
        accessibleCampaigns={accessibleCampaigns}
        currentCharacterId={appContext.characterId}
        onSelectCharacter={(characterId) =>
          setAppContext((prev) => ({ ...prev, characterId }))
        }
        onSelectCampaign={(campaignId) =>
          setAppContext((prev) => ({ ...prev, campaignId }))
        }
      />
    )
  } else if (pathMatches(currentPath, '/admin')) {
    mainContent = permissions.canViewPlatformAdmin ? (
      <PlatformAdmin
        activeSectionId={activeSectionId}
        onSectionChange={setActiveSectionId}
        users={users}
        roles={roles}
        campaigns={campaigns}
        permissions={permissions}
        onSaveUser={handleSaveUser}
        onDeleteUser={handleDeleteUser}
        onSaveRole={handleSaveRole}
        onDeleteRole={handleDeleteRole}
        onSaveCampaign={handleSaveCampaign}
        onDeleteCampaign={handleDeleteCampaign}
        worlds={worlds}
      />
    ) : (
      <div className="empty-state">
        <h2>Access restricted</h2>
        <p>You currently do not have permission to administer the platform.</p>
      </div>
    )
  } else {
    mainContent = (
      <div className="empty-state">
        <h2>Page not found</h2>
        <p>The page you are trying to reach could not be found.</p>
        <button type="button" className="primary" onClick={() => navigate(defaultModulePath)}>
          Go to workspace
        </button>
      </div>
    )
  }

  if (!authenticatedUserId) {
    return (
      <LoginPage
        onAuthenticate={handleAuthenticate}
        error={authError}
        examples={loginExamples}
        onClearError={() => setAuthError(null)}
      />
    )
  }

  return (
    <div className="app-shell">
      <header ref={headerRef} className="app-header">
        <div className="header-bar">
          <div className="brand-identity">
            <div className="brand-logo" aria-hidden="true">
              <span>SN</span>
            </div>
            <div className="brand-copy">
              <span className="brand-title">DND Shared Space</span>
              <span className="brand-subtitle">Adventuring operations workspace</span>
            </div>
          </div>
          <div className="header-actions">
            <div className="context-switchers" aria-label="Active context selection">
              <label className="context-select">
                <span>Campaign</span>
                <select
                  value={appContext.campaignId}
                  onChange={(event) => {
                    const nextCampaign = event.target.value
                    setAppContext((prev) => ({
                      campaignId: nextCampaign,
                      characterId:
                        nextCampaign === '' || nextCampaign !== prev.campaignId
                          ? ''
                          : prev.characterId
                    }))
                  }}
                >
                  <option value="">No campaign selected</option>
                  {accessibleCampaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="context-select">
                <span>Character</span>
                <select
                  value={appContext.characterId}
                  onChange={(event) => {
                    const nextCharacterId = event.target.value
                    if (!nextCharacterId) {
                      setAppContext((prev) => ({ ...prev, characterId: '', campaignId: prev.campaignId }))
                      return
                    }
                    const selectedCharacter = myCharacters.find(
                      (character) => character.id === nextCharacterId
                    )
                    setAppContext({
                      characterId: nextCharacterId,
                      campaignId: selectedCharacter?.campaignId || ''
                    })
                  }}
                >
                  <option value="">No character selected</option>
                  {myCharacters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="current-user-menu" ref={profileMenuRef}>
              <button
                type="button"
                className="current-user-button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev)
                  setSidebarMobileOpen(false)
                }}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-label="Open profile menu"
              >
                <span className="user-avatar" aria-hidden="true">
                  {currentUserInitials}
                </span>
                <span className="user-meta">
                  <span className="user-name">{currentUserDisplayName}</span>
                  <span className="user-role">{currentUserRoleNames.join(', ')}</span>
                </span>
              </button>
              {profileMenuOpen && (
                <div className="profile-dropdown" role="menu">
                  <div className="profile-overview">
                    <span className="profile-overview-name">{currentUserDisplayName}</span>
                    <span className="profile-overview-role">{currentUserRoleNames.join(', ')}</span>
                    <span className="profile-overview-email">{currentUserEmail}</span>
                  </div>
                  <div className="profile-overview-status">
                    <span className="status-pill">{currentUserStatus}</span>
                    <span className="profile-overview-title">{currentUserTitle}</span>
                  </div>
                  <div className="profile-actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        navigate('/profile')
                      }}
                    >
                      Edit profile
                    </button>
                    <button
                      type="button"
                      className="ghost destructive"
                      onClick={handleLogout}
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="app-body">
        <aside
          className={sidebarClassName}
          onMouseEnter={handleSidebarMouseEnter}
          onMouseLeave={handleSidebarMouseLeave}
          aria-label="Primary navigation sidebar"
        >
          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={() => setSidebarMobileOpen(false)}
            aria-label="Close navigation"
            title="Close navigation"
          >
            ×
          </button>
          <nav className="sidebar-nav" aria-label="Primary navigation">
            {showSidebarPinToggle && (
              <button
                type="button"
                className={`sidebar-pin-inline sidebar-pin-toggle${sidebarPinned ? ' active' : ''}`}
                onClick={() => setSidebarPinned((prev) => !prev)}
                aria-pressed={sidebarPinned}
                aria-label={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
                title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                <span className="sidebar-pin-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path
                      d="M8 4H16L15.25 9H18L12 15L6 9H8.75Z"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      stroke="currentColor"
                      fill="none"
                    />
                    <path
                      d="M12 15V21"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      stroke="currentColor"
                      fill="none"
                    />
                  </svg>
                </span>
                {!isSidebarCollapsed && <span className="sidebar-pin-label">Pin menu</span>}
              </button>
            )}
            {sidebarModules.length === 0 && <p className="sidebar-empty">No modules available for your role.</p>}
            {sidebarModules.map((module) => {
              const isActive = module.id === activeModuleId
              return (
                <button
                  key={module.id}
                  className={`sidebar-link${isActive ? ' active' : ''}`}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={module.label}
                  title={isSidebarCollapsed ? module.label : undefined}
                  onClick={() => {
                    setProfileMenuOpen(false)
                    setSidebarMobileOpen(false)
                    navigate(module.path)
                  }}
                >
                  <span className="sidebar-icon" aria-hidden="true">
                    {module.icon || '•'}
                  </span>
                  <span className="sidebar-label">{module.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>
        {showSidebarBackdrop && (
          <button
            type="button"
            className="sidebar-backdrop"
            onClick={() => setSidebarMobileOpen(false)}
            aria-label="Close navigation"
          />
        )}

        <div className="shell-main">
          <main className="module-content">{mainContent}</main>
        </div>
      </div>
    </div>
  )
}

function WorldPage({ worlds, onSaveWorld, onDeleteWorld }) {
  const [editor, setEditor] = useState({ open: false, mode: 'create', record: null })
  const [form, setForm] = useState({ name: '', tagline: '', description: '' })
  const [confirmState, setConfirmState] = useState({ open: false, record: null })

  const sortedWorlds = useMemo(() => {
    return [...worlds].sort((a, b) => {
      const getTime = (value) => (value ? new Date(value).getTime() : 0)
      return getTime(b.updatedAt || b.createdAt) - getTime(a.updatedAt || a.createdAt)
    })
  }, [worlds])

  const openCreate = () => {
    setForm({ name: '', tagline: '', description: '' })
    setEditor({ open: true, mode: 'create', record: null })
  }

  const openEdit = (record) => {
    setForm({
      name: record.name || '',
      tagline: record.tagline || '',
      description: record.description || ''
    })
    setEditor({ open: true, mode: 'edit', record })
  }

  const closeEditor = () => {
    setEditor((prev) => ({ ...prev, open: false }))
    setForm({ name: '', tagline: '', description: '' })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const payload = {
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim()
    }

    if (!payload.name) {
      return
    }

    if (editor.mode === 'edit' && editor.record) {
      onSaveWorld({ ...payload, id: editor.record.id }, 'edit')
    } else {
      onSaveWorld(payload, 'create')
    }

    closeEditor()
  }

  const requestDelete = (record) => {
    setConfirmState({ open: true, record })
  }

  const closeConfirm = () => setConfirmState({ open: false, record: null })

  const handleConfirmDelete = () => {
    if (confirmState.record) {
      onDeleteWorld(confirmState.record.id)
    }
    closeConfirm()
  }

  const formId = 'world-record-form'

  const formatTimestamp = (value) =>
    value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium' }) : '—'

  return (
    <section className="world-page">
      <header className="section-header">
        <div>
          <h2>Worlds</h2>
          <p className="section-subtitle">
            Craft immersive settings that your campaigns can explore and revisit.
          </p>
        </div>
        <button type="button" className="primary" onClick={openCreate}>
          New world
        </button>
      </header>

      {sortedWorlds.length === 0 ? (
        <div className="empty-state">
          <h3>No worlds yet</h3>
          <p>Introduce your first realm to anchor campaigns, regions, and lore.</p>
        </div>
      ) : (
        <div className="world-grid">
          {sortedWorlds.map((world) => (
            <article key={world.id} className="world-card">
              <header className="world-card-header">
                <div>
                  <h3>{world.name}</h3>
                  {world.tagline && <p className="world-tagline">{world.tagline}</p>}
                </div>
                <div className="card-actions">
                  <button type="button" className="ghost" onClick={() => openEdit(world)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="ghost destructive"
                    onClick={() => requestDelete(world)}
                  >
                    Delete
                  </button>
                </div>
              </header>
              {world.description && <p className="world-description">{world.description}</p>}
              <dl className="card-meta">
                <div>
                  <dt>Created</dt>
                  <dd>{formatTimestamp(world.createdAt)}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{formatTimestamp(world.updatedAt)}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}

      <RecordDrawer
        open={editor.open}
        title={editor.mode === 'edit' ? 'Edit world' : 'Create world'}
        onClose={closeEditor}
        actions={
          <>
            <button type="button" className="ghost" onClick={closeEditor}>
              Cancel
            </button>
            <button type="submit" className="primary" form={formId}>
              {editor.mode === 'edit' ? 'Save' : 'Submit'}
            </button>
          </>
        }
      >
        <form id={formId} className="drawer-form" onSubmit={handleSubmit}>
          <label>
            <span>World name</span>
            <input
              required
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label>
            <span>Tagline</span>
            <input
              type="text"
              placeholder="Optional flavour text"
              value={form.tagline}
              onChange={(event) => setForm((prev) => ({ ...prev, tagline: event.target.value }))}
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              rows={5}
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
        </form>
      </RecordDrawer>

      <ConfirmDialog
        open={confirmState.open}
        title="Delete world"
        description="Are you sure you want to remove this world? Campaigns referencing it will lose their association."
        detail={confirmState.record?.name}
        confirmLabel="Delete world"
        onCancel={closeConfirm}
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}

function CampaignsPage({
  accessibleCampaigns,
  onSaveCampaign,
  onDeleteCampaign,
  currentUserId,
  roles,
  users,
  characters = [],
  isSystemAdmin,
  onSelectCampaign,
  currentCampaignId,
  worlds,
  canCreateCampaigns,
  routeCampaignId,
  onRouteChange
}) {
  const roleNameLookup = useMemo(() => {
    const map = new Map()
    roles.forEach((role) => map.set(role.id, role.name))
    return map
  }, [roles])

  const userNameLookup = useMemo(() => {
    const map = new Map()
    users.forEach((user) => map.set(user.id, user.displayName || user.username || 'Unassigned'))
    return map
  }, [users])

  const worldNameLookup = useMemo(() => {
    const map = new Map()
    worlds.forEach((world) => map.set(world.id, world.name))
    return map
  }, [worlds])

  const campaignCharacterLookup = useMemo(() => {
    const map = new Map()
    characters
      .filter((character) => character && character.campaignId)
      .forEach((character) => {
        const entries = map.get(character.campaignId) || []
        entries.push(character)
        map.set(character.campaignId, entries)
      })
    return map
  }, [characters])

  const dungeonMasterRoleId = useMemo(
    () => roles.find((role) => role.name === 'Dungeon Master')?.id || '',
    [roles]
  )

  const roleOptions = useMemo(
    () => roles.map((role) => ({ id: role.id, name: role.name })),
    [roles]
  )

  const userOptions = useMemo(
    () =>
      users.map((user) => ({
        id: user.id,
        name: user.displayName || user.username || 'Unassigned'
      })),
    [users]
  )

  const worldOptions = useMemo(
    () => worlds.map((world) => ({ id: world.id, name: world.name })),
    [worlds]
  )

  const [createDrawerOpen, setCreateDrawerOpen] = useState(false)
  const [createForm, setCreateForm] = useState(() => ({
    name: '',
    status: 'Planning',
    summary: '',
    worldId: worldOptions[0]?.id ?? '',
    assignments: []
  }))
  const [recordDrawer, setRecordDrawer] = useState({ open: false, recordId: null, editing: false })
  const [recordForm, setRecordForm] = useState({
    name: '',
    status: 'Planning',
    summary: '',
    worldId: '',
    assignments: []
  })
  const [confirmState, setConfirmState] = useState({ open: false, record: null })

  useEffect(() => {
    if (!canCreateCampaigns) {
      setCreateDrawerOpen(false)
    }
  }, [canCreateCampaigns])

  useEffect(() => {
    if (!createDrawerOpen) {
      setCreateForm({
        name: '',
        status: 'Planning',
        summary: '',
        worldId: worldOptions[0]?.id ?? '',
        assignments: []
      })
    }
  }, [createDrawerOpen, worldOptions])

  useEffect(() => {
    if (!recordDrawer.open) {
      setRecordForm({
        name: '',
        status: 'Planning',
        summary: '',
        worldId: '',
        assignments: []
      })
      return
    }

    if (!recordDrawer.recordId || recordDrawer.editing) {
      return
    }

    const latest = accessibleCampaigns.find((campaign) => campaign.id === recordDrawer.recordId)
    if (latest) {
      setRecordForm({
        name: latest.name || '',
        status: latest.status || 'Planning',
        summary: latest.summary || '',
        worldId: latest.worldId || '',
        assignments: Array.isArray(latest.assignments)
          ? latest.assignments.map((assignment) => ({ ...assignment }))
          : []
      })
    }
  }, [recordDrawer.open, recordDrawer.recordId, recordDrawer.editing, accessibleCampaigns])

  useEffect(() => {
    if (!routeCampaignId) {
      setRecordDrawer((prev) =>
        prev.open || prev.recordId ? { open: false, recordId: null, editing: false } : prev
      )
      return
    }

    const matched = accessibleCampaigns.find((campaign) => campaign.id === routeCampaignId)
    if (!matched) {
      if (typeof onRouteChange === 'function') {
        onRouteChange(null)
      }
      setRecordDrawer({ open: false, recordId: null, editing: false })
      return
    }

    setRecordDrawer((prev) => {
      if (prev.open && prev.recordId === matched.id) {
        return prev
      }
      return { open: true, recordId: matched.id, editing: false }
    })
  }, [routeCampaignId, accessibleCampaigns, onRouteChange])

  const sortedCampaigns = useMemo(() => {
    return [...accessibleCampaigns].sort((a, b) => {
      const getTime = (value) => (value ? new Date(value).getTime() : 0)
      return getTime(b.updatedAt) - getTime(a.updatedAt)
    })
  }, [accessibleCampaigns])

  const describeStatus = (status) => {
    if (!status) return 'Unknown'
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  const getUserName = (userId) => userNameLookup.get(userId) || 'Unknown user'
  const getRoleName = (roleId) => roleNameLookup.get(roleId) || 'Unknown role'
  const getWorldName = (worldId) => worldNameLookup.get(worldId) || 'Unassigned world'
  const getCharactersForAssignment = useCallback(
    (campaignId, userId) => {
      const byCampaign = campaignCharacterLookup.get(campaignId) || []
      return byCampaign.filter((character) => character.ownerId === userId)
    },
    [campaignCharacterLookup]
  )

  const userCanManage = (campaign) => {
    if (isSystemAdmin) return true
    if (!currentUserId) return false
    if (!Array.isArray(campaign.assignments)) return false

    return campaign.assignments.some((assignment) => {
      if (assignment.userId !== currentUserId) return false
      const roleName = roleNameLookup.get(assignment.roleId)
      return roleName === 'Dungeon Master'
    })
  }

  const splitAssignments = useCallback(
    (campaign) => {
      const result = { dungeonMasters: [], partyMembers: [] }
      if (!Array.isArray(campaign.assignments)) {
        return result
      }
      campaign.assignments.forEach((assignment) => {
        const roleName = roleNameLookup.get(assignment.roleId)
        if (roleName === 'Dungeon Master') {
          result.dungeonMasters.push(assignment)
        } else {
          result.partyMembers.push(assignment)
        }
      })
      return result
    },
    [roleNameLookup]
  )

  const openCreate = () => {
    if (!canCreateCampaigns) return
    const defaultAssignments = []
    if (currentUserId && dungeonMasterRoleId) {
      defaultAssignments.push({
        id: newId('assignment'),
        userId: currentUserId,
        roleId: dungeonMasterRoleId
      })
    }
    setCreateForm({
      name: '',
      status: 'Planning',
      summary: '',
      worldId: worldOptions[0]?.id ?? '',
      assignments: defaultAssignments
    })
    setCreateDrawerOpen(true)
  }

  const closeCreateDrawer = () => setCreateDrawerOpen(false)

  const handleSubmitCreate = (event) => {
    event.preventDefault()
    const payload = {
      name: createForm.name.trim(),
      status: createForm.status || 'Planning',
      summary: createForm.summary.trim(),
      worldId: createForm.worldId || '',
      assignments: createForm.assignments.filter((assignment) => assignment.userId && assignment.roleId)
    }

    if (!payload.name) {
      return
    }

    onSaveCampaign(payload, 'create')
    closeCreateDrawer()
  }

  const handleAddCreateAssignment = () => {
    const defaultUser = currentUserId || (userOptions[0]?.id ?? '')
    const defaultRole = dungeonMasterRoleId || (roleOptions[0]?.id ?? '')
    setCreateForm((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        { id: newId('assignment'), userId: defaultUser, roleId: defaultRole }
      ]
    }))
  }

  const handleUpdateCreateAssignment = (assignmentId, key, value) => {
    setCreateForm((prev) => ({
      ...prev,
      assignments: prev.assignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, [key]: value } : assignment
      )
    }))
  }

  const handleRemoveCreateAssignment = (assignmentId) => {
    if (!window.confirm('Remove this assignment from the campaign?')) return
    setCreateForm((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((assignment) => assignment.id !== assignmentId)
    }))
  }

  const openRecord = (record) => {
    setRecordDrawer({ open: true, recordId: record.id, editing: false })
    setRecordForm({
      name: record.name || '',
      status: record.status || 'Planning',
      summary: record.summary || '',
      worldId: record.worldId || '',
      assignments: Array.isArray(record.assignments)
        ? record.assignments.map((assignment) => ({ ...assignment }))
        : []
    })
    if (typeof onRouteChange === 'function') {
      onRouteChange(record.id)
    }
  }

  const closeRecord = () => {
    if (typeof onRouteChange === 'function') {
      onRouteChange(null)
    }
    setRecordDrawer({ open: false, recordId: null, editing: false })
  }

  const beginEditRecord = () => setRecordDrawer((prev) => ({ ...prev, editing: true }))

  const cancelEditRecord = () => {
    if (!recordDrawer.recordId) {
      closeRecord()
      return
    }
    const latest = accessibleCampaigns.find((campaign) => campaign.id === recordDrawer.recordId)
    if (latest) {
      setRecordForm({
        name: latest.name || '',
        status: latest.status || 'Planning',
        summary: latest.summary || '',
        worldId: latest.worldId || '',
        assignments: Array.isArray(latest.assignments)
          ? latest.assignments.map((assignment) => ({ ...assignment }))
          : []
      })
    }
    setRecordDrawer((prev) => ({ ...prev, editing: false }))
  }

  const handleSubmitRecord = (event) => {
    event.preventDefault()
    if (!recordDrawer.recordId) {
      return
    }
    const payload = {
      id: recordDrawer.recordId,
      name: recordForm.name.trim(),
      status: recordForm.status || 'Planning',
      summary: recordForm.summary.trim(),
      worldId: recordForm.worldId || '',
      assignments: recordForm.assignments.filter((assignment) => assignment.userId && assignment.roleId)
    }

    if (!payload.name) {
      return
    }

    onSaveCampaign(payload, 'edit')
    closeRecord()
  }

  const handleAddRecordAssignment = () => {
    const defaultUser = currentUserId || (userOptions[0]?.id ?? '')
    const defaultRole = dungeonMasterRoleId || (roleOptions[0]?.id ?? '')
    setRecordForm((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        { id: newId('assignment'), userId: defaultUser, roleId: defaultRole }
      ]
    }))
  }

  const handleUpdateRecordAssignment = (assignmentId, key, value) => {
    setRecordForm((prev) => ({
      ...prev,
      assignments: prev.assignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, [key]: value } : assignment
      )
    }))
  }

  const handleRemoveRecordAssignment = (assignmentId) => {
    if (!window.confirm('Remove this assignment from the campaign?')) return
    setRecordForm((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((assignment) => assignment.id !== assignmentId)
    }))
  }

  const closeConfirm = () => setConfirmState({ open: false, record: null })

  const requestDelete = (record) => {
    setConfirmState({ open: true, record })
  }

  const handleConfirmDelete = () => {
    if (confirmState.record) {
      onDeleteCampaign(confirmState.record.id)
      if (recordDrawer.recordId === confirmState.record.id) {
        closeRecord()
      }
    }
    closeConfirm()
  }

  const currentRecord = recordDrawer.recordId
    ? accessibleCampaigns.find((campaign) => campaign.id === recordDrawer.recordId) || null
    : null

  const canManageCurrent = currentRecord ? userCanManage(currentRecord) : false

  const recordDrawerTitle = recordDrawer.editing
    ? recordForm.name || currentRecord?.name || 'Edit campaign'
    : currentRecord?.name || 'Campaign details'

  const recordDrawerHeading =
    recordDrawer.editing || !currentRecord ? (
      recordDrawerTitle
    ) : (
      <div className="campaign-detail-heading">
        <div className="campaign-detail-heading-top">
          <h3>{currentRecord.name}</h3>
          <Badge variant={statusVariantFromStatus(currentRecord.status)}>
            {describeStatus(currentRecord.status)}
          </Badge>
        </div>
        <div className="campaign-detail-heading-meta">
          <div>
            <span className="detail-label">World</span>
            <span className="detail-value">{getWorldName(currentRecord.worldId)}</span>
          </div>
          <div>
            <span className="detail-label">Updated</span>
            <span className="detail-value">{formatRelativeTime(currentRecord.updatedAt)}</span>
          </div>
        </div>
      </div>
    )

  const formatTimestamp = (value) =>
    value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

  const formatCardTimestamp = (value) => formatRelativeTime(value)

  const { dungeonMasters, partyMembers } = useMemo(() => {
    if (!currentRecord) {
      return { dungeonMasters: [], partyMembers: [] }
    }
    return splitAssignments(currentRecord)
  }, [currentRecord, splitAssignments])

  const renderAssignmentEditor = (assignments, onUpdate, onRemove, prefix) => {
    if (assignments.length === 0) {
      return null
    }
    return (
      <div className="assignment-table" role="table">
        <div className="assignment-table-header" role="row">
          <span role="columnheader">Participant</span>
          <span role="columnheader">Role</span>
          <span className="assignment-table-actions" role="columnheader">
            Actions
          </span>
        </div>
        {assignments.map((assignment) => {
          const userFieldId = `${prefix}-assignment-${assignment.id}-user`
          const roleFieldId = `${prefix}-assignment-${assignment.id}-role`
          return (
            <div key={assignment.id} className="assignment-table-row" role="row">
              <label className="sr-only" htmlFor={userFieldId}>
                Participant
              </label>
              <select
                id={userFieldId}
                value={assignment.userId}
                onChange={(event) => onUpdate(assignment.id, 'userId', event.target.value)}
              >
                <option value="">Select user</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor={roleFieldId}>
                Role
              </label>
              <select
                id={roleFieldId}
                value={assignment.roleId}
                onChange={(event) => onUpdate(assignment.id, 'roleId', event.target.value)}
              >
                <option value="">Select role</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <button type="button" className="ghost" onClick={() => onRemove(assignment.id)}>
                Remove
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  const createFormId = 'campaign-create-form'
  const recordFormId = 'campaign-edit-form'

  return (
    <section className="campaigns-page">
      <header className="section-header">
        <div>
          <h2>Campaigns</h2>
          <p className="section-subtitle">
            View the adventures you belong to and keep your party assignments current.
          </p>
        </div>
        {canCreateCampaigns && (
          <Button onClick={openCreate}>New campaign</Button>
        )}
      </header>

      {sortedCampaigns.length === 0 ? (
        <Card className="campaign-empty">
          <div className="campaign-empty-illustration" aria-hidden="true">
            📜
          </div>
          <h3>You’re not part of any campaigns yet.</h3>
          <p>Spin up your first adventure to invite your party and set the scene.</p>
          {canCreateCampaigns && (
            <Button onClick={openCreate}>+ Create campaign</Button>
          )}
        </Card>
      ) : (
        <div className="campaign-grid-modern">
          {sortedCampaigns.map((campaign) => {
            const isCurrent = currentCampaignId === campaign.id
            const { dungeonMasters: cardDMs, partyMembers: cardParty } = splitAssignments(campaign)
            const dmNames = cardDMs.map((assignment) => getUserName(assignment.userId)).filter(Boolean)
            const partyNames = cardParty.map((assignment) => getUserName(assignment.userId)).filter(Boolean)
            const partyPreview = partyNames.slice(0, 3)
            const remaining = Math.max(0, partyNames.length - partyPreview.length)
            return (
              <Card key={campaign.id} className={classNames('campaign-card-modern', isCurrent && 'campaign-card-modern-active')}>
                <div className="campaign-card-modern__header">
                  <div>
                    <h3>{campaign.name}</h3>
                    <div className="campaign-card-modern__status">
                      <span className="detail-label">Status</span>
                      <Badge variant={statusVariantFromStatus(campaign.status)}>
                        {describeStatus(campaign.status)}
                      </Badge>
                    </div>
                  </div>
                  <span className="campaign-card-modern__updated">Last updated {formatCardTimestamp(campaign.updatedAt)}</span>
                </div>

                {campaign.summary && <p className="campaign-card-modern__summary">{campaign.summary}</p>}

                <div className="campaign-card-modern__meta">
                  <div>
                    <span className="detail-label">World</span>
                    <span className="detail-value">{getWorldName(campaign.worldId)}</span>
                  </div>
                  <div>
                    <span className="detail-label">DM</span>
                    <span className="detail-value" aria-label="Dungeon Master">
                      {dmNames.length > 0 ? dmNames.join(', ') : 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="detail-label">Party</span>
                    <div className="campaign-card-modern__party" aria-label="Party preview">
                      {partyPreview.length > 0 ? (
                        <>
                          {partyPreview.map((name) => (
                            <span key={name} className="party-chip">
                              {name}
                            </span>
                          ))}
                          {remaining > 0 && (
                            <span className="party-chip party-chip--more">+{remaining}</span>
                          )}
                        </>
                      ) : (
                        <span className="detail-value muted">No players yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="campaign-card-modern__actions">
                  <Button onClick={() => openRecord(campaign)}>View details</Button>
                  <Button
                    variant="secondary"
                    onClick={() => onSelectCampaign?.(campaign.id)}
                    disabled={isCurrent}
                    aria-pressed={isCurrent}
                  >
                    {isCurrent ? 'Active campaign' : 'Set active'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <RecordDrawer
        open={createDrawerOpen}
        title="Create campaign"
        onClose={closeCreateDrawer}
        actions={
          <>
            <Button variant="secondary" onClick={closeCreateDrawer}>
              Cancel
            </Button>
            <Button type="submit" form={createFormId}>
              Submit
            </Button>
          </>
        }
      >
        <form id={createFormId} className="drawer-form" onSubmit={handleSubmitCreate}>
          <label>
            <span>Campaign name</span>
            <input
              required
              type="text"
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={createForm.status}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </label>

          <label>
            <span>World</span>
            <select
              value={createForm.worldId}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, worldId: event.target.value }))}
            >
              <option value="">Unassigned</option>
              {worldOptions.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Summary</span>
            <textarea
              rows={4}
              value={createForm.summary}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, summary: event.target.value }))}
            />
          </label>

          <div className="drawer-subsection">
            <div className="drawer-subsection-header">
              <h4>Assignments</h4>
              <button
                type="button"
                className="ghost"
                onClick={handleAddCreateAssignment}
                disabled={userOptions.length === 0 || roleOptions.length === 0}
              >
                Add assignment
              </button>
            </div>

            {createForm.assignments.length === 0 ? (
              <p className="helper-text">Invite players and storytellers to this campaign.</p>
            ) : (
              renderAssignmentEditor(createForm.assignments, handleUpdateCreateAssignment, handleRemoveCreateAssignment, 'create')
            )}
          </div>
        </form>
      </RecordDrawer>

      <RecordDrawer
        open={recordDrawer.open}
        title={recordDrawerHeading}
        onClose={closeRecord}
        actions={
          recordDrawer.editing ? (
            <>
              <Button variant="secondary" onClick={cancelEditRecord}>
                Cancel
              </Button>
              <Button type="submit" form={recordFormId}>
                Save
              </Button>
            </>
          ) : (
            <>
              {canManageCurrent && currentRecord && (
                <>
                  <Button variant="ghost" tone="danger" onClick={() => requestDelete(currentRecord)}>
                    Delete
                  </Button>
                  <Button variant="secondary" onClick={beginEditRecord}>
                    Edit
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={closeRecord}>
                Close
              </Button>
            </>
          )
        }
      >
        {recordDrawer.editing ? (
          <form id={recordFormId} className="drawer-form" onSubmit={handleSubmitRecord}>
            <label>
              <span>Campaign name</span>
              <input
                required
                type="text"
                value={recordForm.name}
                onChange={(event) => setRecordForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label>
              <span>Status</span>
              <select
                value={recordForm.status}
                onChange={(event) => setRecordForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </label>

            <label>
              <span>World</span>
              <select
                value={recordForm.worldId}
                onChange={(event) => setRecordForm((prev) => ({ ...prev, worldId: event.target.value }))}
              >
                <option value="">Unassigned</option>
                {worldOptions.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Summary</span>
              <textarea
                rows={4}
                value={recordForm.summary}
                onChange={(event) => setRecordForm((prev) => ({ ...prev, summary: event.target.value }))}
              />
            </label>

            <div className="drawer-subsection">
              <div className="drawer-subsection-header">
                <h4>Assignments</h4>
                <button
                  type="button"
                  className="ghost"
                  onClick={handleAddRecordAssignment}
                  disabled={userOptions.length === 0 || roleOptions.length === 0}
                >
                  Add assignment
                </button>
              </div>

              {recordForm.assignments.length === 0 ? (
                <p className="helper-text">Invite players and storytellers to this campaign.</p>
              ) : (
                renderAssignmentEditor(recordForm.assignments, handleUpdateRecordAssignment, handleRemoveRecordAssignment, 'edit')
              )}
            </div>
          </form>
        ) : currentRecord ? (
          <div className="campaign-detail">
            {currentRecord.summary && (
              <p className="campaign-detail__summary">{currentRecord.summary}</p>
            )}

            <div className="campaign-detail__layout">
              <div className="campaign-detail__column">
                <Card className="detail-card" aria-label="Dungeon Master panel">
                  <span className="detail-label">Dungeon Master</span>
                  <div className="detail-value" aria-label="Dungeon Master">
                    {dungeonMasters.length > 0
                      ? dungeonMasters.map((assignment) => getUserName(assignment.userId)).join(', ')
                      : 'Unassigned'}
                  </div>
                </Card>

                <Card className="detail-card" aria-label="Party overview">
                  <span className="detail-label">Party</span>
                  {partyMembers.length > 0 ? (
                    <ul className="party-overview" aria-label="Party list">
                      {partyMembers.map((assignment) => (
                        <li key={assignment.id} className="party-overview__item">
                          <span className="party-overview__icon" aria-hidden="true">
                            👤
                          </span>
                          <div>
                            <span className="detail-value">{getUserName(assignment.userId)}</span>
                            <span className="detail-label">{getRoleName(assignment.roleId)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="helper-text">No party members linked yet.</p>
                  )}
                </Card>
              </div>

              <div className="campaign-detail__column campaign-detail__column--players">
                <div className="player-section-header">
                  <h4>Players</h4>
                  <Button
                    onClick={() => {
                      onSelectCampaign?.(currentRecord.id)
                    }}
                    aria-label={`Add character to ${currentRecord.name}`}
                  >
                    + Add character
                  </Button>
                </div>

                {partyMembers.length > 0 ? (
                  <div className="player-card-stack">
                    {partyMembers.map((assignment, index) => {
                      const playerName = getUserName(assignment.userId)
                      const roleName = getRoleName(assignment.roleId)
                      const charactersForPlayer = getCharactersForAssignment(currentRecord.id, assignment.userId)
                      const isDungeonMaster = roleName === 'Dungeon Master'
                      return (
                        <details
                          key={assignment.id}
                          className={classNames(
                            'player-card',
                            index % 2 === 1 && 'player-card--alternate',
                            isDungeonMaster && 'player-card--dm'
                          )}
                          open
                        >
                          <summary>
                            <div className="player-card-header">
                              <div className="player-card-title" aria-label={isDungeonMaster ? 'Dungeon Master' : 'Player'}>
                                <span className="player-icon" aria-hidden="true">
                                  {isDungeonMaster ? '👑' : '👤'}
                                </span>
                                <div>
                                  <span className="player-name">{playerName}</span>
                                  <span className="player-role">{roleName || 'Player'}</span>
                                </div>
                              </div>
                              <div className="player-card-actions">
                                {canManageCurrent && (
                                  <IconButton
                                    label={`Edit ${playerName}`}
                                    onClick={(event) => {
                                      event.preventDefault()
                                      event.stopPropagation()
                                      beginEditRecord()
                                    }}
                                  >
                                    ✏️
                                  </IconButton>
                                )}
                                <IconButton
                                  label={`View ${playerName} profile`}
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    onSelectCampaign?.(currentRecord.id)
                                  }}
                                >
                                  🔍
                                </IconButton>
                              </div>
                            </div>
                          </summary>
                          <div className="player-card-body">
                            <span className="detail-label">Characters</span>
                            {charactersForPlayer.length > 0 ? (
                              <ul className="character-stack">
                                {charactersForPlayer.map((character) => (
                                  <li key={character.id} className="character-card" aria-label="Character">
                                    <span className="character-name">{character.name}</span>
                                    <span className="character-meta">
                                      Level {character.level} · {character.className}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="character-empty" aria-label="Empty character slot">
                                No character selected – add one
                              </div>
                            )}
                          </div>
                        </details>
                      )
                    })}
                  </div>
                ) : (
                  <Card className="detail-card">
                    <p className="helper-text">Invite players to start building their characters.</p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="helper-text">This campaign is no longer available.</p>
        )}
      </RecordDrawer>

      <ConfirmDialog
        open={confirmState.open}
        title="Delete campaign"
        description="Deleting a campaign removes party assignments and progress snapshots."
        detail={confirmState.record?.name}
        confirmLabel="Delete campaign"
        onCancel={closeConfirm}
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}

function CharactersPage({
  characters,
  campaigns,
  currentUserId,
  onSaveCharacter,
  onDeleteCharacter,
  appCampaignId,
  accessibleCampaigns,
  currentCharacterId,
  onSelectCharacter,
  onSelectCampaign
}) {
  const [editor, setEditor] = useState({ open: false, mode: 'create', record: null })
  const [form, setForm] = useState({
    name: '',
    ancestry: '',
    className: '',
    level: 1,
    campaignId: appCampaignId || ''
  })
  const [confirmState, setConfirmState] = useState({ open: false, record: null })

  const myCharacters = useMemo(
    () => characters.filter((character) => character.ownerId === currentUserId),
    [characters, currentUserId]
  )

  const campaignLookup = useMemo(() => {
    const map = new Map()
    campaigns.forEach((campaign) => {
      map.set(campaign.id, campaign.name)
    })
    return map
  }, [campaigns])

  const campaignOptions = useMemo(() => {
    const seen = new Set()
    const options = []

    accessibleCampaigns.forEach((campaign) => {
      if (campaign && !seen.has(campaign.id)) {
        seen.add(campaign.id)
        options.push({ id: campaign.id, name: campaign.name })
      }
    })

    myCharacters.forEach((character) => {
      if (character.campaignId && !seen.has(character.campaignId)) {
        seen.add(character.campaignId)
        options.push({
          id: character.campaignId,
          name: campaignLookup.get(character.campaignId) || 'Current campaign'
        })
      }
    })

    return options
  }, [accessibleCampaigns, myCharacters, campaignLookup])

  useEffect(() => {
    if (!editor.open) {
      setForm((prev) => ({ ...prev, campaignId: appCampaignId || '' }))
    }
  }, [appCampaignId, editor.open])

  const closeEditor = () => {
    setEditor((prev) => ({ ...prev, open: false }))
    setForm({ name: '', ancestry: '', className: '', level: 1, campaignId: appCampaignId || '' })
  }

  const openCreate = () => {
    const defaultCampaign = appCampaignId || (accessibleCampaigns[0]?.id ?? '')
    setForm({ name: '', ancestry: '', className: '', level: 1, campaignId: defaultCampaign })
    setEditor({ open: true, mode: 'create', record: null })
  }

  const openEdit = (record) => {
    setForm({
      name: record.name || '',
      ancestry: record.ancestry || '',
      className: record.className || '',
      level: record.level || 1,
      campaignId: record.campaignId || ''
    })
    setEditor({ open: true, mode: 'edit', record })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const payload = {
      name: form.name.trim(),
      ancestry: form.ancestry.trim(),
      className: form.className.trim(),
      level: Number(form.level) || 1,
      campaignId: form.campaignId || ''
    }

    if (!payload.name) {
      return
    }

    if (editor.mode === 'edit' && editor.record) {
      onSaveCharacter({ ...payload, id: editor.record.id, ownerId: editor.record.ownerId }, 'edit')
    } else {
      onSaveCharacter({ ...payload, ownerId: currentUserId }, 'create')
    }

    closeEditor()
  }

  const requestDelete = (record) => setConfirmState({ open: true, record })
  const closeConfirm = () => setConfirmState({ open: false, record: null })
  const handleConfirmDelete = () => {
    if (confirmState.record) {
      onDeleteCharacter(confirmState.record.id)
    }
    closeConfirm()
  }

  const formId = 'character-record-form'

  const handleSetActive = (character) => {
    onSelectCharacter?.(character.id)
    if (character.campaignId) {
      onSelectCampaign?.(character.campaignId)
    }
  }

  return (
    <section className="characters-page">
      <header className="section-header">
        <div>
          <h2>My characters</h2>
          <p className="section-subtitle">
            Keep your alter egos ready for the next session and align them with the right campaign.
          </p>
        </div>
        <button type="button" className="primary" onClick={openCreate}>
          New character
        </button>
      </header>

      {myCharacters.length === 0 ? (
        <div className="empty-state">
          <h3>No characters yet</h3>
          <p>Create a hero or sidekick to appear in your current adventures.</p>
        </div>
      ) : (
        <div className="character-grid">
          {myCharacters.map((character) => {
            const isCurrent = currentCharacterId === character.id
            const campaignName = character.campaignId
              ? campaignLookup.get(character.campaignId)
              : 'No campaign'

            return (
              <article key={character.id} className="character-card">
                <header className="character-card-header">
                  <div>
                    <h3>{character.name}</h3>
                    <p className="character-subtitle">
                      {character.className || 'Unassigned class'} · Level {character.level || 1}
                    </p>
                  </div>
                  <div className="card-actions">
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => handleSetActive(character)}
                      disabled={isCurrent}
                    >
                      {isCurrent ? 'Active' : 'Set active'}
                    </button>
                    <button type="button" className="ghost" onClick={() => openEdit(character)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="ghost destructive"
                      onClick={() => requestDelete(character)}
                    >
                      Delete
                    </button>
                  </div>
                </header>

                <dl className="character-details">
                  <div>
                    <dt>Ancestry</dt>
                    <dd>{character.ancestry || 'Unknown'}</dd>
                  </div>
                  <div>
                    <dt>Campaign</dt>
                    <dd>{campaignName || 'No campaign'}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>
      )}

      <RecordDrawer
        open={editor.open}
        title={editor.mode === 'edit' ? 'Edit character' : 'Create character'}
        onClose={closeEditor}
        actions={
          <>
            <button type="button" className="ghost" onClick={closeEditor}>
              Cancel
            </button>
            <button type="submit" className="primary" form={formId}>
              {editor.mode === 'edit' ? 'Save' : 'Submit'}
            </button>
          </>
        }
      >
        <form id={formId} className="drawer-form" onSubmit={handleSubmit}>
          <label>
            <span>Character name</span>
            <input
              required
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label>
            <span>Ancestry</span>
            <input
              type="text"
              value={form.ancestry}
              onChange={(event) => setForm((prev) => ({ ...prev, ancestry: event.target.value }))}
            />
          </label>

          <label>
            <span>Class</span>
            <input
              type="text"
              value={form.className}
              onChange={(event) => setForm((prev) => ({ ...prev, className: event.target.value }))}
            />
          </label>

          <label>
            <span>Level</span>
            <input
              type="number"
              min="1"
              value={form.level}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, level: Number(event.target.value) || 1 }))
              }
            />
          </label>

          <label>
            <span>Campaign</span>
            <select
              value={form.campaignId}
              onChange={(event) => setForm((prev) => ({ ...prev, campaignId: event.target.value }))}
            >
              <option value="">No campaign</option>
              {campaignOptions.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
        </form>
      </RecordDrawer>

      <ConfirmDialog
        open={confirmState.open}
        title="Delete character"
        description="This will remove the character from your roster. This action cannot be undone."
        detail={confirmState.record?.name}
        confirmLabel="Delete character"
        onCancel={closeConfirm}
        onConfirm={handleConfirmDelete}
      />
    </section>
  )
}

function PlatformAdmin({
  activeSectionId,
  onSectionChange,
  users,
  roles,
  campaigns,
  permissions,
  onSaveUser,
  onDeleteUser,
  onSaveRole,
  onDeleteRole,
  onSaveCampaign,
  onDeleteCampaign,
  worlds
}) {
  const [userDrawer, setUserDrawer] = useState({ open: false, mode: 'create', record: null })
  const [roleDrawer, setRoleDrawer] = useState({ open: false, mode: 'create', record: null })
  const [campaignDrawer, setCampaignDrawer] = useState({ open: false, mode: 'create', record: null })

  const userFormId = 'user-record-form'
  const roleFormId = 'role-record-form'
  const campaignFormId = 'campaign-record-form'

  const [userForm, setUserForm] = useState({
    displayName: '',
    email: '',
    username: '',
    password: '',
    roles: [],
    status: 'Invited'
  })
  const [roleForm, setRoleForm] = useState({ name: '', description: '' })
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    status: 'Planning',
    summary: '',
    worldId: worlds[0]?.id ?? '',
    assignments: []
  })

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    description: '',
    confirmLabel: '',
    detail: '',
    onConfirm: null
  })

  const worldNameLookup = useMemo(() => {
    const map = new Map()
    worlds.forEach((world) => map.set(world.id, world.name))
    return map
  }, [worlds])

  const worldOptions = useMemo(
    () => worlds.map((world) => ({ id: world.id, name: world.name })),
    [worlds]
  )

  const getWorldName = useCallback(
    (worldId) => worldNameLookup.get(worldId) || 'Unassigned world',
    [worldNameLookup]
  )

  const campaignUserOptions = useMemo(
    () =>
      users.map((user) => ({
        id: user.id,
        name: user.displayName || user.username || 'Unassigned'
      })),
    [users]
  )

  const campaignRoleOptions = useMemo(
    () => roles.map((role) => ({ id: role.id, name: role.name })),
    [roles]
  )

  const closeConfirm = () => {
    setConfirmState({
      open: false,
      title: '',
      description: '',
      confirmLabel: '',
      detail: '',
      onConfirm: null
    })
  }

  const requestDeleteConfirmation = ({ noun, detail, onConfirm }) => {
    const capitalised = noun.charAt(0).toUpperCase() + noun.slice(1)
    setConfirmState({
      open: true,
      title: `Delete ${capitalised}`,
      description: `Are you sure you want to delete this ${noun}? This action cannot be undone.`,
      confirmLabel: `Delete ${noun}`,
      detail: detail || '',
      onConfirm
    })
  }

  const handleRequestDeleteUser = (userId) => {
    const record = users.find((user) => user.id === userId)
    requestDeleteConfirmation({
      noun: 'user',
      detail: record?.displayName,
      onConfirm: () => onDeleteUser(userId)
    })
  }

  const handleRequestDeleteRole = (roleId) => {
    const record = roles.find((role) => role.id === roleId)
    requestDeleteConfirmation({
      noun: 'role',
      detail: record?.name,
      onConfirm: () => onDeleteRole(roleId)
    })
  }

  const handleRequestDeleteCampaign = (campaignId) => {
    const record = campaigns.find((campaign) => campaign.id === campaignId)
    requestDeleteConfirmation({
      noun: 'campaign',
      detail: record?.name,
      onConfirm: () => onDeleteCampaign(campaignId)
    })
  }

  useEffect(() => {
    if (!userDrawer.open) {
      setUserForm({ displayName: '', email: '', username: '', password: '', roles: [], status: 'Invited' })
    }
  }, [userDrawer.open])

  useEffect(() => {
    if (!roleDrawer.open) {
      setRoleForm({ name: '', description: '' })
    }
  }, [roleDrawer.open])

  useEffect(() => {
    if (!campaignDrawer.open) {
      setCampaignForm({
        name: '',
        status: 'Planning',
        summary: '',
        worldId: worlds[0]?.id ?? '',
        assignments: []
      })
    }
  }, [campaignDrawer.open, worlds])

  const openCreateUser = () => {
    setUserDrawer({ open: true, mode: 'create', record: null })
  }

  const openEditUser = (record) => {
    setUserForm({
      displayName: record.displayName,
      email: record.email,
      username: record.username,
      password: '',
      roles: record.roles,
      status: record.status,
      id: record.id
    })
    setUserDrawer({ open: true, mode: 'edit', record })
  }

  const openCreateRole = () => {
    setRoleDrawer({ open: true, mode: 'create', record: null })
  }

  const openEditRole = (record) => {
    setRoleForm({ name: record.name, description: record.description, id: record.id })
    setRoleDrawer({ open: true, mode: 'edit', record })
  }

  const openCreateCampaign = () => {
    setCampaignForm({
      name: '',
      status: 'Planning',
      summary: '',
      worldId: worlds[0]?.id ?? '',
      assignments: []
    })
    setCampaignDrawer({ open: true, mode: 'create', record: null })
  }

  const openEditCampaign = (record) => {
    setCampaignForm({
      id: record.id,
      name: record.name,
      status: record.status,
      summary: record.summary,
      worldId: record.worldId || '',
      assignments: record.assignments.map((assignment) => ({ ...assignment }))
    })
    setCampaignDrawer({ open: true, mode: 'edit', record })
  }

  const closeUserDrawer = () => setUserDrawer((prev) => ({ ...prev, open: false }))
  const closeRoleDrawer = () => setRoleDrawer((prev) => ({ ...prev, open: false }))
  const closeCampaignDrawer = () => setCampaignDrawer((prev) => ({ ...prev, open: false }))

  const userColumns = useMemo(
    () => [
      { id: 'displayName', label: 'Name', accessor: (record) => record.displayName },
      { id: 'email', label: 'Email', accessor: (record) => record.email },
      { id: 'username', label: 'Username', accessor: (record) => record.username },
      {
        id: 'roles',
        label: 'Roles',
        accessor: (record) =>
          record.roles
            .map((roleId) => roles.find((role) => role.id === roleId)?.name || roleId)
            .join(', ') || '—'
      },
      { id: 'status', label: 'Status', accessor: (record) => record.status },
      {
        id: 'updatedAt',
        label: 'Last updated',
        accessor: (record) => new Date(record.updatedAt).toLocaleString()
      }
    ],
    [roles]
  )

  const roleColumns = useMemo(
    () => [
      { id: 'name', label: 'Role name', accessor: (record) => record.name },
      { id: 'description', label: 'Description', accessor: (record) => record.description || '—' },
      {
        id: 'createdAt',
        label: 'Created',
        accessor: (record) => new Date(record.createdAt).toLocaleDateString()
      },
      {
        id: 'updatedAt',
        label: 'Last updated',
        accessor: (record) => new Date(record.updatedAt).toLocaleDateString()
      }
    ],
    []
  )

  const campaignColumns = useMemo(
    () => [
      { id: 'name', label: 'Campaign', accessor: (record) => record.name },
      { id: 'status', label: 'Status', accessor: (record) => record.status },
      { id: 'world', label: 'World', accessor: (record) => getWorldName(record.worldId) },
      {
        id: 'summary',
        label: 'Summary',
        accessor: (record) => record.summary || '—',
        defaultVisible: false
      },
      {
        id: 'assignments',
        label: 'Assignments',
        accessor: (record) => `${record.assignments.length} linked`
      },
      {
        id: 'updatedAt',
        label: 'Last updated',
        accessor: (record) => new Date(record.updatedAt).toLocaleString()
      }
    ],
    [getWorldName]
  )

  const handleSubmitUser = (event) => {
    event.preventDefault()
    onSaveUser(userForm, userDrawer.mode)
    closeUserDrawer()
  }

  const handleSubmitRole = (event) => {
    event.preventDefault()
    onSaveRole(roleForm, roleDrawer.mode)
    closeRoleDrawer()
  }

  const handleSubmitCampaign = (event) => {
    event.preventDefault()
    onSaveCampaign({
      ...campaignForm,
      assignments: campaignForm.assignments.filter((assignment) => assignment.userId && assignment.roleId)
    }, campaignDrawer.mode)
    closeCampaignDrawer()
  }

  const handleAddCampaignAssignment = () => {
    setCampaignForm((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        {
          id: newId('assignment'),
          userId: campaignUserOptions[0]?.id ?? '',
          roleId: campaignRoleOptions[0]?.id ?? ''
        }
      ]
    }))
  }

  const handleUpdateCampaignAssignment = (assignmentId, key, value) => {
    setCampaignForm((prev) => ({
      ...prev,
      assignments: prev.assignments.map((assignment) =>
        assignment.id === assignmentId ? { ...assignment, [key]: value } : assignment
      )
    }))
  }

  const handleRemoveCampaignAssignment = (assignmentId) => {
    if (!window.confirm('Remove this assignment from the campaign?')) return
    setCampaignForm((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((assignment) => assignment.id !== assignmentId)
    }))
  }

  return (
    <div className="platform-admin">
      <div className="section-tabs" role="tablist">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={activeSectionId === section.id}
            className={`section-tab${activeSectionId === section.id ? ' active' : ''}`}
            onClick={() => onSectionChange(section.id)}
          >
            {section.label}
          </button>
        ))}
      </div>

      {activeSectionId === 'users' && (
        <StandardListView
          entityName="User"
          columns={userColumns}
          records={users}
          onCreate={permissions.canManageUsers ? openCreateUser : undefined}
          onEdit={permissions.canManageUsers ? openEditUser : undefined}
          onDelete={permissions.canManageUsers ? handleRequestDeleteUser : undefined}
          emptyMessage="Invite your first adventurer to the platform."
        />
      )}

      {activeSectionId === 'roles' && (
        <StandardListView
          entityName="Role"
          columns={roleColumns}
          records={roles}
          onCreate={permissions.canManageRoles ? openCreateRole : undefined}
          onEdit={permissions.canManageRoles ? openEditRole : undefined}
          onDelete={permissions.canManageRoles ? handleRequestDeleteRole : undefined}
          emptyMessage="Create a role to orchestrate platform access."
        />
      )}

      {activeSectionId === 'campaigns' && (
        <StandardListView
          entityName="Campaign"
          columns={campaignColumns}
          records={campaigns}
          onCreate={permissions.canManageCampaigns ? openCreateCampaign : undefined}
          onEdit={permissions.canManageCampaigns ? openEditCampaign : undefined}
          onDelete={permissions.canManageCampaigns ? handleRequestDeleteCampaign : undefined}
          emptyMessage="Launch your first campaign and assemble a party."
        />
      )}

      <RecordDrawer
        open={userDrawer.open}
        title={userDrawer.mode === 'edit' ? 'Edit user' : 'Invite user'}
        onClose={closeUserDrawer}
        actions={
          <>
            <button type="button" className="ghost" onClick={closeUserDrawer}>
              Cancel
            </button>
            <button type="submit" className="primary" form={userFormId}>
              {userDrawer.mode === 'edit' ? 'Save' : 'Submit'}
            </button>
          </>
        }
      >
        <form id={userFormId} className="drawer-form" onSubmit={handleSubmitUser}>
          <label>
            <span>Display name</span>
            <input
              required
              type="text"
              value={userForm.displayName}
              onChange={(event) => setUserForm((prev) => ({ ...prev, displayName: event.target.value }))}
            />
          </label>

          <label>
            <span>Email</span>
            <input
              required
              type="email"
              value={userForm.email}
              onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          <label>
            <span>Username</span>
            <input
              required
              type="text"
              value={userForm.username}
              onChange={(event) => setUserForm((prev) => ({ ...prev, username: event.target.value }))}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              placeholder={userDrawer.mode === 'edit' ? 'Leave blank to keep current password' : ''}
              required={userDrawer.mode === 'create'}
              value={userForm.password}
              onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={userForm.status}
              onChange={(event) => setUserForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="Invited">Invited</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </label>

          <fieldset className="roles-fieldset">
            <legend>Roles</legend>
            {roles.length === 0 && <p className="helper-text">No roles available yet.</p>}
            {roles.map((role) => {
              const checked = userForm.roles.includes(role.id)
              return (
                <label key={role.id} className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const { checked: isChecked } = event.target
                      setUserForm((prev) => ({
                        ...prev,
                        roles: isChecked
                          ? [...prev.roles, role.id]
                          : prev.roles.filter((roleId) => roleId !== role.id)
                      }))
                    }}
                  />
                  <span>{role.name}</span>
                </label>
              )
            })}
          </fieldset>
        </form>
      </RecordDrawer>

      <RecordDrawer
        open={roleDrawer.open}
        title={roleDrawer.mode === 'edit' ? 'Edit role' : 'Create role'}
        onClose={closeRoleDrawer}
        actions={
          <>
            <button type="button" className="ghost" onClick={closeRoleDrawer}>
              Cancel
            </button>
            <button type="submit" className="primary" form={roleFormId}>
              {roleDrawer.mode === 'edit' ? 'Save' : 'Submit'}
            </button>
          </>
        }
      >
        <form id={roleFormId} className="drawer-form" onSubmit={handleSubmitRole}>
          <label>
            <span>Role name</span>
            <input
              required
              type="text"
              value={roleForm.name}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              rows={4}
              value={roleForm.description}
              onChange={(event) => setRoleForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
        </form>
      </RecordDrawer>

      <RecordDrawer
        open={campaignDrawer.open}
        title={campaignDrawer.mode === 'edit' ? 'Edit campaign' : 'Create campaign'}
        onClose={closeCampaignDrawer}
        actions={
          <>
            <button type="button" className="ghost" onClick={closeCampaignDrawer}>
              Cancel
            </button>
            <button type="submit" className="primary" form={campaignFormId}>
              {campaignDrawer.mode === 'edit' ? 'Save' : 'Submit'}
            </button>
          </>
        }
      >
        <form id={campaignFormId} className="drawer-form" onSubmit={handleSubmitCampaign}>
          <label>
            <span>Campaign name</span>
            <input
              required
              type="text"
              value={campaignForm.name}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>

          <label>
            <span>Status</span>
            <select
              value={campaignForm.status}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </label>

          <label>
            <span>World</span>
            <select
              value={campaignForm.worldId}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, worldId: event.target.value }))}
            >
              <option value="">Unassigned</option>
              {worldOptions.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Summary</span>
            <textarea
              rows={4}
              value={campaignForm.summary}
              onChange={(event) => setCampaignForm((prev) => ({ ...prev, summary: event.target.value }))}
            />
          </label>

          <div className="drawer-subsection">
            <div className="drawer-subsection-header">
              <h4>Assignments</h4>
              <button
                type="button"
                className="ghost"
                onClick={handleAddCampaignAssignment}
                disabled={campaignUserOptions.length === 0 || campaignRoleOptions.length === 0}
              >
                Add assignment
              </button>
            </div>

            {campaignForm.assignments.length === 0 ? (
              <p className="helper-text">Link players and storytellers to the campaign.</p>
            ) : (
              <div className="assignment-table" role="table">
                <div className="assignment-table-header" role="row">
                  <span role="columnheader">Participant</span>
                  <span role="columnheader">Role</span>
                  <span className="assignment-table-actions" role="columnheader">Actions</span>
                </div>
                {campaignForm.assignments.map((assignment) => {
                  const userFieldId = `admin-assignment-${assignment.id}-user`
                  const roleFieldId = `admin-assignment-${assignment.id}-role`
                  return (
                    <div key={assignment.id} className="assignment-table-row" role="row">
                      <label className="sr-only" htmlFor={userFieldId}>
                        Participant
                      </label>
                      <select
                        id={userFieldId}
                        value={assignment.userId}
                        onChange={(event) =>
                          handleUpdateCampaignAssignment(assignment.id, 'userId', event.target.value)
                        }
                      >
                        <option value="">Select user</option>
                        {campaignUserOptions.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                      <label className="sr-only" htmlFor={roleFieldId}>
                        Role
                      </label>
                      <select
                        id={roleFieldId}
                        value={assignment.roleId}
                        onChange={(event) =>
                          handleUpdateCampaignAssignment(assignment.id, 'roleId', event.target.value)
                        }
                      >
                        <option value="">Select role</option>
                        {campaignRoleOptions.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => handleRemoveCampaignAssignment(assignment.id)}
                      >
                        Remove
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </form>
      </RecordDrawer>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        detail={confirmState.detail}
        confirmLabel={confirmState.confirmLabel}
        onCancel={closeConfirm}
        onConfirm={() => {
          if (typeof confirmState.onConfirm === 'function') {
            confirmState.onConfirm()
          }
          closeConfirm()
        }}
      />
    </div>
  )
}

function MyProfile({
  name,
  title,
  email,
  status,
  username,
  roleNames,
  onClose,
  onLogout,
  lastUpdated,
  preferences
}) {
  const displayName = name || 'Unnamed user'
  const displayTitle = title || 'Adventurer'
  const displayEmail = email || '—'
  const displayUsername = username || 'Not assigned'
  const safeRoleNames =
    roleNames && roleNames.length > 0 ? Array.from(new Set(roleNames)) : ['No roles assigned']
  const statusKey = typeof status === 'string' ? status.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'unknown'
  const statusLabel = status || 'Unknown'
  const avatarInitials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'NA'

  const formattedUpdatedAt = lastUpdated
    ? new Date(lastUpdated).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not available'

  const preferenceLanguage = preferences?.language || 'Match system default'
  const preferenceRegion = preferences?.region || 'Not set'
  const preferenceTimezone = preferences?.timezone || 'Not set'

  return (
    <section className="my-profile">
      <header className="profile-header">
        <div>
          <h2>My Profile</h2>
          <p>Keep your personal information up to date and control how other adventurers see you.</p>
        </div>
        <div className="profile-header-actions">
          {typeof onClose === 'function' && (
            <button type="button" className="ghost" onClick={onClose}>
              Back to workspace
            </button>
          )}
          {typeof onLogout === 'function' && (
            <button type="button" className="ghost destructive" onClick={onLogout}>
              Log out
            </button>
          )}
        </div>
      </header>

      <div className="profile-grid">
        <article className="profile-card profile-card--identity">
          <div className="profile-identity">
            <div className="profile-avatar" aria-hidden="true">
              {avatarInitials}
            </div>
            <div>
              <h3>{displayName}</h3>
              <p className="profile-title">{displayTitle}</p>
            </div>
          </div>

          <dl className="profile-meta">
            <div>
              <dt>Status</dt>
              <dd>
                <span className={`status-badge status-${statusKey}`}>{statusLabel}</span>
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{displayEmail}</dd>
            </div>
            <div>
              <dt>Username</dt>
              <dd>{displayUsername}</dd>
            </div>
          </dl>
        </article>

        <article className="profile-card">
          <h3>Roles &amp; access</h3>
          <p className="profile-card-subtitle">You currently have access as:</p>
          <ul className="profile-role-list">
            {safeRoleNames.map((role) => (
              <li key={role}>{role}</li>
            ))}
          </ul>
          <p className="profile-meta-note">Last updated {formattedUpdatedAt}</p>
        </article>

        <article className="profile-card">
          <h3>Preferences</h3>
          <dl className="profile-preferences">
            <div>
              <dt>Language</dt>
              <dd>{preferenceLanguage}</dd>
            </div>
            <div>
              <dt>Region</dt>
              <dd>{preferenceRegion}</dd>
            </div>
            <div>
              <dt>Time zone</dt>
              <dd>{preferenceTimezone}</dd>
            </div>
          </dl>
          <p className="profile-meta-note">Personal settings can be updated at any time.</p>
        </article>
      </div>
    </section>
  )
}

function LoginPage({ onAuthenticate, error, examples, onClearError }) {
  const [formState, setFormState] = useState({ identifier: '', password: '' })
  const [submitted, setSubmitted] = useState(false)

  const identifierError = submitted && !formState.identifier.trim() ? 'Enter your username or email.' : null
  const passwordError = submitted && !formState.password ? 'Enter your password.' : null

  const handleChange = (field) => (event) => {
    const value = event.target.value
    setFormState((previous) => ({ ...previous, [field]: value }))
    if (typeof onClearError === 'function') {
      onClearError()
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)

    const success =
      typeof onAuthenticate === 'function'
        ? onAuthenticate({ identifier: formState.identifier, password: formState.password })
        : false

    if (!success) {
      setFormState((previous) => ({ ...previous, password: '' }))
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <header className="login-card-header">
          <div className="login-brand">DnD Platform</div>
          <h1>Welcome back</h1>
          <p>Sign in to orchestrate epic adventures and manage your campaigns.</p>
        </header>

        {error && (
          <div className="form-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-form-field">
            <label htmlFor="login-identifier">Username or email</label>
            <input
              id="login-identifier"
              type="text"
              autoComplete="username"
              value={formState.identifier}
              onChange={handleChange('identifier')}
              aria-invalid={identifierError ? 'true' : 'false'}
              aria-describedby={identifierError ? 'login-identifier-error' : undefined}
              placeholder="e.g. aelar or aelar@example.com"
            />
            {identifierError && (
              <p id="login-identifier-error" className="field-error">
                {identifierError}
              </p>
            )}
          </div>

          <div className="login-form-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={formState.password}
              onChange={handleChange('password')}
              aria-invalid={passwordError ? 'true' : 'false'}
              aria-describedby={passwordError ? 'login-password-error' : undefined}
              placeholder="Enter your password"
            />
            {passwordError && (
              <p id="login-password-error" className="field-error">
                {passwordError}
              </p>
            )}
          </div>

          <button type="submit" className="primary full-width">
            Sign in
          </button>
        </form>

        {Array.isArray(examples) && examples.length > 0 && (
          <aside className="login-examples" aria-label="Demo credentials">
            <h2>Try a demo account</h2>
            <ul className="login-examples-list">
              {examples.map((example) => (
                <li key={example.id}>
                  <div className="login-example-name">{example.name}</div>
                  <div className="login-example-credentials">
                    <span>
                      <strong>Username:</strong> <code>{example.username}</code>
                    </span>
                    <span>
                      <strong>Password:</strong> <code>{example.password}</code>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </section>
  )
}

function StandardListView({
  entityName,
  columns,
  records,
  onCreate,
  onEdit,
  onDelete,
  emptyMessage
}) {
  const [visibleColumnIds, setVisibleColumnIds] = useState(() =>
    columns
      .filter((column) => column.defaultVisible !== false)
      .map((column) => column.id)
  )
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)

  useEffect(() => {
    setVisibleColumnIds((previous) => {
      const existing = previous.filter((columnId) => columns.some((column) => column.id === columnId))
      const additions = columns
        .filter((column) => column.defaultVisible !== false && !existing.includes(column.id))
        .map((column) => column.id)
      const next = [...existing, ...additions]
      if (next.length === 0 && columns.length > 0) {
        return [columns[0].id]
      }
      return next
    })
  }, [columns])

  const toggleColumnVisibility = (columnId) => {
    setVisibleColumnIds((previous) => {
      const isVisible = previous.includes(columnId)
      if (isVisible) {
        const remaining = previous.filter((id) => id !== columnId)
        return remaining.length > 0 ? remaining : previous
      }
      return [...previous, columnId]
    })
  }

  const renderCellValue = (column, record) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(record)
    }
    if (column.id in record) {
      return record[column.id]
    }
    return '—'
  }

  const visibleColumns = columns.filter((column) => visibleColumnIds.includes(column.id))

  return (
    <section className="standard-list">
      <header className="list-header">
        <div>
          <h2>{entityName} directory</h2>
          <p>Configure and orchestrate {entityName.toLowerCase()}s for the entire platform.</p>
        </div>

        <div className="list-actions">
          <div className="column-visibility">
            <button
              type="button"
              className="ghost"
              onClick={() => setColumnMenuOpen((open) => !open)}
              aria-haspopup="true"
              aria-expanded={columnMenuOpen}
            >
              Columns
            </button>
            {columnMenuOpen && (
              <div className="column-menu" role="menu">
                {columns.map((column) => (
                  <label key={column.id} className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={visibleColumnIds.includes(column.id)}
                      onChange={() => toggleColumnVisibility(column.id)}
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {onCreate && (
            <button type="button" className="primary" onClick={onCreate}>
              New {entityName.toLowerCase()}
            </button>
          )}
        </div>
      </header>

      {records.length === 0 ? (
        <div className="empty-state">
          <h3>No {entityName.toLowerCase()}s yet</h3>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {visibleColumns.map((column) => (
                  <th key={column.id} scope="col">
                    {column.label}
                  </th>
                ))}
                {(onEdit || onDelete) && <th scope="col" className="actions-header">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  {visibleColumns.map((column) => (
                    <td key={column.id}>{renderCellValue(column, record)}</td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="row-actions">
                      {onEdit && (
                        <button type="button" className="ghost" onClick={() => onEdit(record)}>
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          className="ghost destructive"
                          onClick={() => onDelete(record.id)}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ConfirmDialog({ open, title, description, detail, confirmLabel, onCancel, onConfirm }) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const effectiveTitle = title || 'Confirm action'
  const effectiveDescription = description || 'Are you sure you want to continue?'
  const effectiveConfirmLabel = confirmLabel || 'Delete'

  const descriptionId = 'confirm-dialog-description'

  return (
    <div className="confirm-layer">
      <div className="confirm-overlay" onClick={onCancel} />
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={descriptionId}
      >
        <div className="confirm-icon" aria-hidden="true">
          !
        </div>
        <div className="confirm-content">
          <h3 id="confirm-dialog-title">{effectiveTitle}</h3>
          <p id={descriptionId}>{effectiveDescription}</p>
          {detail && (
            <p className="confirm-detail">
              <strong>{detail}</strong>
            </p>
          )}
        </div>
        <div className="confirm-actions">
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary destructive" onClick={onConfirm}>
            {effectiveConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function RecordDrawer({ open, title, onClose, actions, children }) {
  const drawerRef = useRef(null)
  const previouslyFocusedElement = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return undefined

    previouslyFocusedElement.current = document.activeElement

    const node = drawerRef.current
    if (!node) return undefined

    const focusableSelectors =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

    const getFocusable = () =>
      Array.from(node.querySelectorAll(focusableSelectors)).filter(
        (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true'
      )

    const focusFirst = () => {
      const [first] = getFocusable()
      if (first) {
        first.focus()
      } else {
        node.focus({ preventScroll: true })
      }
    }

    focusFirst()

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return
      const focusable = getFocusable()
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', handleKeyDown)

    return () => {
      node.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocusedElement.current && typeof previouslyFocusedElement.current.focus === 'function') {
        previouslyFocusedElement.current.focus()
      }
    }
  }, [open])

  const headingId = useMemo(() => newId('drawer-title'), [])

  if (!open) return null

  return (
    <div className="drawer-layer">
      <div className="drawer-overlay" onClick={onClose} />
      <aside
        ref={drawerRef}
        className="record-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
      >
        <header className="drawer-header">
          <div className="drawer-title">
            <h3 id={headingId}>{title}</h3>
          </div>
          <div className="drawer-header-actions">
            {actions ?? <Button variant="secondary" onClick={onClose}>Close</Button>}
          </div>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  )
}

export default App
