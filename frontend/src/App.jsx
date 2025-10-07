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

const seededNpcs = [
  {
    id: 'npc-leosin',
    name: 'Leosin Erlanthar',
    role: 'Harper Operative',
    demeanor: 'Measured and insightful',
    description: 'A monk of the Harpers piecing together the Cult of the Dragon\'s plans.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    characterIds: ['character-lyra'],
    visibility: 'party',
    tags: ['Harper network', 'Ally'],
    location: 'Greenest refugee camp',
    lastInteractedAt: '2024-04-15T20:05:00Z'
  },
  {
    id: 'npc-rezmir',
    name: 'Rezmir',
    role: 'Black Wyrmspeaker',
    demeanor: 'Cold and ruthless',
    description:
      'Half-dragon tactician orchestrating the movement of hoarded treasure toward the Well of Dragons.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'dm',
    tags: ['Cult of the Dragon', 'Villain'],
    location: 'Skyreach Castle command deck',
    lastInteractedAt: '2024-04-11T09:15:00Z'
  },
  {
    id: 'npc-ontharr',
    name: 'Ontharr Frume',
    role: 'Order of the Gauntlet Paladin',
    demeanor: 'Boisterous and honorable',
    description: 'A forthright paladin coordinating the alliance response to the cult raids.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'public',
    tags: ['Order of the Gauntlet', 'Ally'],
    location: 'Waterdeep chapter house',
    lastInteractedAt: '2024-04-13T17:40:00Z'
  }
]

const seededLocations = [
  {
    id: 'location-greenest',
    name: 'Greenest',
    type: 'Frontier town',
    summary: 'A resilient settlement rebuilding after the opening assault from the cult.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'public',
    tags: ['Rebuilding', 'Refugees'],
    lastScoutedAt: '2024-04-08T14:00:00Z',
    notes: 'Governor Nighthill is coordinating relief efforts and requests additional healers.'
  },
  {
    id: 'location-cult-camp',
    name: 'Cultist Encampment',
    type: 'Hidden encampment',
    summary: 'A covert camp tucked inside the Reaching Woods used to marshal stolen spoils.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    characterIds: ['character-lyra'],
    visibility: 'party',
    tags: ['Stealth', 'Reconnaissance'],
    lastScoutedAt: '2024-04-10T22:00:00Z',
    notes: 'Currently quiet after the raid; scouts report the bulk of forces relocated north.'
  },
  {
    id: 'location-skyreach',
    name: 'Skyreach Castle',
    type: 'Flying fortress',
    summary: 'An ice-carved citadel commandeered by the cult to move tribute swiftly across Faerûn.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'dm',
    tags: ['Mobile stronghold', 'Cult of the Dragon'],
    lastScoutedAt: '2024-04-09T06:00:00Z',
    notes: 'Approach routes are patrolled by wyverns; anchor sigils can be sabotaged from the aerie.'
  }
]

const seededOrganisations = [
  {
    id: 'organisation-harpers',
    name: 'The Harpers',
    alignment: 'Neutral Good',
    summary: 'A network of agents dedicated to preserving balance and sharing vital intelligence.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'public',
    goals: ['Disrupt the Cult of the Dragon supply lines', 'Protect Greenest refugees'],
    influence: 'Covert cells from Baldur\'s Gate to Neverwinter coordinate nightly reports.',
    allies: ['Order of the Gauntlet'],
    enemies: ['Cult of the Dragon'],
    tags: ['Ally network'],
    lastActivityAt: '2024-04-14T10:20:00Z'
  },
  {
    id: 'organisation-cult-of-the-dragon',
    name: 'Cult of the Dragon',
    alignment: 'Lawful Evil',
    summary: 'Fanatics labouring to summon Tiamat through ritual hoarding and ruthless raids.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'dm',
    goals: ['Deliver treasure caravans to the Well of Dragons', 'Recruit chromatic dragons to the cause'],
    influence: 'Cells stretch from the Mere of Dead Men to the Sunset Mountains.',
    allies: ['Red Wizards of Thay'],
    enemies: ['Harpers', 'Emerald Enclave'],
    tags: ['Primary antagonist'],
    lastActivityAt: '2024-04-15T05:45:00Z'
  },
  {
    id: 'organisation-order-of-the-gauntlet',
    name: 'Order of the Gauntlet',
    alignment: 'Lawful Good',
    summary: 'A coalition of zealous knights and clerics sworn to smite the forces of evil.',
    worldId: 'world-faerun',
    campaignIds: ['campaign-tiamat'],
    visibility: 'party',
    goals: ['Fortify Waterdeep against retaliatory strikes', 'Escort refugees toward the north'],
    influence: 'Bastions established along the Coast Way rally local militias.',
    allies: ['The Harpers', 'Emerald Enclave'],
    tags: ['Alliance'],
    lastActivityAt: '2024-04-12T16:30:00Z'
  }
]

const seededRaces = [
  {
    id: 'race-lightfoot-halfling',
    name: 'Lightfoot Halfling',
    description:
      'Lightfoot halflings are nimble and unassuming, easily slipping through crowds or fading from notice.',
    traits: ['Naturally Stealthy', 'Lucky', 'Brave'],
    worldId: 'world-faerun',
    availability: 'Common',
    favoredClasses: ['Bard', 'Rogue'],
    updatedAt: '2024-03-22T12:00:00Z'
  },
  {
    id: 'race-chromatic-dragonborn',
    name: 'Dragonborn (Chromatic)',
    description:
      'Chromatic dragonborn channel the fury of their draconic heritage, commanding elemental breath and resilience.',
    traits: ['Breath Weapon', 'Damage Resistance', 'Intimidating Presence'],
    worldId: 'world-faerun',
    availability: 'Rare',
    favoredClasses: ['Paladin', 'Sorcerer'],
    updatedAt: '2024-04-01T18:30:00Z'
  }
]

const filterKnowledgeRecords = (
  records,
  { isWorldBuilder, campaigns, selectedCampaignId, characters, selectedCharacterId, hasDmRole }
) => {
  if (!Array.isArray(records)) return []

  if (isWorldBuilder) {
    return records.filter(Boolean)
  }

  const campaignScope = selectedCampaignId ? [selectedCampaignId] : campaigns
  const characterScope = selectedCharacterId ? [selectedCharacterId] : characters

  return records.filter((record) => {
    if (!record) return false

    const visibility = (record.visibility || 'campaign').toLowerCase()
    if (visibility === 'dm') {
      return Boolean(hasDmRole)
    }
    if (visibility === 'public') {
      return true
    }

    const recordCampaigns = Array.isArray(record.campaignIds) ? record.campaignIds : []
    const recordCharacters = Array.isArray(record.characterIds) ? record.characterIds : []

    const matchesCampaign =
      recordCampaigns.length === 0
        ? campaignScope.length > 0
        : recordCampaigns.some((id) => campaignScope.includes(id))
    const matchesCharacter =
      recordCharacters.length === 0
        ? false
        : recordCharacters.some((id) => characterScope.includes(id))

    if (visibility === 'character' || visibility === 'personal') {
      return matchesCharacter
    }

    if (visibility === 'party' || visibility === 'campaign') {
      return matchesCampaign || matchesCharacter
    }

    if (visibility === 'private') {
      return matchesCharacter
    }

    return matchesCampaign || matchesCharacter
  })
}

const describeKnowledgeContext = ({
  activeCampaign,
  activeCharacter,
  accessibleCampaigns,
  isWorldBuilder
}) => {
  if (activeCharacter) {
    return activeCampaign
      ? `${activeCharacter.name} · ${activeCampaign.name}`
      : `${activeCharacter.name} (no linked campaign)`
  }

  if (activeCampaign) {
    return `${activeCampaign.name} party knowledge`
  }

  if (isWorldBuilder) {
    return 'All catalogued records across every campaign'
  }

  if (accessibleCampaigns.length > 1) {
    return 'Aggregated knowledge from your active campaigns'
  }

  if (accessibleCampaigns.length === 1) {
    return `${accessibleCampaigns[0].name} party knowledge`
  }

  return 'Select a campaign or character from the header to focus the view'
}

const describeRecordAudience = (record, { campaignLookup, characterLookup }) => {
  const visibility = (record.visibility || 'campaign').toLowerCase()

  if (visibility === 'public') {
    return 'All adventurers'
  }
  if (visibility === 'dm') {
    return 'Dungeon Masters'
  }

  const campaignNames = (Array.isArray(record.campaignIds) ? record.campaignIds : [])
    .map((id) => campaignLookup.get(id))
    .filter(Boolean)
  const characterNames = (Array.isArray(record.characterIds) ? record.characterIds : [])
    .map((id) => characterLookup.get(id))
    .filter(Boolean)

  if ((visibility === 'character' || visibility === 'personal') && characterNames.length > 0) {
    return characterNames.join(', ')
  }

  if (campaignNames.length > 0) {
    return campaignNames.join(', ')
  }

  if (characterNames.length > 0) {
    return characterNames.join(', ')
  }

  return 'Party members with access'
}

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
    description: 'Curate worlds, lore, and locations that power your campaigns.',
    requiredRoleNames: ['World Admin', 'System Administrator'],
    path: '/worlds'
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    description: 'Coordinate the adventures you are part of and align your party context.',
    path: '/campaigns'
  },
  {
    id: 'characters',
    label: 'Characters',
    description: 'Manage your roster of heroes, sidekicks, and alter egos across worlds.',
    path: '/characters'
  },
  {
    id: 'npcs',
    label: 'NPCs',
    description: 'Track allies, rivals, and mysteries that your parties uncover.',
    path: '/npcs',
    requiresCampaignAccess: true,
    allowedCampaignRoles: ['Player', 'Dungeon Master'],
    allowWorldBuilder: true
  },
  {
    id: 'locations',
    label: 'Locations',
    description: 'Maintain field intel on the important places in your worlds.',
    path: '/locations',
    requiresCampaignAccess: true,
    allowedCampaignRoles: ['Player', 'Dungeon Master'],
    allowWorldBuilder: true
  },
  {
    id: 'organisations',
    label: 'Organisations',
    description: 'Understand the factions shaping your campaign politics.',
    path: '/organisations',
    requiresCampaignAccess: true,
    allowedCampaignRoles: ['Player', 'Dungeon Master'],
    allowWorldBuilder: true
  },
  {
    id: 'races',
    label: 'Ancestries',
    description: 'Curate the lineages and cultures available across your multiverse.',
    requiredRoleNames: ['World Admin', 'System Administrator'],
    path: '/races'
  },
  {
    id: 'platform-admin',
    label: 'Platform Admin',
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
  const classes = classNames('ui-badge', `ui-badge--${variant}`, className)
  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}

function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...props
}) {
  const resolvedVariant = variant === 'ghost' ? 'secondary' : variant
  const classes = classNames('ui-button', `ui-button--${resolvedVariant}`, `ui-button--${size}`, className)
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  )
}

function IconButton({ label, variant = 'icon', className = '', children, ...props }) {
  const classes = classNames('ui-button', `ui-button--${variant}`, 'ui-button--icon', className)
  return (
    <button type="button" className={classes} aria-label={label} {...props}>
      {children}
    </button>
  )
}

function Card({ variant = 'default', className = '', children, ...props }) {
  const classes = classNames('ui-card', `ui-card--${variant}`, className)
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

function EmptyState({ icon, title, description, action, children, className = '' }) {
  return (
    <div className={classNames('ui-empty-state', className)}>
      {icon && (
        <div className="ui-empty-state__icon" aria-hidden="true">
          {icon}
        </div>
      )}
      {title && <h3>{title}</h3>}
      {description && <p>{description}</p>}
      {action}
      {children}
    </div>
  )
}

function HomePage({ onEnterWorkspace }) {
  return (
    <section className="home-page">
      <div className="home-hero">
        <h1>Welcome to DND Shared Space</h1>
        <p>
          Choose an area from the navigation to manage your worlds, campaigns, and characters.
        </p>
        <div className="home-actions">
          <Button variant="primary" size="lg" onClick={onEnterWorkspace}>
            Enter workspace
          </Button>
        </div>
      </div>
    </section>
  )
}

function NpcDirectory({
  records,
  totalCount,
  contextDescription,
  showContextPrompt,
  hasDmVision,
  isWorldBuilder,
  campaignLookup,
  characterLookup,
  worldLookup,
  activeCampaign,
  activeCharacter,
  characterCount
}) {
  const emptyDescription = showContextPrompt
    ? 'Pick a campaign or character from the header to reveal NPCs tied to them.'
    : 'No NPCs have been catalogued for this context yet.'

  const npcColumns = useMemo(
    () => [
      { id: 'name', label: 'Name', accessor: (npc) => npc.name },
      { id: 'role', label: 'Role', accessor: (npc) => npc.role || '—' },
      { id: 'demeanor', label: 'Disposition', accessor: (npc) => npc.demeanor || '—', defaultVisible: false },
      {
        id: 'world',
        label: 'World',
        accessor: (npc) => worldLookup.get(npc.worldId) || 'Unassigned world',
        filterValue: (npc) => worldLookup.get(npc.worldId) || ''
      },
      {
        id: 'visibility',
        label: 'Visibility',
        accessor: (npc) => describeRecordAudience(npc, { campaignLookup, characterLookup })
      },
      {
        id: 'campaigns',
        label: 'Campaigns',
        accessor: (npc) =>
          (Array.isArray(npc.campaignIds)
            ? npc.campaignIds
                .map((id) => campaignLookup.get(id) || id)
                .filter(Boolean)
                .join(', ')
            : '') || '—',
        defaultVisible: false
      },
      {
        id: 'tags',
        label: 'Tags',
        accessor: (npc) => (Array.isArray(npc.tags) ? npc.tags.join(', ') : '—'),
        defaultVisible: false
      },
      {
        id: 'location',
        label: 'Current lead',
        accessor: (npc) => npc.location || '—'
      },
      {
        id: 'lastInteractedAt',
        label: 'Last seen',
        accessor: (npc) => formatRelativeTime(npc.lastInteractedAt),
        filterValue: (npc) => npc.lastInteractedAt || ''
      }
    ],
    [campaignLookup, characterLookup, worldLookup]
  )

  const contextLabel = showContextPrompt ? (
    <p className="knowledge-context-label">
      Select a campaign{characterCount > 0 ? ' or character' : ''} in the header to focus these results.
    </p>
  ) : (activeCampaign || activeCharacter) ? (
    <p className="knowledge-context-label">
      Viewing through <strong>{activeCharacter ? activeCharacter.name : activeCampaign?.name}</strong>.
    </p>
  ) : null

  return (
    <StandardListView
      entityName="NPC"
      heading="NPC compendium"
      description={contextDescription}
      columns={npcColumns}
      records={records}
      totalCount={totalCount}
      emptyTitle="No NPCs visible"
      emptyMessage={emptyDescription}
      filterEmptyMessage="No NPCs match the current filters."
      enableFilters
      badge={({ filteredCount }) => (
        <span className="list-chip">{filteredCount} / {totalCount} visible</span>
      )}
      information={contextLabel}
      note={
        !isWorldBuilder && hasDmVision ? (
          <p className="knowledge-dm-note">You are seeing entries flagged for Dungeon Masters in this context.</p>
        ) : null
      }
    />
  )
}

function LocationsAtlas({
  records,
  totalCount,
  contextDescription,
  showContextPrompt,
  campaignLookup,
  characterLookup,
  worldLookup,
  activeCampaign,
  activeCharacter,
  characterCount,
  hasDmVision,
  isWorldBuilder
}) {
  const emptyDescription = showContextPrompt
    ? 'Set a campaign or character context to reveal scouting intel.'
    : 'No locations have been recorded for this context yet.'

  const locationColumns = useMemo(
    () => [
      { id: 'name', label: 'Location', accessor: (location) => location.name },
      { id: 'type', label: 'Type', accessor: (location) => location.type || '—' },
      {
        id: 'world',
        label: 'World',
        accessor: (location) => worldLookup.get(location.worldId) || 'Unassigned world',
        filterValue: (location) => worldLookup.get(location.worldId) || ''
      },
      {
        id: 'visibility',
        label: 'Visibility',
        accessor: (location) => describeRecordAudience(location, { campaignLookup, characterLookup })
      },
      {
        id: 'campaigns',
        label: 'Campaigns',
        accessor: (location) =>
          (Array.isArray(location.campaignIds)
            ? location.campaignIds
                .map((id) => campaignLookup.get(id) || id)
                .filter(Boolean)
                .join(', ')
            : '') || '—',
        defaultVisible: false
      },
      {
        id: 'tags',
        label: 'Tags',
        accessor: (location) => (Array.isArray(location.tags) ? location.tags.join(', ') : '—'),
        defaultVisible: false
      },
      {
        id: 'summary',
        label: 'Summary',
        accessor: (location) => location.summary || '—',
        defaultVisible: false
      },
      {
        id: 'notes',
        label: 'Field notes',
        accessor: (location) => location.notes || '—',
        defaultVisible: false
      },
      {
        id: 'lastScoutedAt',
        label: 'Last scouted',
        accessor: (location) => formatRelativeTime(location.lastScoutedAt),
        filterValue: (location) => location.lastScoutedAt || ''
      }
    ],
    [campaignLookup, characterLookup, worldLookup]
  )

  const contextLabel = showContextPrompt ? (
    <p className="knowledge-context-label">
      Choose a campaign{characterCount > 0 ? ' or character' : ''} to narrow the field reports.
    </p>
  ) : (activeCampaign || activeCharacter) ? (
    <p className="knowledge-context-label">
      Focused on <strong>{activeCharacter ? activeCharacter.name : activeCampaign?.name}</strong>.
    </p>
  ) : null

  return (
    <StandardListView
      entityName="Location"
      heading="Location atlas"
      description={contextDescription}
      columns={locationColumns}
      records={records}
      totalCount={totalCount}
      emptyTitle="No locations logged"
      emptyMessage={emptyDescription}
      filterEmptyMessage="No locations match the current filters."
      enableFilters
      badge={({ filteredCount }) => (
        <span className="list-chip">{filteredCount} / {totalCount} visible</span>
      )}
      information={contextLabel}
      note={
        !isWorldBuilder && hasDmVision ? (
          <p className="knowledge-dm-note">DM-only entries are included because of your campaign role.</p>
        ) : null
      }
    />
  )
}

function OrganisationsLedger({
  records,
  totalCount,
  contextDescription,
  showContextPrompt,
  campaignLookup,
  characterLookup,
  worldLookup,
  activeCampaign,
  activeCharacter,
  characterCount,
  hasDmVision,
  isWorldBuilder
}) {
  const emptyDescription = showContextPrompt
    ? 'Select a campaign or character to reveal the factions relevant to them.'
    : 'No organisations have been catalogued for this context yet.'

  const organisationColumns = useMemo(
    () => [
      { id: 'name', label: 'Organisation', accessor: (organisation) => organisation.name },
      { id: 'alignment', label: 'Alignment', accessor: (organisation) => organisation.alignment || '—' },
      {
        id: 'world',
        label: 'World',
        accessor: (organisation) => worldLookup.get(organisation.worldId) || 'Unassigned world',
        filterValue: (organisation) => worldLookup.get(organisation.worldId) || ''
      },
      {
        id: 'visibility',
        label: 'Visibility',
        accessor: (organisation) => describeRecordAudience(organisation, { campaignLookup, characterLookup })
      },
      {
        id: 'campaigns',
        label: 'Campaigns',
        accessor: (organisation) =>
          (Array.isArray(organisation.campaignIds)
            ? organisation.campaignIds
                .map((id) => campaignLookup.get(id) || id)
                .filter(Boolean)
                .join(', ')
            : '') || '—',
        defaultVisible: false
      },
      {
        id: 'summary',
        label: 'Summary',
        accessor: (organisation) => organisation.summary || '—',
        defaultVisible: false
      },
      {
        id: 'goals',
        label: 'Goals',
        accessor: (organisation) => (Array.isArray(organisation.goals) ? organisation.goals.join(', ') : '—'),
        defaultVisible: false
      },
      {
        id: 'influence',
        label: 'Influence',
        accessor: (organisation) => organisation.influence || '—',
        defaultVisible: false
      },
      {
        id: 'allies',
        label: 'Allies',
        accessor: (organisation) => (Array.isArray(organisation.allies) ? organisation.allies.join(', ') : '—'),
        defaultVisible: false
      },
      {
        id: 'enemies',
        label: 'Adversaries',
        accessor: (organisation) => (Array.isArray(organisation.enemies) ? organisation.enemies.join(', ') : '—'),
        defaultVisible: false
      },
      {
        id: 'tags',
        label: 'Tags',
        accessor: (organisation) => (Array.isArray(organisation.tags) ? organisation.tags.join(', ') : '—'),
        defaultVisible: false
      },
      {
        id: 'lastActivityAt',
        label: 'Last activity',
        accessor: (organisation) => formatRelativeTime(organisation.lastActivityAt),
        filterValue: (organisation) => organisation.lastActivityAt || ''
      }
    ],
    [campaignLookup, characterLookup, worldLookup]
  )

  const contextLabel = showContextPrompt ? (
    <p className="knowledge-context-label">
      Focus a campaign{characterCount > 0 ? ' or character' : ''} to see faction intel tailored to them.
    </p>
  ) : (activeCampaign || activeCharacter) ? (
    <p className="knowledge-context-label">
      Focused on <strong>{activeCharacter ? activeCharacter.name : activeCampaign?.name}</strong>.
    </p>
  ) : null

  return (
    <StandardListView
      entityName="Organisation"
      heading="Faction ledger"
      description={contextDescription}
      columns={organisationColumns}
      records={records}
      totalCount={totalCount}
      emptyTitle="No organisations logged"
      emptyMessage={emptyDescription}
      filterEmptyMessage="No organisations match the current filters."
      enableFilters
      badge={({ filteredCount }) => (
        <span className="list-chip">{filteredCount} / {totalCount} visible</span>
      )}
      information={contextLabel}
      note={
        !isWorldBuilder && hasDmVision ? (
          <p className="knowledge-dm-note">DM-only faction intel is included because of your permissions.</p>
        ) : null
      }
    />
  )
}

function RaceLibrary({ records, totalCount, contextDescription, worldLookup }) {
  const raceColumns = useMemo(
    () => [
      { id: 'name', label: 'Ancestry', accessor: (race) => race.name },
      { id: 'availability', label: 'Availability', accessor: (race) => race.availability || '—' },
      {
        id: 'world',
        label: 'World',
        accessor: (race) => worldLookup.get(race.worldId) || 'Unassigned world',
        filterValue: (race) => worldLookup.get(race.worldId) || ''
      },
      {
        id: 'favoredClasses',
        label: 'Favoured classes',
        accessor: (race) => (Array.isArray(race.favoredClasses) ? race.favoredClasses.join(', ') : '—'),
        defaultVisible: false
      },
      {
        id: 'traits',
        label: 'Signature traits',
        accessor: (race) => (Array.isArray(race.traits) ? race.traits.join(', ') : '—'),
        defaultVisible: false
      },
      {
        id: 'description',
        label: 'Description',
        accessor: (race) => race.description || '—',
        defaultVisible: false
      },
      {
        id: 'updatedAt',
        label: 'Last updated',
        accessor: (race) => formatRelativeTime(race.updatedAt),
        filterValue: (race) => race.updatedAt || ''
      }
    ],
    [worldLookup]
  )

  return (
    <StandardListView
      entityName="Ancestry"
      heading="Ancestry library"
      description={contextDescription}
      columns={raceColumns}
      records={records}
      totalCount={totalCount}
      emptyTitle="No ancestries curated"
      emptyMessage="Add your first ancestry to make it available to campaign builders."
      filterEmptyMessage="No ancestries match the current filters."
      enableFilters
      badge={({ filteredCount }) => (
        <span className="list-chip">{filteredCount} / {totalCount} available</span>
      )}
    />
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
  const [npcs, setNpcs] = useState(() => (Array.isArray(storedState?.npcs) ? storedState.npcs : seededNpcs))
  const [locations, setLocations] = useState(() =>
    Array.isArray(storedState?.locations) ? storedState.locations : seededLocations
  )
  const [organisations, setOrganisations] = useState(() =>
    Array.isArray(storedState?.organisations) ? storedState.organisations : seededOrganisations
  )
  const [races] = useState(() => (Array.isArray(storedState?.races) ? storedState.races : seededRaces))
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

  const isWorldBuilder = useMemo(
    () => isSystemAdmin || assignedRoleNames.includes('World Admin'),
    [isSystemAdmin, assignedRoleNames]
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

  const campaignRoleNames = useMemo(() => {
    if (!authenticatedUserId) return []
    const names = new Set()
    accessibleCampaigns.forEach((campaign) => {
      if (!Array.isArray(campaign.assignments)) return
      campaign.assignments.forEach((assignment) => {
        if (assignment.userId === authenticatedUserId) {
          const roleName = roles.find((role) => role.id === assignment.roleId)?.name
          if (roleName) {
            names.add(roleName)
          }
        }
      })
    })
    return Array.from(names)
  }, [accessibleCampaigns, authenticatedUserId, roles])

  const hasDmVision = useMemo(
    () => isWorldBuilder || campaignRoleNames.includes('Dungeon Master'),
    [isWorldBuilder, campaignRoleNames]
  )

  const accessibleCampaignIds = useMemo(
    () => accessibleCampaigns.map((campaign) => campaign.id),
    [accessibleCampaigns]
  )

  const accessibleCharacterIds = useMemo(() => myCharacters.map((character) => character.id), [myCharacters])

  const selectedCampaignId = useMemo(() => {
    if (!appContext.campaignId) return ''
    if (isWorldBuilder) return appContext.campaignId
    return accessibleCampaignIds.includes(appContext.campaignId) ? appContext.campaignId : ''
  }, [appContext.campaignId, accessibleCampaignIds, isWorldBuilder])

  const selectedCharacterId = useMemo(() => {
    if (!appContext.characterId) return ''
    if (isWorldBuilder) return appContext.characterId
    return accessibleCharacterIds.includes(appContext.characterId) ? appContext.characterId : ''
  }, [appContext.characterId, accessibleCharacterIds, isWorldBuilder])

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  )

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId) || null,
    [characters, selectedCharacterId]
  )

  const visibleNpcs = useMemo(() => {
    const filtered = filterKnowledgeRecords(npcs, {
      isWorldBuilder,
      campaigns: accessibleCampaignIds,
      selectedCampaignId,
      characters: accessibleCharacterIds,
      selectedCharacterId,
      hasDmRole: hasDmVision
    })
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [
    npcs,
    isWorldBuilder,
    accessibleCampaignIds,
    selectedCampaignId,
    accessibleCharacterIds,
    selectedCharacterId,
    hasDmVision
  ])

  const visibleLocations = useMemo(() => {
    const filtered = filterKnowledgeRecords(locations, {
      isWorldBuilder,
      campaigns: accessibleCampaignIds,
      selectedCampaignId,
      characters: accessibleCharacterIds,
      selectedCharacterId,
      hasDmRole: hasDmVision
    })
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [
    locations,
    isWorldBuilder,
    accessibleCampaignIds,
    selectedCampaignId,
    accessibleCharacterIds,
    selectedCharacterId,
    hasDmVision
  ])

  const visibleOrganisations = useMemo(() => {
    const filtered = filterKnowledgeRecords(organisations, {
      isWorldBuilder,
      campaigns: accessibleCampaignIds,
      selectedCampaignId,
      characters: accessibleCharacterIds,
      selectedCharacterId,
      hasDmRole: hasDmVision
    })
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  }, [
    organisations,
    isWorldBuilder,
    accessibleCampaignIds,
    selectedCampaignId,
    accessibleCharacterIds,
    selectedCharacterId,
    hasDmVision
  ])

  const sortedRaces = useMemo(() => [...races].sort((a, b) => a.name.localeCompare(b.name)), [races])

  const knowledgeContextDescription = useMemo(
    () =>
      describeKnowledgeContext({
        activeCampaign: selectedCampaign,
        activeCharacter: selectedCharacter,
        accessibleCampaigns,
        isWorldBuilder
      }),
    [selectedCampaign, selectedCharacter, accessibleCampaigns, isWorldBuilder]
  )

  const shouldPromptForContext = useMemo(
    () => !isWorldBuilder && accessibleCampaigns.length > 0 && !selectedCampaign && !selectedCharacter,
    [isWorldBuilder, accessibleCampaigns, selectedCampaign, selectedCharacter]
  )

  const campaignLookup = useMemo(() => {
    const map = new Map()
    campaigns.forEach((campaign) => map.set(campaign.id, campaign.name))
    return map
  }, [campaigns])

  const characterLookup = useMemo(() => {
    const map = new Map()
    characters.forEach((character) => map.set(character.id, character.name))
    return map
  }, [characters])

  const worldLookup = useMemo(() => {
    const map = new Map()
    worlds.forEach((world) => map.set(world.id, world.name))
    return map
  }, [worlds])

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
      npcs,
      locations,
      organisations,
      races,
      session,
      appContext,
      ui: { sidebarPinned }
    })
  }, [
    users,
    roles,
    campaigns,
    worlds,
    characters,
    npcs,
    locations,
    organisations,
    races,
    session,
    appContext,
    sidebarPinned
  ])

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
          const matchesRole = module.requiredRoleNames.some((roleName) => assignedRoleNames.includes(roleName))
          if (!matchesRole && !(module.allowWorldBuilder && isWorldBuilder)) {
            return false
          }
        }
        if (Array.isArray(module.allowedCampaignRoles) && module.allowedCampaignRoles.length > 0) {
          const matchesCampaignRole = module.allowedCampaignRoles.some((roleName) =>
            campaignRoleNames.includes(roleName)
          )
          if (!matchesCampaignRole && !isWorldBuilder) {
            return false
          }
        }
        if (module.requiresCampaignAccess) {
          if (isWorldBuilder) {
            return true
          }
          return accessibleCampaigns.length > 0
        }
        return true
      }),
    [permissions, assignedRoleNames, campaignRoleNames, accessibleCampaigns, isWorldBuilder]
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
    setNpcs((prev) =>
      prev.map((npc) => {
        if (!Array.isArray(npc.campaignIds)) return npc
        const nextCampaignIds = npc.campaignIds.filter((id) => id !== campaignId)
        if (nextCampaignIds.length === npc.campaignIds.length) return npc
        return { ...npc, campaignIds: nextCampaignIds }
      })
    )
    setLocations((prev) =>
      prev.map((location) => {
        if (!Array.isArray(location.campaignIds)) return location
        const nextCampaignIds = location.campaignIds.filter((id) => id !== campaignId)
        if (nextCampaignIds.length === location.campaignIds.length) return location
        return { ...location, campaignIds: nextCampaignIds }
      })
    )
    setOrganisations((prev) =>
      prev.map((organisation) => {
        if (!Array.isArray(organisation.campaignIds)) return organisation
        const nextCampaignIds = organisation.campaignIds.filter((id) => id !== campaignId)
        if (nextCampaignIds.length === organisation.campaignIds.length) return organisation
        return { ...organisation, campaignIds: nextCampaignIds }
      })
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
    setNpcs((prev) =>
      prev.map((npc) => {
        if (!Array.isArray(npc.characterIds) || npc.characterIds.length === 0) return npc
        const nextCharacterIds = npc.characterIds.filter((id) => id !== characterId)
        if (nextCharacterIds.length === npc.characterIds.length) return npc
        return { ...npc, characterIds: nextCharacterIds }
      })
    )
    setLocations((prev) =>
      prev.map((location) => {
        if (!Array.isArray(location.characterIds) || location.characterIds.length === 0) {
          return location
        }
        const nextCharacterIds = location.characterIds.filter((id) => id !== characterId)
        if (nextCharacterIds.length === location.characterIds.length) return location
        return { ...location, characterIds: nextCharacterIds }
      })
    )
    setOrganisations((prev) =>
      prev.map((organisation) => {
        if (!Array.isArray(organisation.characterIds) || organisation.characterIds.length === 0) {
          return organisation
        }
        const nextCharacterIds = organisation.characterIds.filter((id) => id !== characterId)
        if (nextCharacterIds.length === organisation.characterIds.length) return organisation
        return { ...organisation, characterIds: nextCharacterIds }
      })
    )
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

  if (currentPath === '/') {
    mainContent = <HomePage onEnterWorkspace={() => navigate(defaultModulePath)} />
  } else if (currentPath === '/profile') {
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
        onSaveCharacter={handleSaveCharacter}
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
  } else if (pathMatches(currentPath, '/npcs')) {
    mainContent = (
      <NpcDirectory
        records={visibleNpcs}
        totalCount={npcs.length}
        contextDescription={knowledgeContextDescription}
        showContextPrompt={shouldPromptForContext}
        hasDmVision={hasDmVision}
        isWorldBuilder={isWorldBuilder}
        campaignLookup={campaignLookup}
        characterLookup={characterLookup}
        worldLookup={worldLookup}
        activeCampaign={selectedCampaign}
        activeCharacter={selectedCharacter}
        characterCount={myCharacters.length}
      />
    )
  } else if (pathMatches(currentPath, '/locations')) {
    mainContent = (
      <LocationsAtlas
        records={visibleLocations}
        totalCount={locations.length}
        contextDescription={knowledgeContextDescription}
        showContextPrompt={shouldPromptForContext}
        campaignLookup={campaignLookup}
        characterLookup={characterLookup}
        worldLookup={worldLookup}
        activeCampaign={selectedCampaign}
        activeCharacter={selectedCharacter}
        characterCount={myCharacters.length}
        hasDmVision={hasDmVision}
        isWorldBuilder={isWorldBuilder}
      />
    )
  } else if (pathMatches(currentPath, '/organisations')) {
    mainContent = (
      <OrganisationsLedger
        records={visibleOrganisations}
        totalCount={organisations.length}
        contextDescription={knowledgeContextDescription}
        showContextPrompt={shouldPromptForContext}
        campaignLookup={campaignLookup}
        characterLookup={characterLookup}
        worldLookup={worldLookup}
        activeCampaign={selectedCampaign}
        activeCharacter={selectedCharacter}
        characterCount={myCharacters.length}
        hasDmVision={hasDmVision}
        isWorldBuilder={isWorldBuilder}
      />
    )
  } else if (pathMatches(currentPath, '/races')) {
    mainContent = (
      <RaceLibrary
        records={sortedRaces}
        totalCount={races.length}
        contextDescription={knowledgeContextDescription}
        worldLookup={worldLookup}
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
            <button
              type="button"
              className="brand-home-link"
              onClick={() => {
                setSidebarMobileOpen(false)
                setProfileMenuOpen(false)
                navigate('/')
              }}
              aria-label="Go to home"
            >
              <span className="brand-title">DND Shared Space</span>
            </button>
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
              const moduleInitial = module.label.charAt(0).toUpperCase()
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
                    {moduleInitial}
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
            <article
              key={world.id}
              className="world-card world-card-clickable"
              role="button"
              tabIndex={0}
              aria-label={`Open ${world.name}`}
              onClick={() => openEdit(world)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openEdit(world)
                }
              }}
            >
              <header className="world-card-header">
                <div>
                  <h3>{world.name}</h3>
                  {world.tagline && <p className="world-tagline">{world.tagline}</p>}
                </div>
                <div className="card-actions">
                  <button
                    type="button"
                    className="ghost destructive"
                    onClick={(event) => {
                      event.stopPropagation()
                      requestDelete(world)
                    }}
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
  onSaveCharacter,
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
  const [characterModal, setCharacterModal] = useState({
    open: false,
    ownerId: '',
    campaignId: '',
    name: '',
    className: '',
    level: 1,
    ancestry: ''
  })

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
    resetCharacterModal()
  }

  const closeRecord = () => {
    if (typeof onRouteChange === 'function') {
      onRouteChange(null)
    }
    setRecordDrawer({ open: false, recordId: null, editing: false })
    resetCharacterModal()
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

  const resetCharacterModal = () =>
    setCharacterModal({
      open: false,
      ownerId: '',
      campaignId: '',
      name: '',
      className: '',
      level: 1,
      ancestry: ''
    })

  const openCharacterModal = (campaignId, ownerId = '') => {
    setCharacterModal({
      open: true,
      ownerId: ownerId || '',
      campaignId,
      name: '',
      className: '',
      level: 1,
      ancestry: ''
    })
  }

  const closeCharacterModal = () => {
    resetCharacterModal()
  }

  const handleCharacterFieldChange = (key, value) => {
    setCharacterModal((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmitCharacterModal = (event) => {
    event.preventDefault()
    if (!characterModal.campaignId) return

    const payload = {
      name: characterModal.name.trim(),
      className: characterModal.className.trim(),
      level: Number(characterModal.level) || 1,
      ancestry: characterModal.ancestry.trim(),
      campaignId: characterModal.campaignId,
      ownerId: characterModal.ownerId || currentUserId
    }

    if (!payload.name || !payload.className) {
      return
    }

    onSaveCharacter?.(payload, 'create')
    resetCharacterModal()
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
      <div className="campaign-panel__heading">
        <div className="campaign-panel__heading-main">
          <span className="campaign-panel__heading-title">{currentRecord.name}</span>
          <Badge variant={statusVariantFromStatus(currentRecord.status)}>
            {describeStatus(currentRecord.status)}
          </Badge>
        </div>
        <div className="campaign-panel__heading-meta" aria-live="polite">
          <span className="campaign-panel__heading-meta-item">{getWorldName(currentRecord.worldId)}</span>
          <span className="campaign-panel__heading-meta-item">Updated {formatRelativeTime(currentRecord.updatedAt)}</span>
        </div>
      </div>
    )

  const formatCardTimestamp = (value) => formatRelativeTime(value)

  const { dungeonMasters, partyMembers } = useMemo(() => {
    if (!currentRecord) {
      return { dungeonMasters: [], partyMembers: [] }
    }
    return splitAssignments(currentRecord)
  }, [currentRecord, splitAssignments])

  const modalCampaignName = useMemo(() => {
    if (characterModal.campaignId) {
      const matched = accessibleCampaigns.find((campaign) => campaign.id === characterModal.campaignId)
      if (matched) {
        return matched.name
      }
    }
    return currentRecord?.name || ''
  }, [characterModal.campaignId, accessibleCampaigns, currentRecord])

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
  const characterFormId = 'campaign-character-form'

  return (
    <section className="campaigns-page">
      <header className="campaigns-page__header">
        <div>
          <h2 className="page-title">Campaigns</h2>
          <p className="page-subtitle">
            View the adventures you belong to and keep your party assignments current.
          </p>
        </div>
        {canCreateCampaigns && (
          <Button variant="primary" onClick={openCreate} aria-label="Create a new campaign">
            New campaign
          </Button>
        )}
      </header>

      {sortedCampaigns.length === 0 ? (
        <EmptyState
          icon="🧙"
          title="You’re not part of any campaigns yet."
          description="Create a campaign to gather your party and begin adventuring."
          action={
            canCreateCampaigns ? (
              <Button variant="primary" onClick={openCreate} aria-label="Create your first campaign">
                + Create campaign
              </Button>
            ) : null
          }
          className="campaigns-page__empty"
        />
      ) : (
        <div className="campaigns-grid">
          {sortedCampaigns.map((campaign) => {
            const isCurrent = currentCampaignId === campaign.id
            const { dungeonMasters: cardDMs, partyMembers: cardParty } = splitAssignments(campaign)
            const dmNames = cardDMs.map((assignment) => getUserName(assignment.userId)).filter(Boolean)
            const partyNames = cardParty.map((assignment) => getUserName(assignment.userId)).filter(Boolean)
            const partyPreview = partyNames.slice(0, 3)
            const remaining = Math.max(0, partyNames.length - partyPreview.length)
            return (
              <Card
                key={campaign.id}
                variant="elevated"
                className={classNames('campaign-card', isCurrent && 'campaign-card--active')}
              >
                <div className="campaign-card__header">
                  <div className="campaign-card__title-group">
                    <h3 className="campaign-card__title">{campaign.name}</h3>
                    <Badge variant={statusVariantFromStatus(campaign.status)}>
                      {describeStatus(campaign.status)}
                    </Badge>
                  </div>
                  <span className="campaign-card__updated">Updated {formatCardTimestamp(campaign.updatedAt)}</span>
                </div>

                {campaign.summary && <p className="campaign-card__summary">{campaign.summary}</p>}

                <div className="campaign-card__meta">
                  <div className="campaign-card__meta-item" aria-label="World">
                    <span className="campaign-card__meta-label">World</span>
                    <span className="campaign-card__meta-value">{getWorldName(campaign.worldId)}</span>
                  </div>
                  <div className="campaign-card__meta-item" aria-label="Dungeon Master">
                    <span className="campaign-card__meta-label">Dungeon Master</span>
                    <span className="campaign-card__meta-value">
                      {dmNames.length > 0 ? dmNames.join(', ') : 'Unassigned'}
                    </span>
                  </div>
                  <div className="campaign-card__meta-item" aria-label="Party">
                    <span className="campaign-card__meta-label">Party</span>
                    <div className="campaign-card__party" aria-label="Party preview">
                      {partyPreview.length > 0 ? (
                        <>
                          {partyPreview.map((name) => (
                            <span key={name} className="campaign-card__party-chip">
                              {name}
                            </span>
                          ))}
                          {remaining > 0 && (
                            <span className="campaign-card__party-chip campaign-card__party-chip--more">
                              +{remaining}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="campaign-card__meta-value muted">No players yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="campaign-card__actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => openRecord(campaign)}
                    aria-label={`View details for ${campaign.name}`}
                  >
                    View details
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onSelectCampaign?.(campaign.id)}
                    disabled={isCurrent}
                    aria-pressed={isCurrent}
                    aria-label={isCurrent ? `${campaign.name} is the active campaign` : `Set ${campaign.name} as active`}
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
              <Button variant="primary" type="submit" form={recordFormId}>
                Save
              </Button>
            </>
          ) : (
            <>
              {canManageCurrent && currentRecord && (
                <>
                  <Button variant="danger" onClick={() => requestDelete(currentRecord)}>
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
          <div className="campaign-panel">
            {currentRecord.summary && (
              <p className="campaign-panel__summary">{currentRecord.summary}</p>
            )}

            <div className="campaign-panel__overview">
              <Card variant="elevated" className="campaign-panel__card" aria-label="Dungeon Master overview">
                <div className="campaign-overview">
                  <div className="campaign-overview__lead">
                    <span className="campaign-overview__icon" aria-hidden="true">👑</span>
                    <div>
                      <span className="campaign-overview__label">Dungeon Master</span>
                      <p className="campaign-overview__value">
                        {dungeonMasters.length > 0
                          ? dungeonMasters.map((assignment) => getUserName(assignment.userId)).join(', ')
                          : 'Unassigned'}
                      </p>
                    </div>
                  </div>
                  <div className="campaign-overview__stats">
                    <div>
                      <span className="campaign-overview__stat-label">Players</span>
                      <span className="campaign-overview__stat-value">{partyMembers.length}</span>
                    </div>
                    <div>
                      <span className="campaign-overview__stat-label">Characters</span>
                      <span className="campaign-overview__stat-value">
                        {(campaignCharacterLookup.get(currentRecord.id) || []).length}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card variant="outlined" className="campaign-panel__card campaign-panel__card--world" aria-label="World">
                <div className="campaign-overview__world">
                  <span className="campaign-overview__label">World</span>
                  <span className="campaign-overview__value">{getWorldName(currentRecord.worldId)}</span>
                  <span className="campaign-overview__timestamp">Last updated {formatRelativeTime(currentRecord.updatedAt)}</span>
                </div>
              </Card>
            </div>

            <section className="campaign-panel__party" aria-label="Party">
              <div className="campaign-panel__party-header">
                <h4 className="section-title">Party</h4>
              </div>

              {partyMembers.length > 0 ? (
                <div className="campaign-player-list">
                  {partyMembers.map((assignment, index) => {
                    const playerName = getUserName(assignment.userId)
                    const roleName = getRoleName(assignment.roleId)
                    const charactersForPlayer = getCharactersForAssignment(currentRecord.id, assignment.userId)
                    const isDungeonMaster = roleName === 'Dungeon Master'
                    return (
                      <details
                        key={assignment.id}
                        className={classNames(
                          'campaign-player',
                          index % 2 === 1 && 'campaign-player--alternate',
                          isDungeonMaster && 'campaign-player--dm'
                        )}
                        open
                      >
                        <summary className="campaign-player__summary">
                          <div
                            className="campaign-player__identity"
                            aria-label={isDungeonMaster ? 'Dungeon Master' : 'Player'}
                          >
                            <span className="campaign-player__icon" aria-hidden="true">
                              {isDungeonMaster ? '👑' : '🧝'}
                            </span>
                            <div className="campaign-player__meta">
                              <span className="campaign-player__name">{playerName}</span>
                              <Badge
                                variant={isDungeonMaster ? 'planning' : 'neutral'}
                                className="campaign-player__badge"
                              >
                                {roleName || 'Player'}
                              </Badge>
                            </div>
                          </div>
                          <div className="campaign-player__actions">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                openCharacterModal(currentRecord.id, assignment.userId)
                              }}
                              aria-label={`Add character for ${playerName}`}
                            >
                              + Add character
                            </Button>
                            {canManageCurrent && (
                              <IconButton
                                label={`Edit ${playerName} assignments`}
                                onClick={(event) => {
                                  event.preventDefault()
                                  event.stopPropagation()
                                  beginEditRecord()
                                }}
                                className="campaign-player__icon-button"
                              >
                                ✏️
                              </IconButton>
                            )}
                          </div>
                        </summary>
                        <div className="campaign-player__body">
                          {charactersForPlayer.length > 0 ? (
                            <ul className="campaign-player__characters">
                              {charactersForPlayer.map((character) => (
                                <li key={character.id} className="campaign-player__character">
                                  <div>
                                    <span className="campaign-player__character-name">{character.name}</span>
                                    <span className="campaign-player__character-meta">
                                      {character.className} · Level {character.level}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className="campaign-player__character-link"
                                    onClick={() => onSelectCampaign?.(character.campaignId)}
                                    aria-label={`View ${character.name}`}
                                  >
                                    View
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <EmptyState
                              icon="🧙"
                              title="No characters yet"
                              description="Add a character to this player to begin."
                              action={
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={(event) => {
                                    event.preventDefault()
                                    event.stopPropagation()
                                    openCharacterModal(currentRecord.id, assignment.userId)
                                  }}
                                >
                                  Add character
                                </Button>
                              }
                              className="campaign-player__empty"
                            />
                          )}
                        </div>
                      </details>
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  icon="🧝"
                  title="No party members yet"
                  description="Invite players to this campaign to see their characters here."
                  className="campaign-panel__empty"
                />
              )}
            </section>

          </div>
        ) : (
          <p className="helper-text">This campaign is no longer available.</p>
        )}
      </RecordDrawer>

      <FormModal
        open={characterModal.open}
        title="Add character"
        onClose={closeCharacterModal}
        actions={
          <>
            <Button variant="secondary" onClick={closeCharacterModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={characterFormId}>
              Save character
            </Button>
          </>
        }
      >
        <form id={characterFormId} className="modal-form" onSubmit={handleSubmitCharacterModal}>
          <div className="modal-context">
            <span className="modal-context__label">Campaign</span>
            <span className="modal-context__value">{modalCampaignName || 'Unassigned'}</span>
          </div>
          {characterModal.ownerId && (
            <div className="modal-context">
              <span className="modal-context__label">Player</span>
              <span className="modal-context__value">{getUserName(characterModal.ownerId)}</span>
            </div>
          )}

          <label>
            <span>Name</span>
            <input
              required
              type="text"
              value={characterModal.name}
              onChange={(event) => handleCharacterFieldChange('name', event.target.value)}
            />
          </label>
          <label>
            <span>Class</span>
            <input
              required
              type="text"
              value={characterModal.className}
              onChange={(event) => handleCharacterFieldChange('className', event.target.value)}
            />
          </label>
          <label>
            <span>Level</span>
            <input
              type="number"
              min="1"
              max="20"
              value={characterModal.level}
              onChange={(event) => handleCharacterFieldChange('level', event.target.value)}
            />
          </label>
          <label>
            <span>Ancestry</span>
            <input
              type="text"
              value={characterModal.ancestry}
              onChange={(event) => handleCharacterFieldChange('ancestry', event.target.value)}
            />
          </label>
        </form>
      </FormModal>

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
              <article
                key={character.id}
                className="character-card character-card-clickable"
                role="button"
                tabIndex={0}
                aria-label={`Open ${character.name}`}
                onClick={() => openEdit(character)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    openEdit(character)
                  }
                }}
              >
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
                      onClick={(event) => {
                        event.stopPropagation()
                        handleSetActive(character)
                      }}
                      disabled={isCurrent}
                    >
                      {isCurrent ? 'Active' : 'Set active'}
                    </button>
                    <button
                      type="button"
                      className="ghost destructive"
                      onClick={(event) => {
                        event.stopPropagation()
                        requestDelete(character)
                      }}
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
  emptyMessage,
  heading,
  description,
  badge,
  information,
  note,
  totalCount,
  emptyTitle,
  filterEmptyMessage,
  enableFilters = false
}) {
  const [visibleColumnIds, setVisibleColumnIds] = useState(() =>
    columns
      .filter((column) => column.defaultVisible !== false)
      .map((column) => column.id)
  )
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)
  const [filters, setFilters] = useState({})

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

  const filterableColumns = useMemo(
    () => (enableFilters ? columns.filter((column) => column.filterable !== false) : []),
    [columns, enableFilters]
  )

  useEffect(() => {
    if (!enableFilters) return
    setFilters((previous) => {
      const next = {}
      filterableColumns.forEach((column) => {
        next[column.id] = previous[column.id] ?? ''
      })
      return next
    })
  }, [enableFilters, filterableColumns])

  const updateFilter = (columnId, value) => {
    setFilters((previous) => ({ ...previous, [columnId]: value }))
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

  const resolveFilterValue = (column, record) => {
    if (typeof column.filterValue === 'function') {
      return column.filterValue(record)
    }
    if (typeof column.accessor === 'function') {
      return column.accessor(record)
    }
    if (column.id in record) {
      return record[column.id]
    }
    return ''
  }

  const visibleColumns = columns.filter((column) => visibleColumnIds.includes(column.id))

  const hasActiveFilters = useMemo(
    () =>
      enableFilters &&
      filterableColumns.some((column) => {
        const value = (filters[column.id] ?? '').trim()
        return value.length > 0
      }),
    [enableFilters, filterableColumns, filters]
  )

  const filteredRecords = useMemo(() => {
    if (!enableFilters || filterableColumns.length === 0) return records

    return records.filter((record) =>
      filterableColumns.every((column) => {
        const filterValue = (filters[column.id] ?? '').trim()
        if (!filterValue) return true
        const candidate = resolveFilterValue(column, record)
        if (candidate === null || candidate === undefined) return false
        return String(candidate).toLowerCase().includes(filterValue.toLowerCase())
      })
    )
  }, [enableFilters, filterableColumns, filters, records])

  const displayedRecords = filteredRecords
  const displayedCount = displayedRecords.length
  const resolvedTotalCount = typeof totalCount === 'number' ? totalCount : records.length

  const resolvedBadge = useMemo(() => {
    if (!badge) return null
    return typeof badge === 'function'
      ? badge({ filteredCount: displayedCount, totalCount: resolvedTotalCount, hasActiveFilters })
      : badge
  }, [badge, displayedCount, resolvedTotalCount, hasActiveFilters])

  return (
    <section className="standard-list">
      <header className="list-header">
        <div>
          <h2>{heading || `${entityName} directory`}</h2>
          {(description ?? true) && (
            <p>
              {description || `Configure and orchestrate ${entityName.toLowerCase()}s for the entire platform.`}
            </p>
          )}
        </div>

        <div className="list-actions">
          {resolvedBadge && <div className="list-metric">{resolvedBadge}</div>}
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

      {information && <div className="list-information">{information}</div>}

      {enableFilters && filterableColumns.length > 0 && (
        <div className="list-filters" role="region" aria-label="Filters">
          {filterableColumns.map((column) => (
            <label key={column.id} className="filter-field">
              <span>{column.label}</span>
              <input
                type="text"
                value={filters[column.id] ?? ''}
                onChange={(event) => updateFilter(column.id, event.target.value)}
                placeholder={column.filterPlaceholder || `Filter ${column.label.toLowerCase()}`}
              />
            </label>
          ))}
          {hasActiveFilters && (
            <div className="filter-actions">
              <button type="button" className="ghost" onClick={() => setFilters({})}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {displayedRecords.length === 0 ? (
        <div className="empty-state">
          <h3>{emptyTitle || `No ${entityName.toLowerCase()}s yet`}</h3>
          <p>
            {records.length === 0
              ? emptyMessage
              : filterEmptyMessage || `No ${entityName.toLowerCase()}s match the current filters.`}
          </p>
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

      {note && <div className="list-note">{note}</div>}
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

function FormModal({ open, title, onClose, actions, children }) {
  const dialogRef = useRef(null)
  const previouslyFocusedElement = useRef(null)
  const headingId = useMemo(() => newId('modal-title'), [])

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

    const node = dialogRef.current
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

  if (!open) return null

  return (
    <div className="modal-layer">
      <div className="modal-overlay" onClick={onClose} />
      <div
        ref={dialogRef}
        className="form-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
      >
        <header className="form-modal__header">
          <h3 id={headingId}>{title}</h3>
          <IconButton label="Close" onClick={onClose} className="form-modal__close">
            ×
          </IconButton>
        </header>
        <div className="form-modal__body">{children}</div>
        <footer className="form-modal__footer">{actions}</footer>
      </div>
    </div>
  )
}

function RecordDrawer({ open, title, subtitle, onClose, actions, children }) {
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
            {typeof title === 'string' ? (
              <h3 id={headingId}>{title}</h3>
            ) : (
              <div id={headingId}>{title}</div>
            )}
            {subtitle && <p className="drawer-subtitle">{subtitle}</p>}
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
