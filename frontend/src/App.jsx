import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { readStoredState, writeStoredState } from './utils/storage'
import { newId } from './utils/idGenerator'
import {
  seededRoles,
  seededUsers,
  seededWorlds,
  seededCampaigns,
  seededCharacters,
  seededNpcs,
  seededLocations,
  seededOrganisations,
  seededRelationships,
  seededRelationshipTypes,
  seededRaces
} from './constants/seedData'

const STORAGE_KEY = 'dnd-platform-state'

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

const seededLocationTypes = [
  {
    id: 'location-type-region',
    name: 'Region',
    description: 'A broad area such as a continent, kingdom, or province.'
  },
  {
    id: 'location-type-city',
    name: 'City',
    description: 'A large settlement or hub of civilisation.'
  },
  {
    id: 'location-type-site',
    name: 'Site',
    description: 'A point of interest such as a keep, camp, or landmark.'
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
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'location-types', label: 'Location types' },
  { id: 'relationship-types', label: 'Relationship types' }
]

const RELATIONSHIP_ENTITY_OPTIONS = [
  { id: 'npc', label: 'NPC' },
  { id: 'character', label: 'Character' },
  { id: 'organisation', label: 'Organisation' }
]

const capabilityMatrix = {
  'platform-admin': {
    'system-admin': [
      'view',
      'manage-users',
      'manage-roles',
      'manage-campaigns',
      'manage-location-types',
      'manage-relationship-types'
    ]
  }
}

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

const toDateTimeInputValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offsetMinutes = date.getTimezoneOffset()
  const adjusted = new Date(date.getTime() - offsetMinutes * 60 * 1000)
  return adjusted.toISOString().slice(0, 16)
}

const fromDateTimeInputValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
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

function ReferenceField({
  id,
  label,
  options = [],
  valueId = '',
  onValueChange,
  onSelect,
  placeholder = 'Search records',
  disabled = false,
  helperText,
  emptyMessage = 'No options available.',
  noMatchesMessage = 'No matches found.',
  allowClear = true,
  clearOnSelect = false,
  className = ''
}) {
  const fieldId = useMemo(() => id || newId('reference-field'), [id])
  const listboxId = `${fieldId}-list`
  const labelId = label ? `${fieldId}-label` : undefined
  const inputRef = useRef(null)
  const blurTimeoutRef = useRef(null)
  const previousValueRef = useRef(valueId ?? '')

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  const normalizedOptions = useMemo(
    () =>
      options
        .filter((option) => option && option.id)
        .map((option) => ({
          ...option,
          label: option.label ?? option.name ?? option.id
        })),
    [options]
  )

  const selectedOption = useMemo(() => {
    if (!valueId) return null
    return normalizedOptions.find((option) => option.id === valueId) || null
  }, [normalizedOptions, valueId])

  const [inputValue, setInputValue] = useState(() => selectedOption?.label || '')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  useEffect(() => {
    if (valueId === undefined) return
    const normalizedValue = valueId || ''
    if (previousValueRef.current === normalizedValue) {
      if (normalizedValue && selectedOption) {
        setInputValue(selectedOption.label)
      }
      return
    }
    previousValueRef.current = normalizedValue
    if (normalizedValue && selectedOption) {
      setInputValue(selectedOption.label)
    } else if (!normalizedValue) {
      setInputValue('')
    }
  }, [valueId, selectedOption])

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(0)
    } else if (highlightedIndex >= normalizedOptions.length) {
      setHighlightedIndex(0)
    }
  }, [isOpen, normalizedOptions.length, highlightedIndex])

  const filteredOptions = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) return normalizedOptions
    return normalizedOptions.filter((option) => option.label.toLowerCase().includes(query))
  }, [normalizedOptions, inputValue])

  const canClear = allowClear && !disabled && Boolean(valueId)
  const resolvedHelperText = helperText ?? (normalizedOptions.length === 0 ? emptyMessage : undefined)

  const scheduleClose = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 120)
  }

  const handleInputFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
    }
    if (disabled) return
    setIsOpen(true)
  }

  const handleInputChange = (event) => {
    if (disabled) return
    setInputValue(event.target.value)
    setIsOpen(true)
    setHighlightedIndex(0)
  }

  const handleOptionSelect = (option) => {
    if (!option || disabled) return
    onSelect?.(option)
    if (onValueChange) {
      onValueChange(option.id)
    }
    if (clearOnSelect) {
      previousValueRef.current = ''
      setInputValue('')
    } else {
      previousValueRef.current = option.id
      setInputValue(option.label)
    }
    setIsOpen(false)
    setHighlightedIndex(0)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleClear = () => {
    if (!canClear) return
    previousValueRef.current = ''
    setInputValue('')
    onValueChange?.('')
    onSelect?.(null)
    setIsOpen(false)
    setHighlightedIndex(0)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleKeyDown = (event) => {
    if (disabled) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        return
      }
      setHighlightedIndex((previous) => (filteredOptions.length === 0 ? 0 : (previous + 1) % filteredOptions.length))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        return
      }
      setHighlightedIndex((previous) => {
        if (filteredOptions.length === 0) return 0
        return (previous - 1 + filteredOptions.length) % filteredOptions.length
      })
      return
    }
    if (event.key === 'Enter') {
      if (isOpen && filteredOptions[highlightedIndex]) {
        event.preventDefault()
        handleOptionSelect(filteredOptions[highlightedIndex])
      }
      return
    }
    if (event.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const activeOptionId = filteredOptions[highlightedIndex]?.id

  return (
    <div className={classNames('reference-field', className, disabled && 'reference-field--disabled')}>
      {label && (
        <label className="reference-field__label" htmlFor={fieldId} id={labelId}>
          {label}
        </label>
      )}
      <div className="reference-field__control">
        <input
          ref={inputRef}
          id={fieldId}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={scheduleClose}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && activeOptionId ? `${fieldId}-option-${activeOptionId}` : undefined}
          disabled={disabled}
          className="reference-field__input"
        />
        {canClear && (
          <button type="button" className="reference-field__clear" onClick={handleClear} aria-label="Clear selection">
            ×
          </button>
        )}
        <span className="reference-field__chevron" aria-hidden="true">
          ▾
        </span>
      </div>
      {resolvedHelperText && <p className="helper-text">{resolvedHelperText}</p>}
      {isOpen && !disabled && (
        <ul className="reference-field__options" role="listbox" id={listboxId} aria-labelledby={labelId}>
          {filteredOptions.length === 0 ? (
            <li className="reference-field__option reference-field__option--empty">{noMatchesMessage}</li>
          ) : (
            filteredOptions.map((option) => {
              const isActive = option.id === activeOptionId
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    id={`${fieldId}-option-${option.id}`}
                    className={classNames('reference-field__option', isActive && 'reference-field__option--active')}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      handleOptionSelect(option)
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}

function ListCollector({
  label,
  options = [],
  selectedIds = [],
  onChange,
  placeholder = 'Select an option',
  emptyMessage = 'No options available.',
  noSelectionMessage = 'No selections yet.'
}) {
  const selectId = useMemo(() => newId('list-collector'), [])

  const optionLookup = useMemo(() => {
    const map = new Map()
    options.forEach((option) => {
      if (!option || !option.id) return
      const labelValue = option.label ?? option.name ?? option.id
      map.set(option.id, labelValue)
    })
    return map
  }, [options])

  const availableOptions = useMemo(
    () => options.filter((option) => option?.id && !selectedIds.includes(option.id)),
    [options, selectedIds]
  )

  const selectedOptions = useMemo(
    () =>
      selectedIds
        .map((id) => ({ id, label: optionLookup.get(id) || id }))
        .filter((option) => option.id),
    [selectedIds, optionLookup]
  )

  const canModify = typeof onChange === 'function'
  const canAddMore = availableOptions.length > 0

  const handleOptionSelect = (option) => {
    if (!canModify || !option) return
    if (selectedIds.includes(option.id)) return
    onChange([...selectedIds, option.id])
  }

  const handleRemove = (id) => {
    if (!canModify) return
    onChange(selectedIds.filter((itemId) => itemId !== id))
  }

  return (
    <div className="list-collector">
      {options.length === 0 ? (
        <>
          <span className="list-collector__label">{label}</span>
          <p className="helper-text">{emptyMessage}</p>
        </>
      ) : (
        <ReferenceField
          id={selectId}
          label={label}
          options={availableOptions}
          valueId=""
          onSelect={handleOptionSelect}
          placeholder={placeholder}
          disabled={!canModify || !canAddMore}
          helperText={!canAddMore ? 'All options linked' : undefined}
          noMatchesMessage="No matching options"
          allowClear={false}
          clearOnSelect
        />
      )}

      {selectedOptions.length > 0 ? (
        <div className="list-collector__pill-row" role="list">
          {selectedOptions.map((option) => (
            <span key={option.id} className="list-collector__pill" role="listitem">
              {option.label}
              <button
                type="button"
                className="list-collector__pill-remove"
                onClick={() => handleRemove(option.id)}
                disabled={!canModify}
                aria-label={`Remove ${option.label}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="helper-text">{noSelectionMessage}</p>
      )}
    </div>
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
  characterCount,
  campaigns = [],
  characters = [],
  worlds = [],
  locations = [],
  races = [],
  onSave,
  onDelete,
  relationships = [],
  relationshipTypes = [],
  entityDirectory,
  onCreateRelationship,
  onDeleteRelationship,
  onNavigateEntity,
  focusId,
  onClearFocus
}) {
  const emptyDescription = showContextPrompt
    ? 'Pick a campaign or character from the header to reveal NPCs tied to them.'
    : 'No NPCs have been catalogued for this context yet.'

  const raceLookup = useMemo(() => {
    const map = new Map()
    races.forEach((race) => {
      if (!race?.id) return
      map.set(race.id, race.name || 'Unknown ancestry')
    })
    return map
  }, [races])

  const locationLookup = useMemo(() => {
    const map = new Map()
    locations.forEach((location) => {
      if (!location?.id) return
      map.set(location.id, location.name || 'Unknown location')
    })
    return map
  }, [locations])

  const npcColumns = useMemo(
    () => [
      { id: 'name', label: 'Name', accessor: (npc) => npc.name },
      { id: 'status', label: 'Status', accessor: (npc) => npc.status || 'Unknown' },
      {
        id: 'race',
        label: 'Ancestry',
        accessor: (npc) => raceLookup.get(npc.raceId) || '—',
        defaultVisible: false,
        filterValue: (npc) => raceLookup.get(npc.raceId) || ''
      },
      {
        id: 'demeanor',
        label: 'Disposition',
        accessor: (npc) => npc.demeanor || '—',
        defaultVisible: false
      },
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
      }
    ],
    [campaignLookup, characterLookup, worldLookup, raceLookup]
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

  const canManage = typeof onSave === 'function'
  const formId = useMemo(() => newId('npc-form'), [])
  const [editor, setEditor] = useState({ open: false, mode: 'create', record: null })
  const [viewer, setViewer] = useState({ open: false, recordId: null })
  const [form, setForm] = useState(() => ({
    name: '',
    demeanor: '',
    description: '',
    status: 'Alive',
    causeOfDeath: '',
    worldId: '',
    raceId: '',
    locationId: '',
    hometownId: '',
    visibility: 'campaign',
    campaignIds: [],
    characterIds: [],
    notes: ''
  }))

  const resetForm = () => {
    setForm({
      name: '',
      demeanor: '',
      description: '',
      status: 'Alive',
      causeOfDeath: '',
      worldId: '',
      raceId: '',
      locationId: '',
      hometownId: '',
      visibility: 'campaign',
      campaignIds: [],
      characterIds: [],
      notes: ''
    })
  }

  const openCreate = () => {
    resetForm()
    setEditor({ open: true, mode: 'create', record: null })
  }

  const openEdit = (record) => {
    setForm({
      name: record.name || '',
      demeanor: record.demeanor || '',
      description: record.description || '',
      status: record.status || 'Unknown',
      causeOfDeath: record.status === 'Dead' ? record.causeOfDeath || '' : '',
      worldId: record.worldId || '',
      raceId: record.raceId || '',
      locationId: record.locationId || '',
      hometownId: record.hometownId || '',
      visibility: record.visibility || 'campaign',
      campaignIds: Array.isArray(record.campaignIds) ? record.campaignIds : [],
      characterIds: Array.isArray(record.characterIds) ? record.characterIds : [],
      notes: record.notes || ''
    })
    setEditor({ open: true, mode: 'edit', record })
  }

  const closeEditor = () => {
    setEditor((prev) => ({ ...prev, open: false }))
    resetForm()
  }

  const handleCampaignChange = (nextCampaignIds) => {
    setForm((prev) => ({ ...prev, campaignIds: nextCampaignIds }))
  }

  const handleCharacterChange = (nextCharacterIds) => {
    setForm((prev) => ({ ...prev, characterIds: nextCharacterIds }))
  }

  const locationOptions = useMemo(
    () =>
      locations
        .map((location) => ({ id: location.id, name: location.name || 'Unnamed location' }))
        .filter((option) => option.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [locations]
  )

  const raceOptions = useMemo(
    () =>
      races
        .map((race) => ({ id: race.id, name: race.name || 'Unnamed ancestry' }))
        .filter((option) => option.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [races]
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.name.trim()) return

    const payload = {
      name: form.name.trim(),
      demeanor: form.demeanor.trim(),
      description: form.description.trim(),
      status: form.status || 'Unknown',
      causeOfDeath: form.status === 'Dead' ? form.causeOfDeath.trim() : '',
      worldId: form.worldId,
      raceId: form.raceId || '',
      locationId: form.locationId || '',
      hometownId: form.hometownId || '',
      visibility: form.visibility,
      campaignIds: form.campaignIds,
      characterIds: form.characterIds
    }

    if (editor.mode === 'edit' && editor.record) {
      onSave?.({ ...payload, id: editor.record.id }, 'edit')
    } else {
      onSave?.(payload, 'create')
    }

    closeEditor()
  }

  const handleDelete = (recordId) => {
    if (!onDelete) return
    if (!window.confirm('Delete this NPC?')) return
    onDelete(recordId)
  }

  const currentViewerRecord = useMemo(
    () => records.find((npc) => npc.id === viewer.recordId) || null,
    [records, viewer.recordId]
  )

  const npcCampaignNames = useMemo(() => {
    if (!currentViewerRecord || !Array.isArray(currentViewerRecord.campaignIds)) return []
    return currentViewerRecord.campaignIds
      .map((id) => campaignLookup.get(id) || id)
      .filter(Boolean)
  }, [currentViewerRecord, campaignLookup])

  const npcCharacterNames = useMemo(() => {
    if (!currentViewerRecord || !Array.isArray(currentViewerRecord.characterIds)) return []
    return currentViewerRecord.characterIds
      .map((id) => characterLookup.get(id) || id)
      .filter(Boolean)
  }, [currentViewerRecord, characterLookup])

  const npcAudienceDescription = useMemo(() => {
    if (!currentViewerRecord) return ''
    return describeRecordAudience(currentViewerRecord, { campaignLookup, characterLookup })
  }, [currentViewerRecord, campaignLookup, characterLookup])

  const openViewer = (record) => {
    if (!record) return
    setViewer({ open: true, recordId: record.id })
  }

  const closeViewer = () => {
    setViewer({ open: false, recordId: null })
  }

  useEffect(() => {
    if (!focusId) return
    const match = records.find((npc) => npc.id === focusId)
    if (match) {
      setViewer({ open: true, recordId: focusId })
      onClearFocus?.()
    }
  }, [focusId, records, onClearFocus])

  useEffect(() => {
    if (viewer.open && !currentViewerRecord) {
      setViewer({ open: false, recordId: null })
    }
  }, [viewer.open, currentViewerRecord])

  const handleRelationshipNavigate = (type, id) => {
    if (type === 'npc') {
      const match = records.find((npc) => npc.id === id)
      if (match) {
        setViewer({ open: true, recordId: id })
        return
      }
    }
    onNavigateEntity?.(type, id)
  }

  return (
    <>
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
        onCreate={canManage ? openCreate : undefined}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        onView={openViewer}
      />

      {canManage && (
        <FormModal
          open={editor.open}
          title={editor.mode === 'edit' ? 'Edit NPC' : 'Add NPC'}
          onClose={closeEditor}
          size="lg"
          actions={
            <>
              <button type="button" className="ghost" onClick={closeEditor}>
                Cancel
              </button>
              <button type="submit" className="primary" form={formId}>
                {editor.mode === 'edit' ? 'Save NPC' : 'Create NPC'}
              </button>
            </>
          }
        >
          <form id={formId} className="drawer-form drawer-form--columns" onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input
                required
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label>
              <span>World</span>
              <select
                value={form.worldId}
                onChange={(event) => setForm((prev) => ({ ...prev, worldId: event.target.value }))}
                required
              >
                <option value="" disabled>
                  Select a world
                </option>
                {worlds.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Disposition</span>
              <input
                type="text"
                value={form.demeanor}
                onChange={(event) => setForm((prev) => ({ ...prev, demeanor: event.target.value }))}
              />
            </label>

            <label>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="Alive">Alive</option>
                <option value="Dead">Dead</option>
                <option value="Unknown">Unknown</option>
                <option value="Other">Other</option>
              </select>
            </label>

            {form.status === 'Dead' && (
              <label>
                <span>Cause of death</span>
                <input
                  type="text"
                  value={form.causeOfDeath}
                  onChange={(event) => setForm((prev) => ({ ...prev, causeOfDeath: event.target.value }))}
                  placeholder="e.g. Slain by a black dragon"
                />
              </label>
            )}

            <label>
              <span>Ancestry</span>
              <select
                value={form.raceId}
                onChange={(event) => setForm((prev) => ({ ...prev, raceId: event.target.value }))}
              >
                <option value="">Unspecified</option>
                {raceOptions.map((race) => (
                  <option key={race.id} value={race.id}>
                    {race.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Visibility</span>
              <select
                value={form.visibility}
                onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
              >
                <option value="public">All adventurers</option>
                <option value="campaign">Campaign</option>
                <option value="party">Party</option>
                <option value="character">Personal</option>
                <option value="dm">Dungeon Masters</option>
              </select>
            </label>

            <ListCollector
              label="Linked campaigns"
              options={campaigns.map((campaign) => ({
                id: campaign.id,
                label: campaign.name
              }))}
              selectedIds={form.campaignIds}
              onChange={handleCampaignChange}
              placeholder="Add a campaign"
              emptyMessage="No campaigns available."
              noSelectionMessage="No campaigns linked."
            />

            <ListCollector
              label="Linked characters"
              options={characters.map((character) => ({
                id: character.id,
                label: character.name
              }))}
              selectedIds={form.characterIds}
              onChange={handleCharacterChange}
              placeholder="Add a character"
              emptyMessage="No characters available."
              noSelectionMessage="No characters linked."
            />

            <ReferenceField
              label="Current location"
              options={locationOptions}
              valueId={form.locationId}
              onValueChange={(value) => setForm((prev) => ({ ...prev, locationId: value }))}
              placeholder="Unknown or search locations"
              emptyMessage="No locations recorded yet."
              noMatchesMessage="No matching locations"
            />

            <ReferenceField
              label="Hometown"
              options={locationOptions}
              valueId={form.hometownId}
              onValueChange={(value) => setForm((prev) => ({ ...prev, hometownId: value }))}
              placeholder="Unknown or search locations"
              emptyMessage="No locations recorded yet."
              noMatchesMessage="No matching locations"
            />

            <label>
              <span>Description</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
          </form>
        </FormModal>
      )}

      <RecordDrawer
        open={viewer.open && Boolean(currentViewerRecord)}
        title={currentViewerRecord ? currentViewerRecord.name : 'NPC detail'}
        onClose={closeViewer}
      >
        {currentViewerRecord ? (
          <DrawerTabs
            tabs={[
              {
                id: 'npc-dossier',
                label: 'Dossier',
                content: (
                  <div className="drawer-stack">
                    <section className="drawer-subsection">
                      <div className="drawer-field-grid">
                        <div>
                          <h4>Status</h4>
                          <p>{currentViewerRecord.status || 'Unknown'}</p>
                        </div>
                        <div>
                          <h4>Ancestry</h4>
                          <p>{raceLookup.get(currentViewerRecord.raceId) || 'Unspecified'}</p>
                        </div>
                        <div>
                          <h4>World</h4>
                          <p>{worldLookup.get(currentViewerRecord.worldId) || 'Unassigned'}</p>
                        </div>
                      </div>
                      <div className="drawer-field-grid">
                        <div>
                          <h4>Disposition</h4>
                          <p>{currentViewerRecord.demeanor || 'Unknown'}</p>
                        </div>
                        <div>
                          <h4>Current location</h4>
                          <p>{locationLookup.get(currentViewerRecord.locationId) || 'Unknown'}</p>
                        </div>
                        <div>
                          <h4>Hometown</h4>
                          <p>{locationLookup.get(currentViewerRecord.hometownId) || 'Unknown'}</p>
                        </div>
                      </div>
                      {currentViewerRecord.status === 'Dead' && currentViewerRecord.causeOfDeath && (
                        <div>
                          <h4>Cause of death</h4>
                          <p>{currentViewerRecord.causeOfDeath}</p>
                        </div>
                      )}
                      <div>
                        <h4>Summary</h4>
                        <p>{currentViewerRecord.description || 'No background summary recorded yet.'}</p>
                      </div>
                    </section>
                  </div>
                )
              },
              {
                id: 'npc-dm-controls',
                label: 'DM controls',
                content: (
                  <div className="drawer-stack">
                    <section className="drawer-subsection">
                      <div className="drawer-field-grid">
                        <div>
                          <h4>Visibility</h4>
                          <p>{(currentViewerRecord.visibility || 'campaign').toUpperCase()}</p>
                          {npcAudienceDescription && <p className="helper-text">{npcAudienceDescription}</p>}
                        </div>
                        <div>
                          <h4>Campaign access</h4>
                          {npcCampaignNames.length > 0 ? (
                            <ul className="drawer-list">
                              {npcCampaignNames.map((name) => (
                                <li key={name}>{name}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="helper-text">No campaigns linked.</p>
                          )}
                        </div>
                        <div>
                          <h4>Character access</h4>
                          {npcCharacterNames.length > 0 ? (
                            <ul className="drawer-list">
                              {npcCharacterNames.map((name) => (
                                <li key={name}>{name}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="helper-text">No characters linked.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4>DM notes</h4>
                        <p>{currentViewerRecord.notes || 'No private notes recorded.'}</p>
                      </div>
                    </section>
                  </div>
                )
              },
              {
                id: 'npc-relationships',
                label: 'Relationships',
                content: (
                  <div className="drawer-stack">
                    <EntityRelationshipManager
                      entity={currentViewerRecord}
                      entityType="npc"
                      relationships={relationships}
                      relationshipTypes={relationshipTypes}
                      entityDirectory={entityDirectory}
                      onCreateRelationship={onCreateRelationship}
                      onDeleteRelationship={onDeleteRelationship}
                      onNavigate={handleRelationshipNavigate}
                      canManage={canManage}
                    />
                  </div>
                )
              }
            ]}
          />
        ) : (
          <p className="helper-text">Select an NPC to view their dossier.</p>
        )}
      </RecordDrawer>
    </>
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
  isWorldBuilder,
  campaigns = [],
  characters = [],
  worlds = [],
  locationTypes = [],
  onSave,
  onDelete,
  relationships = [],
  relationshipTypes = [],
  entityDirectory = {},
  onCreateRelationship,
  onDeleteRelationship,
  onNavigateEntity,
  focusId,
  onClearFocus
}) {
  const emptyDescription = showContextPrompt
    ? 'Set a campaign or character context to reveal scouting intel.'
    : 'No locations have been recorded for this context yet.'

  const locationTypeLookup = useMemo(() => {
    const map = new Map()
    locationTypes.forEach((type) => {
      if (!type?.id) return
      map.set(type.id, type.name || 'Untitled type')
    })
    return map
  }, [locationTypes])

  const locationNameLookup = useMemo(() => {
    const map = new Map()
    if (Array.isArray(records)) {
      records.forEach((location) => {
        if (location?.id) {
          map.set(location.id, location.name || 'Unnamed location')
        }
      })
    }
    return map
  }, [records])

  const locationColumns = useMemo(
    () => [
      { id: 'name', label: 'Location', accessor: (location) => location.name },
      {
        id: 'type',
        label: 'Type',
        accessor: (location) => locationTypeLookup.get(location.typeId) || '—',
        filterValue: (location) => locationTypeLookup.get(location.typeId) || ''
      },
      {
        id: 'parent',
        label: 'Parent',
        accessor: (location) => locationNameLookup.get(location.parentId) || '—',
        defaultVisible: false,
        filterValue: (location) => locationNameLookup.get(location.parentId) || ''
      },
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
    [campaignLookup, characterLookup, worldLookup, locationTypeLookup, locationNameLookup]
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

  const canManage = typeof onSave === 'function'
  const formId = useMemo(() => newId('location-form'), [])
  const [editor, setEditor] = useState({ open: false, mode: 'create', record: null })
  const [viewer, setViewer] = useState({ open: false, recordId: null })
  const [form, setForm] = useState(() => ({
    name: '',
    typeId: locationTypes[0]?.id ?? '',
    parentId: '',
    summary: '',
    notes: '',
    worldId: worlds[0]?.id ?? '',
    visibility: 'campaign',
    campaignIds: [],
    characterIds: [],
    tags: '',
    lastScoutedAt: ''
  }))

  const resetForm = () => {
    setForm({
      name: '',
      typeId: locationTypes[0]?.id ?? '',
      parentId: '',
      summary: '',
      notes: '',
      worldId: worlds[0]?.id ?? '',
      visibility: 'campaign',
      campaignIds: [],
      characterIds: [],
      tags: '',
      lastScoutedAt: ''
    })
  }

  const openCreate = () => {
    resetForm()
    setEditor({ open: true, mode: 'create', record: null })
  }

  const openEdit = (record) => {
    setForm({
      name: record.name || '',
      typeId: record.typeId || record.type || '',
      parentId: record.parentId || '',
      summary: record.summary || '',
      notes: record.notes || '',
      worldId: record.worldId || worlds[0]?.id || '',
      visibility: record.visibility || 'campaign',
      campaignIds: Array.isArray(record.campaignIds) ? record.campaignIds : [],
      characterIds: Array.isArray(record.characterIds) ? record.characterIds : [],
      tags: Array.isArray(record.tags) ? record.tags.join(', ') : '',
      lastScoutedAt: record.lastScoutedAt ? toDateTimeInputValue(record.lastScoutedAt) : ''
    })
    setEditor({ open: true, mode: 'edit', record })
  }

  const closeEditor = () => {
    setEditor((prev) => ({ ...prev, open: false }))
    resetForm()
  }

  const handleCampaignChange = (nextCampaignIds) => {
    setForm((prev) => ({ ...prev, campaignIds: nextCampaignIds }))
  }

  const handleCharacterChange = (nextCharacterIds) => {
    setForm((prev) => ({ ...prev, characterIds: nextCharacterIds }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.name.trim()) return

    const payload = {
      name: form.name.trim(),
      typeId: form.typeId || '',
      parentId: form.parentId || '',
      summary: form.summary.trim(),
      notes: form.notes.trim(),
      worldId: form.worldId,
      visibility: form.visibility,
      campaignIds: form.campaignIds,
      characterIds: form.characterIds,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      lastScoutedAt: fromDateTimeInputValue(form.lastScoutedAt)
    }

    if (editor.mode === 'edit' && editor.record) {
      const adjusted =
        editor.record.id && payload.parentId === editor.record.id
          ? { ...payload, parentId: '' }
          : payload
      onSave?.({ ...adjusted, id: editor.record.id }, 'edit')
    } else {
      onSave?.(payload, 'create')
    }

    closeEditor()
  }

  const activeRecordId = editor.record?.id || null

  const parentOptions = useMemo(() => {
    return Array.isArray(records)
      ? records
          .filter((location) => location?.id && location.id !== activeRecordId)
          .map((location) => ({ id: location.id, name: location.name || 'Unnamed location' }))
      : []
  }, [records, activeRecordId])

  const currentViewerRecord = useMemo(
    () => records.find((location) => location.id === viewer.recordId) || null,
    [records, viewer.recordId]
  )

  const locationCampaignNames = useMemo(() => {
    if (!currentViewerRecord || !Array.isArray(currentViewerRecord.campaignIds)) return []
    return currentViewerRecord.campaignIds
      .map((id) => campaignLookup.get(id) || id)
      .filter(Boolean)
  }, [currentViewerRecord, campaignLookup])

  const locationCharacterNames = useMemo(() => {
    if (!currentViewerRecord || !Array.isArray(currentViewerRecord.characterIds)) return []
    return currentViewerRecord.characterIds
      .map((id) => characterLookup.get(id) || id)
      .filter(Boolean)
  }, [currentViewerRecord, characterLookup])

  const locationAudienceDescription = useMemo(() => {
    if (!currentViewerRecord) return ''
    return describeRecordAudience(currentViewerRecord, { campaignLookup, characterLookup })
  }, [currentViewerRecord, campaignLookup, characterLookup])

  const handleDelete = (recordId) => {
    if (!onDelete) return
    if (!window.confirm('Delete this location?')) return
    onDelete(recordId)
  }

  const openViewer = (record) => {
    if (!record) return
    setViewer({ open: true, recordId: record.id })
  }

  const closeViewer = () => {
    setViewer({ open: false, recordId: null })
  }

  useEffect(() => {
    if (!focusId) return
    const match = records.find((location) => location.id === focusId)
    if (match) {
      setViewer({ open: true, recordId: focusId })
      onClearFocus?.()
    }
  }, [focusId, records, onClearFocus])

  useEffect(() => {
    if (viewer.open && !currentViewerRecord) {
      setViewer({ open: false, recordId: null })
    }
  }, [viewer.open, currentViewerRecord])

  const handleRelationshipNavigate = (type, id) => {
    if (type === 'location') {
      const match = records.find((location) => location.id === id)
      if (match) {
        setViewer({ open: true, recordId: id })
        return
      }
    }
    onNavigateEntity?.(type, id)
  }

  return (
    <>
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
        onCreate={canManage ? openCreate : undefined}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        onView={openViewer}
      />

      {canManage && (
        <FormModal
          open={editor.open}
          title={editor.mode === 'edit' ? 'Edit location' : 'Add location'}
          onClose={closeEditor}
          actions={
            <>
              <button type="button" className="ghost" onClick={closeEditor}>
                Cancel
              </button>
              <button type="submit" className="primary" form={formId}>
                {editor.mode === 'edit' ? 'Save location' : 'Create location'}
              </button>
            </>
          }
        >
          <form id={formId} className="drawer-form" onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input
                required
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label>
              <span>Type</span>
              <select
                value={form.typeId}
                onChange={(event) => setForm((prev) => ({ ...prev, typeId: event.target.value }))}
              >
                <option value="">Uncategorised</option>
                {locationTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Parent location</span>
              <select
                value={form.parentId}
                onChange={(event) => setForm((prev) => ({ ...prev, parentId: event.target.value }))}
              >
                <option value="">No parent</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>World</span>
              <select
                value={form.worldId}
                onChange={(event) => setForm((prev) => ({ ...prev, worldId: event.target.value }))}
              >
                <option value="">Unassigned world</option>
                {worlds.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Visibility</span>
              <select
                value={form.visibility}
                onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
              >
                <option value="public">All adventurers</option>
                <option value="campaign">Campaign</option>
                <option value="party">Party</option>
                <option value="character">Personal</option>
                <option value="dm">Dungeon Masters</option>
              </select>
            </label>

            <ListCollector
              label="Linked campaigns"
              options={campaigns.map((campaign) => ({
                id: campaign.id,
                label: campaign.name
              }))}
              selectedIds={form.campaignIds}
              onChange={handleCampaignChange}
              placeholder="Add a campaign"
              emptyMessage="No campaigns available."
              noSelectionMessage="No campaigns linked."
            />

            <ListCollector
              label="Linked characters"
              options={characters.map((character) => ({
                id: character.id,
                label: character.name
              }))}
              selectedIds={form.characterIds}
              onChange={handleCharacterChange}
              placeholder="Add a character"
              emptyMessage="No characters available."
              noSelectionMessage="No characters linked."
            />

            <label>
              <span>Tags (comma separated)</span>
              <input
                type="text"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              />
            </label>

            <label>
              <span>Summary</span>
              <textarea
                rows={3}
                value={form.summary}
                onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
              />
            </label>

            <label>
              <span>Field notes</span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </label>

            <label>
              <span>Last scouted</span>
              <input
                type="datetime-local"
                value={form.lastScoutedAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lastScoutedAt: event.target.value }))
                }
              />
            </label>
          </form>
        </FormModal>
      )}

      <RecordDrawer
        open={viewer.open && Boolean(currentViewerRecord)}
        title={currentViewerRecord ? currentViewerRecord.name : 'Location detail'}
        onClose={closeViewer}
      >
        {currentViewerRecord ? (
          <DrawerTabs
            tabs={[
              {
                id: 'location-dossier',
                label: 'Dossier',
                content: (
                  <div className="drawer-stack">
                    <section className="drawer-subsection">
                      <div className="drawer-field-grid">
                        <div>
                          <h4>Type</h4>
                          <p>{locationTypeLookup.get(currentViewerRecord.typeId) || 'Uncategorised'}</p>
                        </div>
                        <div>
                          <h4>World</h4>
                          <p>{worldLookup.get(currentViewerRecord.worldId) || 'Unassigned world'}</p>
                        </div>
                        <div>
                          <h4>Parent location</h4>
                          <p>{locationNameLookup.get(currentViewerRecord.parentId) || 'No parent'}</p>
                        </div>
                      </div>
                      <div className="drawer-field-grid">
                        <div>
                          <h4>Last scouted</h4>
                          <p>{formatRelativeTime(currentViewerRecord.lastScoutedAt)}</p>
                        </div>
                        <div>
                          <h4>Tags</h4>
                          {Array.isArray(currentViewerRecord.tags) && currentViewerRecord.tags.length > 0 ? (
                            <div className="knowledge-chip-row">
                              {currentViewerRecord.tags.map((tag) => (
                                <span key={tag} className="knowledge-chip knowledge-chip--tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="helper-text">No tags assigned.</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h4>Summary</h4>
                        <p>{currentViewerRecord.summary || 'No summary recorded yet.'}</p>
                      </div>
                      <div>
                        <h4>Field notes</h4>
                        <p>{currentViewerRecord.notes || 'No field notes captured.'}</p>
                      </div>
                    </section>
                  </div>
                )
              },
              {
                id: 'location-dm-controls',
                label: 'DM controls',
                content: (
                  <div className="drawer-stack">
                    <section className="drawer-subsection">
                      <div className="drawer-field-grid">
                        <div>
                          <h4>Visibility</h4>
                          <p>{(currentViewerRecord.visibility || 'campaign').toUpperCase()}</p>
                          {locationAudienceDescription && <p className="helper-text">{locationAudienceDescription}</p>}
                        </div>
                        <div>
                          <h4>Campaign access</h4>
                          {locationCampaignNames.length > 0 ? (
                            <ul className="drawer-list">
                              {locationCampaignNames.map((name) => (
                                <li key={name}>{name}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="helper-text">No campaigns linked.</p>
                          )}
                        </div>
                        <div>
                          <h4>Character access</h4>
                          {locationCharacterNames.length > 0 ? (
                            <ul className="drawer-list">
                              {locationCharacterNames.map((name) => (
                                <li key={name}>{name}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="helper-text">No characters linked.</p>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                )
              },
              {
                id: 'location-relationships',
                label: 'Relationships',
                content: (
                  <div className="drawer-stack">
                    <EntityRelationshipManager
                      entity={currentViewerRecord}
                      entityType="location"
                      relationships={relationships}
                      relationshipTypes={relationshipTypes}
                      entityDirectory={entityDirectory}
                      onCreateRelationship={onCreateRelationship}
                      onDeleteRelationship={onDeleteRelationship}
                      onNavigate={handleRelationshipNavigate}
                      canManage={canManage}
                    />
                  </div>
                )
              }
            ]}
          />
        ) : (
          <p className="helper-text">Select a location to view its dossier.</p>
        )}
      </RecordDrawer>
    </>
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
  isWorldBuilder,
  campaigns = [],
  worlds = [],
  onSave,
  onDelete,
  relationships = [],
  relationshipTypes = [],
  entityDirectory = {},
  onCreateRelationship,
  onDeleteRelationship,
  onNavigateEntity,
  focusId,
  onClearFocus
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

  const canManage = typeof onSave === 'function'
  const formId = useMemo(() => newId('organisation-form'), [])
  const [editor, setEditor] = useState({ open: false, mode: 'create', record: null })
  const [viewer, setViewer] = useState({ open: false, recordId: null })
  const [form, setForm] = useState(() => ({
    name: '',
    alignment: '',
    summary: '',
    influence: '',
    worldId: worlds[0]?.id ?? '',
    visibility: 'campaign',
    campaignIds: [],
    goals: '',
    allies: '',
    enemies: '',
    tags: '',
    lastActivityAt: ''
  }))

  const currentViewerRecord = useMemo(
    () => records.find((organisation) => organisation.id === viewer.recordId) || null,
    [records, viewer.recordId]
  )

  const organisationCampaignNames = useMemo(() => {
    if (!currentViewerRecord || !Array.isArray(currentViewerRecord.campaignIds)) return []
    return currentViewerRecord.campaignIds
      .map((id) => campaignLookup.get(id) || id)
      .filter(Boolean)
  }, [currentViewerRecord, campaignLookup])

  const organisationAudienceDescription = useMemo(() => {
    if (!currentViewerRecord) return ''
    return describeRecordAudience(currentViewerRecord, { campaignLookup, characterLookup })
  }, [currentViewerRecord, campaignLookup, characterLookup])

  const resetForm = () => {
    setForm({
      name: '',
      alignment: '',
      summary: '',
      influence: '',
      worldId: worlds[0]?.id ?? '',
      visibility: 'campaign',
      campaignIds: [],
      goals: '',
      allies: '',
      enemies: '',
      tags: '',
      lastActivityAt: ''
    })
  }

  const openCreate = () => {
    resetForm()
    setEditor({ open: true, mode: 'create', record: null })
  }

  const openEdit = (record) => {
    setForm({
      name: record.name || '',
      alignment: record.alignment || '',
      summary: record.summary || '',
      influence: record.influence || '',
      worldId: record.worldId || worlds[0]?.id || '',
      visibility: record.visibility || 'campaign',
      campaignIds: Array.isArray(record.campaignIds) ? record.campaignIds : [],
      goals: Array.isArray(record.goals) ? record.goals.join(', ') : '',
      allies: Array.isArray(record.allies) ? record.allies.join(', ') : '',
      enemies: Array.isArray(record.enemies) ? record.enemies.join(', ') : '',
      tags: Array.isArray(record.tags) ? record.tags.join(', ') : '',
      lastActivityAt: record.lastActivityAt ? toDateTimeInputValue(record.lastActivityAt) : ''
    })
    setEditor({ open: true, mode: 'edit', record })
  }

  const closeEditor = () => {
    setEditor((prev) => ({ ...prev, open: false }))
    resetForm()
  }

  const handleCampaignChange = (nextCampaignIds) => {
    setForm((prev) => ({ ...prev, campaignIds: nextCampaignIds }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.name.trim()) return

    const payload = {
      name: form.name.trim(),
      alignment: form.alignment.trim(),
      summary: form.summary.trim(),
      influence: form.influence.trim(),
      worldId: form.worldId,
      visibility: form.visibility,
      campaignIds: form.campaignIds,
      goals: form.goals
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      allies: form.allies
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      enemies: form.enemies
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      tags: form.tags
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      lastActivityAt: fromDateTimeInputValue(form.lastActivityAt)
    }

    if (editor.mode === 'edit' && editor.record) {
      onSave?.({ ...payload, id: editor.record.id }, 'edit')
    } else {
      onSave?.(payload, 'create')
    }

    closeEditor()
  }

  const openViewer = (record) => {
    if (!record) return
    setViewer({ open: true, recordId: record.id })
  }

  const closeViewer = () => {
    setViewer({ open: false, recordId: null })
  }

  useEffect(() => {
    if (!focusId) return
    const match = records.find((organisation) => organisation.id === focusId)
    if (match) {
      setViewer({ open: true, recordId: focusId })
      onClearFocus?.()
    }
  }, [focusId, records, onClearFocus])

  useEffect(() => {
    if (viewer.open && !currentViewerRecord) {
      setViewer({ open: false, recordId: null })
    }
  }, [viewer.open, currentViewerRecord])

  const handleRelationshipNavigate = (type, id) => {
    if (type === 'organisation') {
      const match = records.find((organisation) => organisation.id === id)
      if (match) {
        setViewer({ open: true, recordId: id })
        return
      }
    }
    onNavigateEntity?.(type, id)
  }

  const handleDelete = (recordId) => {
    if (!onDelete) return
    if (!window.confirm('Delete this organisation?')) return
    onDelete(recordId)
  }

  return (
    <>
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
        onCreate={canManage ? openCreate : undefined}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
        onView={openViewer}
      />

      {canManage && (
        <FormModal
          open={editor.open}
          title={editor.mode === 'edit' ? 'Edit organisation' : 'Add organisation'}
          onClose={closeEditor}
          actions={
            <>
              <button type="button" className="ghost" onClick={closeEditor}>
                Cancel
              </button>
              <button type="submit" className="primary" form={formId}>
                {editor.mode === 'edit' ? 'Save organisation' : 'Create organisation'}
              </button>
            </>
          }
        >
          <form id={formId} className="drawer-form" onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input
                required
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label>
              <span>Alignment</span>
              <input
                type="text"
                value={form.alignment}
                onChange={(event) => setForm((prev) => ({ ...prev, alignment: event.target.value }))}
              />
            </label>

            <label>
              <span>World</span>
              <select
                value={form.worldId}
                onChange={(event) => setForm((prev) => ({ ...prev, worldId: event.target.value }))}
              >
                <option value="">Unassigned world</option>
                {worlds.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Visibility</span>
              <select
                value={form.visibility}
                onChange={(event) => setForm((prev) => ({ ...prev, visibility: event.target.value }))}
              >
                <option value="public">All adventurers</option>
                <option value="campaign">Campaign</option>
                <option value="party">Party</option>
                <option value="character">Personal</option>
                <option value="dm">Dungeon Masters</option>
              </select>
            </label>

            <ListCollector
              label="Linked campaigns"
              options={campaigns.map((campaign) => ({
                id: campaign.id,
                label: campaign.name
              }))}
              selectedIds={form.campaignIds}
              onChange={handleCampaignChange}
              placeholder="Add a campaign"
              emptyMessage="No campaigns available."
              noSelectionMessage="No campaigns linked."
            />

            <label>
              <span>Goals (comma separated)</span>
              <input
                type="text"
                value={form.goals}
                onChange={(event) => setForm((prev) => ({ ...prev, goals: event.target.value }))}
              />
            </label>

            <label>
              <span>Allies (comma separated)</span>
              <input
                type="text"
                value={form.allies}
                onChange={(event) => setForm((prev) => ({ ...prev, allies: event.target.value }))}
              />
            </label>

            <label>
              <span>Adversaries (comma separated)</span>
              <input
                type="text"
                value={form.enemies}
                onChange={(event) => setForm((prev) => ({ ...prev, enemies: event.target.value }))}
              />
            </label>

            <label>
              <span>Tags (comma separated)</span>
              <input
                type="text"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              />
            </label>

            <label>
              <span>Influence</span>
              <textarea
                rows={3}
                value={form.influence}
                onChange={(event) => setForm((prev) => ({ ...prev, influence: event.target.value }))}
              />
            </label>

            <label>
              <span>Summary</span>
              <textarea
                rows={3}
                value={form.summary}
                onChange={(event) => setForm((prev) => ({ ...prev, summary: event.target.value }))}
              />
            </label>

            <label>
              <span>Last activity</span>
              <input
                type="datetime-local"
                value={form.lastActivityAt}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lastActivityAt: event.target.value }))
                }
              />
            </label>
          </form>
        </FormModal>
      )}

      <RecordDrawer
        open={viewer.open && Boolean(currentViewerRecord)}
        title={currentViewerRecord ? currentViewerRecord.name : 'Organisation detail'}
        subtitle={currentViewerRecord?.alignment || undefined}
        onClose={closeViewer}
      >
        {currentViewerRecord ? (
          <DrawerTabs
            tabs={[
              {
                id: 'organisation-dossier',
                label: 'Dossier',
                content: (
                  <div className="drawer-stack">
                    <section className="drawer-subsection">
                      <div className="drawer-field-grid">
                        <div>
                          <h4>World</h4>
                          <p>{worldLookup.get(currentViewerRecord.worldId) || 'Unassigned'}</p>
                        </div>
                        <div>
                          <h4>Alignment</h4>
                          <p>{currentViewerRecord.alignment || 'Unaligned'}</p>
                        </div>
                        <div>
                          <h4>Last activity</h4>
                          <p>{formatRelativeTime(currentViewerRecord.lastActivityAt)}</p>
                        </div>
                      </div>
                      <div>
                        <h4>Summary</h4>
                        <p>{currentViewerRecord.summary || 'No intelligence captured yet.'}</p>
                      </div>
                      {currentViewerRecord.influence && (
                        <div>
                          <h4>Influence</h4>
                          <p>{currentViewerRecord.influence}</p>
                        </div>
                      )}
                      {Array.isArray(currentViewerRecord.goals) && currentViewerRecord.goals.length > 0 && (
                        <div>
                          <h4>Current objectives</h4>
                          <ul className="drawer-list">
                            {currentViewerRecord.goals.map((goal) => (
                              <li key={goal}>{goal}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(Array.isArray(currentViewerRecord.allies) && currentViewerRecord.allies.length > 0) ||
                      (Array.isArray(currentViewerRecord.enemies) && currentViewerRecord.enemies.length > 0) ? (
                        <div className="drawer-allies-enemies">
                          {Array.isArray(currentViewerRecord.allies) && currentViewerRecord.allies.length > 0 && (
                            <div>
                              <h4>Allies</h4>
                              <div className="knowledge-chip-row">
                                {currentViewerRecord.allies.map((ally) => (
                                  <span key={ally} className="knowledge-chip knowledge-chip--ally">
                                    {ally}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {Array.isArray(currentViewerRecord.enemies) && currentViewerRecord.enemies.length > 0 && (
                            <div>
                              <h4>Adversaries</h4>
                              <div className="knowledge-chip-row">
                                {currentViewerRecord.enemies.map((enemy) => (
                                  <span key={enemy} className="knowledge-chip knowledge-chip--enemy">
                                    {enemy}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                      {Array.isArray(currentViewerRecord.tags) && currentViewerRecord.tags.length > 0 && (
                        <div>
                          <h4>Tags</h4>
                          <div className="knowledge-chip-row">
                            {currentViewerRecord.tags.map((tag) => (
                              <span key={tag} className="knowledge-chip knowledge-chip--tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                )
              },
              {
                id: 'organisation-dm-controls',
                label: 'DM controls',
                content: (
                  <div className="drawer-stack">
                    <section className="drawer-subsection">
                      <div className="drawer-field-grid">
                        <div>
                          <h4>Visibility</h4>
                          <p>{(currentViewerRecord.visibility || 'campaign').toUpperCase()}</p>
                          {organisationAudienceDescription && <p className="helper-text">{organisationAudienceDescription}</p>}
                        </div>
                        <div>
                          <h4>Campaign access</h4>
                          {organisationCampaignNames.length > 0 ? (
                            <ul className="drawer-list">
                              {organisationCampaignNames.map((name) => (
                                <li key={name}>{name}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="helper-text">No campaigns linked.</p>
                          )}
                        </div>
                      </div>
                    </section>
                  </div>
                )
              },
              {
                id: 'organisation-relationships',
                label: 'Relationships',
                content: (
                  <div className="drawer-stack">
                    <EntityRelationshipManager
                      entity={currentViewerRecord}
                      entityType="organisation"
                      relationships={relationships}
                      relationshipTypes={relationshipTypes}
                      entityDirectory={entityDirectory}
                      onCreateRelationship={onCreateRelationship}
                      onDeleteRelationship={onDeleteRelationship}
                      onNavigate={handleRelationshipNavigate}
                      canManage={canManage}
                    />
                  </div>
                )
              }
            ]}
          />
        ) : (
          <p className="helper-text">Select an organisation to review its dossier.</p>
        )}
      </RecordDrawer>
    </>
  )
}

function RaceLibrary({
  records,
  totalCount,
  contextDescription,
  worldLookup,
  worlds = [],
  onSave,
  onDelete
}) {
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

  const canManage = typeof onSave === 'function'
  const formId = useMemo(() => newId('race-form'), [])
  const [editor, setEditor] = useState({ open: false, mode: 'create', record: null })
  const [form, setForm] = useState(() => ({
    name: '',
    availability: 'Common',
    worldId: worlds[0]?.id ?? '',
    favoredClasses: '',
    traits: '',
    description: ''
  }))

  const resetForm = () => {
    setForm({
      name: '',
      availability: 'Common',
      worldId: worlds[0]?.id ?? '',
      favoredClasses: '',
      traits: '',
      description: ''
    })
  }

  const openCreate = () => {
    resetForm()
    setEditor({ open: true, mode: 'create', record: null })
  }

  const openEdit = (record) => {
    setForm({
      name: record.name || '',
      availability: record.availability || 'Common',
      worldId: record.worldId || worlds[0]?.id || '',
      favoredClasses: Array.isArray(record.favoredClasses) ? record.favoredClasses.join(', ') : '',
      traits: Array.isArray(record.traits) ? record.traits.join(', ') : '',
      description: record.description || ''
    })
    setEditor({ open: true, mode: 'edit', record })
  }

  const closeEditor = () => {
    setEditor((prev) => ({ ...prev, open: false }))
    resetForm()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.name.trim()) return

    const payload = {
      name: form.name.trim(),
      availability: form.availability.trim() || 'Common',
      worldId: form.worldId,
      favoredClasses: form.favoredClasses
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      traits: form.traits
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      description: form.description.trim()
    }

    if (editor.mode === 'edit' && editor.record) {
      onSave?.({ ...payload, id: editor.record.id }, 'edit')
    } else {
      onSave?.(payload, 'create')
    }

    closeEditor()
  }

  const handleDelete = (recordId) => {
    if (!onDelete) return
    if (!window.confirm('Delete this ancestry?')) return
    onDelete(recordId)
  }

  return (
    <>
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
        onCreate={canManage ? openCreate : undefined}
        onEdit={canManage ? openEdit : undefined}
        onDelete={canManage ? handleDelete : undefined}
      />

      {canManage && (
        <FormModal
          open={editor.open}
          title={editor.mode === 'edit' ? 'Edit ancestry' : 'Add ancestry'}
          onClose={closeEditor}
          actions={
            <>
              <button type="button" className="ghost" onClick={closeEditor}>
                Cancel
              </button>
              <button type="submit" className="primary" form={formId}>
                {editor.mode === 'edit' ? 'Save ancestry' : 'Create ancestry'}
              </button>
            </>
          }
        >
          <form id={formId} className="drawer-form" onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input
                required
                type="text"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>

            <label>
              <span>Availability</span>
              <input
                type="text"
                value={form.availability}
                onChange={(event) => setForm((prev) => ({ ...prev, availability: event.target.value }))}
              />
            </label>

            <label>
              <span>World</span>
              <select
                value={form.worldId}
                onChange={(event) => setForm((prev) => ({ ...prev, worldId: event.target.value }))}
              >
                <option value="">Unassigned world</option>
                {worlds.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Favoured classes (comma separated)</span>
              <input
                type="text"
                value={form.favoredClasses}
                onChange={(event) => setForm((prev) => ({ ...prev, favoredClasses: event.target.value }))}
              />
            </label>

            <label>
              <span>Signature traits (comma separated)</span>
              <input
                type="text"
                value={form.traits}
                onChange={(event) => setForm((prev) => ({ ...prev, traits: event.target.value }))}
              />
            </label>

            <label>
              <span>Description</span>
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
          </form>
        </FormModal>
      )}
    </>
  )
}

function App() {
  const storedState = useMemo(() => readStoredState(STORAGE_KEY, null), [])
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
  const [locationTypes, setLocationTypes] = useState(() =>
    Array.isArray(storedState?.locationTypes) ? storedState.locationTypes : seededLocationTypes
  )
  const [locations, setLocations] = useState(() =>
    Array.isArray(storedState?.locations) ? storedState.locations : seededLocations
  )
  const [organisations, setOrganisations] = useState(() =>
    Array.isArray(storedState?.organisations) ? storedState.organisations : seededOrganisations
  )
  const [relationshipTypes, setRelationshipTypes] = useState(() =>
    Array.isArray(storedState?.relationshipTypes)
      ? storedState.relationshipTypes
      : seededRelationshipTypes
  )
  const [relationships, setRelationships] = useState(() => {
    if (Array.isArray(storedState?.relationships)) {
      return storedState.relationships.map((relationship) => {
        const { kindId, ...rest } = relationship || {}
        const typeId = relationship?.typeId || kindId || ''
        return { ...rest, typeId }
      })
    }
    return seededRelationships
  })
  const [races, setRaces] = useState(() => (Array.isArray(storedState?.races) ? storedState.races : seededRaces))
  const [appContext, setAppContext] = useState(() => {
    if (storedState?.appContext && typeof storedState.appContext === 'object') {
      return {
        campaignId: storedState.appContext.campaignId || '',
        characterId: storedState.appContext.characterId || ''
      }
    }
    return { campaignId: '', characterId: '' }
  })
  const [pendingRelationshipFocus, setPendingRelationshipFocus] = useState({
    npcId: null,
    organisationId: null,
    locationId: null
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

  const handleRelationshipNavigation = useCallback(
    (type, id) => {
      if (!type || !id) return
      if (type === 'npc') {
        setPendingRelationshipFocus((prev) => ({ ...prev, npcId: id }))
        navigate('/npcs')
        return
      }
      if (type === 'location') {
        setPendingRelationshipFocus((prev) => ({ ...prev, locationId: id }))
        navigate('/locations')
        return
      }
      if (type === 'organisation') {
        setPendingRelationshipFocus((prev) => ({ ...prev, organisationId: id }))
        navigate('/organisations')
        return
      }
      if (type === 'user') {
        setActiveSectionId('users')
        navigate('/admin')
      }
    },
    [navigate, setActiveSectionId]
  )

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
      canManageCampaigns: derivedPermissions.has('manage-campaigns'),
      canManageLocationTypes: derivedPermissions.has('manage-location-types'),
      canManageRelationshipTypes: derivedPermissions.has('manage-relationship-types')
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

  const knowledgeCampaigns = useMemo(() => {
    if (isWorldBuilder) {
      return campaigns
    }

    if (!hasDmVision) {
      return []
    }

    return accessibleCampaigns.filter((campaign) => {
      if (!Array.isArray(campaign.assignments)) return false
      return campaign.assignments.some((assignment) => {
        if (assignment.userId !== authenticatedUserId) return false
        const roleName = roles.find((role) => role.id === assignment.roleId)?.name
        return roleName === 'Dungeon Master'
      })
    })
  }, [
    isWorldBuilder,
    hasDmVision,
    campaigns,
    accessibleCampaigns,
    authenticatedUserId,
    roles
  ])

  const knowledgeCharacters = useMemo(() => {
    if (isWorldBuilder) {
      return characters
    }

    const managedCampaignIds = new Set(knowledgeCampaigns.map((campaign) => campaign.id))
    if (managedCampaignIds.size === 0) {
      return []
    }

    return characters.filter((character) => managedCampaignIds.has(character.campaignId))
  }, [isWorldBuilder, knowledgeCampaigns, characters])

  const knowledgeWorlds = useMemo(() => {
    if (isWorldBuilder) {
      return worlds
    }

    const managedWorldIds = new Set(
      knowledgeCampaigns
        .map((campaign) => campaign.worldId)
        .filter(Boolean)
    )

    if (managedWorldIds.size === 0) {
      return []
    }

    return worlds.filter((world) => managedWorldIds.has(world.id))
  }, [isWorldBuilder, knowledgeCampaigns, worlds])

  const canManageKnowledge = useMemo(
    () => isWorldBuilder || knowledgeCampaigns.length > 0,
    [isWorldBuilder, knowledgeCampaigns]
  )

  const canManageRaces = isWorldBuilder

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

  const entityDirectory = useMemo(
    () => ({
      npc: {
        label: 'NPC',
        records: npcs,
        getName: (record) => record?.name || 'Unknown NPC',
        route: '/npcs'
      },
      character: {
        label: 'Character',
        records: characters,
        getName: (record) => record?.name || 'Unknown character',
        route: '/characters'
      },
      location: {
        label: 'Location',
        records: locations,
        getName: (record) => record?.name || 'Unknown location',
        route: '/locations'
      },
      organisation: {
        label: 'Organisation',
        records: organisations,
        getName: (record) => record?.name || 'Unknown organisation',
        route: '/organisations'
      },
      user: {
        label: 'User',
        records: users,
        getName: (record) => record?.displayName || record?.username || record?.email || 'User',
        route: '/admin'
      }
    }),
    [npcs, characters, locations, organisations, users]
  )

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
    writeStoredState(STORAGE_KEY, {
      users,
      roles,
      campaigns,
      worlds,
      characters,
      npcs,
      locationTypes,
      locations,
      organisations,
      relationshipTypes,
      relationships,
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
    locationTypes,
    locations,
    organisations,
    relationshipTypes,
    relationships,
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
    setRelationships((prev) =>
      prev.filter(
        (relationship) =>
          !(
            (relationship.source.type === 'user' && relationship.source.id === userId) ||
            (relationship.target.type === 'user' && relationship.target.id === userId)
          )
      )
    )
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

  const handleSaveNpc = (payload, mode) => {
    const normalized = {
      ...payload,
      status: payload.status || 'Unknown',
      causeOfDeath: payload.status === 'Dead' ? payload.causeOfDeath || '' : '',
      worldId: payload.worldId || '',
      campaignIds: Array.isArray(payload.campaignIds) ? payload.campaignIds : [],
      characterIds: Array.isArray(payload.characterIds) ? payload.characterIds : [],
      visibility: payload.visibility || 'campaign',
      raceId: payload.raceId || '',
      locationId: payload.locationId || '',
      hometownId: payload.hometownId || '',
      updatedAt: new Date().toISOString()
    }

    if (mode === 'edit') {
      setNpcs((prev) =>
        prev.map((npc) => (npc.id === payload.id ? { ...npc, ...normalized } : npc))
      )
      return
    }

    setNpcs((prev) => [
      ...prev,
      {
        ...normalized,
        id: newId('npc'),
        createdAt: new Date().toISOString()
      }
    ])
  }

  const handleDeleteNpc = (npcId) => {
    setNpcs((prev) => prev.filter((npc) => npc.id !== npcId))
    setRelationships((prev) =>
      prev.filter(
        (relationship) =>
          !(
            (relationship.source.type === 'npc' && relationship.source.id === npcId) ||
            (relationship.target.type === 'npc' && relationship.target.id === npcId)
          )
      )
    )
  }

  const handleSaveLocation = (payload, mode) => {
    const { type: _legacyType, ...restPayload } = payload || {}
    const normalized = {
      ...restPayload,
      typeId: payload.typeId || '',
      parentId: payload.parentId || '',
      worldId: payload.worldId || '',
      campaignIds: Array.isArray(payload.campaignIds) ? payload.campaignIds : [],
      characterIds: Array.isArray(payload.characterIds) ? payload.characterIds : [],
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      visibility: payload.visibility || 'campaign',
      lastScoutedAt: payload.lastScoutedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (mode === 'edit') {
      setLocations((prev) =>
        prev.map((location) =>
          location.id === payload.id ? { ...location, ...normalized } : location
        )
      )
      return
    }

    setLocations((prev) => [
      ...prev,
      {
        ...normalized,
        id: newId('location'),
        createdAt: new Date().toISOString()
      }
    ])
  }

  const handleDeleteLocation = (locationId) => {
    setLocations((prev) =>
      prev
        .filter((location) => location.id !== locationId)
        .map((location) =>
          location.parentId === locationId ? { ...location, parentId: '' } : location
        )
    )
    setNpcs((prev) =>
      prev.map((npc) => {
        const nextLocationId = npc.locationId === locationId ? '' : npc.locationId
        const nextHometownId = npc.hometownId === locationId ? '' : npc.hometownId
        if (nextLocationId !== npc.locationId || nextHometownId !== npc.hometownId) {
          return { ...npc, locationId: nextLocationId, hometownId: nextHometownId }
        }
        return npc
      })
    )
  }

  const handleSaveOrganisation = (payload, mode) => {
    const normalized = {
      ...payload,
      worldId: payload.worldId || '',
      campaignIds: Array.isArray(payload.campaignIds) ? payload.campaignIds : [],
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      goals: Array.isArray(payload.goals) ? payload.goals : [],
      allies: Array.isArray(payload.allies) ? payload.allies : [],
      enemies: Array.isArray(payload.enemies) ? payload.enemies : [],
      visibility: payload.visibility || 'campaign',
      lastActivityAt: payload.lastActivityAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (mode === 'edit') {
      setOrganisations((prev) =>
        prev.map((organisation) =>
          organisation.id === payload.id ? { ...organisation, ...normalized } : organisation
        )
      )
      return
    }

    setOrganisations((prev) => [
      ...prev,
      {
        ...normalized,
        id: newId('organisation'),
        createdAt: new Date().toISOString()
      }
    ])
  }

  const handleDeleteOrganisation = (organisationId) => {
    setOrganisations((prev) => prev.filter((organisation) => organisation.id !== organisationId))
    setRelationships((prev) =>
      prev.filter(
        (relationship) =>
          !(
            (relationship.source.type === 'organisation' &&
              relationship.source.id === organisationId) ||
            (relationship.target.type === 'organisation' && relationship.target.id === organisationId)
          )
      )
    )
  }

  const handleSaveLocationType = (payload, mode) => {
    const normalized = {
      ...payload,
      name: payload.name.trim(),
      description: payload.description?.trim() || ''
    }

    if (mode === 'edit') {
      setLocationTypes((prev) =>
        prev.map((type) => (type.id === payload.id ? { ...type, ...normalized } : type))
      )
      return
    }

    setLocationTypes((prev) => [
      ...prev,
      {
        ...normalized,
        id: newId('location-type')
      }
    ])
  }

  const handleDeleteLocationType = (typeId) => {
    setLocationTypes((prev) => prev.filter((type) => type.id !== typeId))
    setLocations((prev) =>
      prev.map((location) => (location.typeId === typeId ? { ...location, typeId: '' } : location))
    )
  }

  const handleSaveRelationshipType = (payload, mode) => {
    const allowedSources = Array.isArray(payload.allowedSources) ? payload.allowedSources : []
    const allowedTargets = Array.isArray(payload.allowedTargets) ? payload.allowedTargets : []

    const normalized = {
      ...payload,
      name: payload.name.trim(),
      category: payload.category?.trim() || '',
      forwardLabel: payload.forwardLabel?.trim() || payload.name.trim(),
      reverseLabel: payload.reverseLabel?.trim() || payload.name.trim(),
      allowedSources: Array.from(new Set(allowedSources)).filter(Boolean),
      allowedTargets: Array.from(new Set(allowedTargets)).filter(Boolean)
    }

    if (mode === 'edit') {
      setRelationshipTypes((prev) =>
        prev.map((type) => (type.id === payload.id ? { ...type, ...normalized } : type))
      )
      return
    }

    setRelationshipTypes((prev) => [
      ...prev,
      {
        ...normalized,
        id: newId('relationship-type')
      }
    ])
  }

  const handleDeleteRelationshipType = (typeId) => {
    setRelationshipTypes((prev) => prev.filter((type) => type.id !== typeId))
    setRelationships((prev) => prev.filter((relationship) => relationship.typeId !== typeId))
  }

  const handleCreateRelationship = ({ typeId, orientation, source, target, note }) => {
    if (!typeId || !source || !target) return
    const trimmedNote = note ? note.trim() : ''
    setRelationships((prev) => [
      ...prev,
      {
        id: newId('relationship'),
        typeId,
        orientation: orientation === 'reverse' ? 'reverse' : 'forward',
        source,
        target,
        note: trimmedNote,
        createdAt: new Date().toISOString()
      }
    ])
  }

  const handleDeleteRelationship = (relationshipId) => {
    setRelationships((prev) => prev.filter((relationship) => relationship.id !== relationshipId))
  }

  const handleSaveRace = (payload, mode) => {
    const normalized = {
      ...payload,
      name: payload.name.trim(),
      worldId: payload.worldId || '',
      favoredClasses: Array.isArray(payload.favoredClasses) ? payload.favoredClasses : [],
      traits: Array.isArray(payload.traits) ? payload.traits : [],
      availability: payload.availability || 'Common',
      updatedAt: new Date().toISOString()
    }

    if (mode === 'edit') {
      setRaces((prev) =>
        prev.map((race) => (race.id === payload.id ? { ...race, ...normalized } : race))
      )
      return
    }

    setRaces((prev) => [
      ...prev,
      {
        ...normalized,
        id: newId('race')
      }
    ])
  }

  const handleDeleteRace = (raceId) => {
    setRaces((prev) => prev.filter((race) => race.id !== raceId))
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
        relationships={relationships}
        relationshipTypes={relationshipTypes}
        entityDirectory={entityDirectory}
        onCreateRelationship={handleCreateRelationship}
        onDeleteRelationship={handleDeleteRelationship}
        onNavigateEntity={handleRelationshipNavigation}
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
        campaigns={knowledgeCampaigns}
        characters={knowledgeCharacters}
        worlds={knowledgeWorlds}
        locations={locations}
        races={races}
        onSave={canManageKnowledge ? handleSaveNpc : undefined}
        onDelete={canManageKnowledge ? handleDeleteNpc : undefined}
        relationships={relationships}
        relationshipTypes={relationshipTypes}
        entityDirectory={entityDirectory}
        onCreateRelationship={handleCreateRelationship}
        onDeleteRelationship={handleDeleteRelationship}
        onNavigateEntity={handleRelationshipNavigation}
        focusId={pendingRelationshipFocus.npcId}
        onClearFocus={() =>
          setPendingRelationshipFocus((prev) => ({ ...prev, npcId: null }))
        }
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
        campaigns={knowledgeCampaigns}
        characters={knowledgeCharacters}
        worlds={knowledgeWorlds}
        onSave={canManageKnowledge ? handleSaveLocation : undefined}
        onDelete={canManageKnowledge ? handleDeleteLocation : undefined}
        locationTypes={locationTypes}
        relationships={relationships}
        relationshipTypes={relationshipTypes}
        entityDirectory={entityDirectory}
        onCreateRelationship={handleCreateRelationship}
        onDeleteRelationship={handleDeleteRelationship}
        onNavigateEntity={handleRelationshipNavigation}
        focusId={pendingRelationshipFocus.locationId}
        onClearFocus={() =>
          setPendingRelationshipFocus((prev) => ({ ...prev, locationId: null }))
        }
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
        campaigns={knowledgeCampaigns}
        worlds={knowledgeWorlds}
        onSave={canManageKnowledge ? handleSaveOrganisation : undefined}
        onDelete={canManageKnowledge ? handleDeleteOrganisation : undefined}
        relationships={relationships}
        relationshipTypes={relationshipTypes}
        entityDirectory={entityDirectory}
        onCreateRelationship={handleCreateRelationship}
        onDeleteRelationship={handleDeleteRelationship}
        onNavigateEntity={handleRelationshipNavigation}
        focusId={pendingRelationshipFocus.organisationId}
        onClearFocus={() =>
          setPendingRelationshipFocus((prev) => ({ ...prev, organisationId: null }))
        }
      />
    )
  } else if (pathMatches(currentPath, '/races')) {
    mainContent = (
      <RaceLibrary
        records={sortedRaces}
        totalCount={races.length}
        contextDescription={knowledgeContextDescription}
        worldLookup={worldLookup}
        worlds={knowledgeWorlds}
        onSave={canManageRaces ? handleSaveRace : undefined}
        onDelete={canManageRaces ? handleDeleteRace : undefined}
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
        locationTypes={locationTypes}
        relationshipTypes={relationshipTypes}
        onSaveLocationType={handleSaveLocationType}
        onDeleteLocationType={handleDeleteLocationType}
        onSaveRelationshipType={handleSaveRelationshipType}
        onDeleteRelationshipType={handleDeleteRelationshipType}
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
  onSelectCampaign,
  relationships = [],
  relationshipTypes = [],
  entityDirectory = {},
  onCreateRelationship,
  onDeleteRelationship,
  onNavigateEntity
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
  const [relationshipDrawer, setRelationshipDrawer] = useState({ open: false, recordId: null })

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

  const canManageRelationships = typeof onCreateRelationship === 'function'

  const currentRelationshipRecord = useMemo(
    () =>
      relationshipDrawer.recordId
        ? characters.find((character) => character.id === relationshipDrawer.recordId) || null
        : null,
    [characters, relationshipDrawer.recordId]
  )

  const openRelationships = (character) => {
    setRelationshipDrawer({ open: true, recordId: character.id })
  }

  const closeRelationshipDrawer = () => {
    setRelationshipDrawer({ open: false, recordId: null })
  }

  useEffect(() => {
    if (relationshipDrawer.open && !currentRelationshipRecord) {
      closeRelationshipDrawer()
    }
  }, [relationshipDrawer.open, currentRelationshipRecord])

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
                        openRelationships(character)
                      }}
                    >
                      Relationships
                    </button>
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

      <RecordDrawer
        open={relationshipDrawer.open && Boolean(currentRelationshipRecord)}
        title={currentRelationshipRecord ? currentRelationshipRecord.name : 'Character relationships'}
        subtitle={
          currentRelationshipRecord
            ? `${currentRelationshipRecord.className || 'Adventurer'} · Level ${
                currentRelationshipRecord.level || 1
              }`
            : undefined
        }
        onClose={closeRelationshipDrawer}
      >
        {currentRelationshipRecord ? (
          <div className="drawer-stack">
            <section className="drawer-subsection">
              <div className="drawer-field-grid">
                <div>
                  <h4>Ancestry</h4>
                  <p>{currentRelationshipRecord.ancestry || 'Unknown'}</p>
                </div>
                <div>
                  <h4>Class</h4>
                  <p>{currentRelationshipRecord.className || 'Unassigned class'}</p>
                </div>
                <div>
                  <h4>Campaign</h4>
                  <p>
                    {currentRelationshipRecord.campaignId
                      ? campaignLookup.get(currentRelationshipRecord.campaignId) || 'Unknown campaign'
                      : 'No campaign'}
                  </p>
                </div>
              </div>
            </section>

            <EntityRelationshipManager
              entity={currentRelationshipRecord}
              entityType="character"
              relationships={relationships}
              relationshipTypes={relationshipTypes}
              entityDirectory={entityDirectory}
              onCreateRelationship={onCreateRelationship}
              onDeleteRelationship={onDeleteRelationship}
              onNavigate={onNavigateEntity}
              canManage={canManageRelationships}
            />
          </div>
        ) : (
          <p className="helper-text">Select a character to review their connections.</p>
        )}
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
  worlds,
  locationTypes = [],
  relationshipTypes = [],
  onSaveLocationType,
  onDeleteLocationType,
  onSaveRelationshipType,
  onDeleteRelationshipType
}) {
  const [userDrawer, setUserDrawer] = useState({ open: false, mode: 'create', record: null })
  const [roleDrawer, setRoleDrawer] = useState({ open: false, mode: 'create', record: null })
  const [campaignDrawer, setCampaignDrawer] = useState({ open: false, mode: 'create', record: null })
  const [locationTypeDrawer, setLocationTypeDrawer] = useState({ open: false, mode: 'create', record: null })
  const [relationshipTypeDrawer, setRelationshipTypeDrawer] = useState({
    open: false,
    mode: 'create',
    record: null
  })

  const userFormId = 'user-record-form'
  const roleFormId = 'role-record-form'
  const campaignFormId = 'campaign-record-form'
  const locationTypeFormId = 'location-type-record-form'
  const relationshipTypeFormId = 'relationship-type-record-form'

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
  const [locationTypeForm, setLocationTypeForm] = useState({ name: '', description: '' })
  const [relationshipTypeForm, setRelationshipTypeForm] = useState({
    name: '',
    category: '',
    forwardLabel: '',
    reverseLabel: '',
    allowedSources: [],
    allowedTargets: []
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

  const relationshipEntityLabelMap = useMemo(() => {
    const map = new Map()
    RELATIONSHIP_ENTITY_OPTIONS.forEach((option) => {
      map.set(option.id, option.label)
    })
    return map
  }, [])

  const describeEntityList = useCallback(
    (values) => {
      if (!Array.isArray(values) || values.length === 0) {
        return '—'
      }
      return values
        .map((value) => relationshipEntityLabelMap.get(value) || value)
        .filter(Boolean)
        .join(', ')
    },
    [relationshipEntityLabelMap]
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

  const handleRequestDeleteLocationType = (typeId) => {
    const record = locationTypes.find((type) => type.id === typeId)
    requestDeleteConfirmation({
      noun: 'location type',
      detail: record?.name,
      onConfirm: () => onDeleteLocationType?.(typeId)
    })
  }

  const handleRequestDeleteRelationshipType = (typeId) => {
    const record = relationshipTypes.find((type) => type.id === typeId)
    requestDeleteConfirmation({
      noun: 'relationship type',
      detail: record?.name,
      onConfirm: () => onDeleteRelationshipType?.(typeId)
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

  useEffect(() => {
    if (!locationTypeDrawer.open) {
      setLocationTypeForm({ name: '', description: '' })
    }
  }, [locationTypeDrawer.open])

  useEffect(() => {
    if (!relationshipTypeDrawer.open) {
      setRelationshipTypeForm({
        name: '',
        category: '',
        forwardLabel: '',
        reverseLabel: '',
        allowedSources: [],
        allowedTargets: []
      })
    }
  }, [relationshipTypeDrawer.open])

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
  const closeLocationTypeDrawer = () =>
    setLocationTypeDrawer((prev) => ({ ...prev, open: false }))
  const closeRelationshipTypeDrawer = () =>
    setRelationshipTypeDrawer((prev) => ({ ...prev, open: false }))

  const openCreateLocationType = () => {
    setLocationTypeForm({ name: '', description: '' })
    setLocationTypeDrawer({ open: true, mode: 'create', record: null })
  }

  const openEditLocationType = (record) => {
    setLocationTypeForm({ name: record.name || '', description: record.description || '', id: record.id })
    setLocationTypeDrawer({ open: true, mode: 'edit', record })
  }

  const openCreateRelationshipType = () => {
    setRelationshipTypeForm({
      name: '',
      category: '',
      forwardLabel: '',
      reverseLabel: '',
      allowedSources: [],
      allowedTargets: []
    })
    setRelationshipTypeDrawer({ open: true, mode: 'create', record: null })
  }

  const openEditRelationshipType = (record) => {
    setRelationshipTypeForm({
      id: record.id,
      name: record.name || '',
      category: record.category || '',
      forwardLabel: record.forwardLabel || '',
      reverseLabel: record.reverseLabel || '',
      allowedSources: Array.isArray(record.allowedSources) ? record.allowedSources : [],
      allowedTargets: Array.isArray(record.allowedTargets) ? record.allowedTargets : []
    })
    setRelationshipTypeDrawer({ open: true, mode: 'edit', record })
  }

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

  const locationTypeColumns = useMemo(
    () => [
      { id: 'name', label: 'Location type', accessor: (record) => record.name },
      {
        id: 'description',
        label: 'Description',
        accessor: (record) => record.description || '—',
        defaultVisible: false
      }
    ],
    []
  )

  const relationshipTypeColumns = useMemo(
    () => [
      { id: 'name', label: 'Relationship type', accessor: (record) => record.name },
      { id: 'category', label: 'Category', accessor: (record) => record.category || '—' },
      {
        id: 'forwardLabel',
        label: 'Forward label',
        accessor: (record) => record.forwardLabel || record.name,
        defaultVisible: false
      },
      {
        id: 'reverseLabel',
        label: 'Reverse label',
        accessor: (record) => record.reverseLabel || record.name,
        defaultVisible: false
      },
      {
        id: 'sources',
        label: 'Sources',
        accessor: (record) => describeEntityList(record.allowedSources)
      },
      {
        id: 'targets',
        label: 'Targets',
        accessor: (record) => describeEntityList(record.allowedTargets)
      }
    ],
    [describeEntityList]
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

  const updateRelationshipEntitySelection = (key, optionId, checked) => {
    setRelationshipTypeForm((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : []
      const next = checked
        ? Array.from(new Set([...current, optionId]))
        : current.filter((value) => value !== optionId)
      return { ...prev, [key]: next }
    })
  }

  const handleSubmitLocationType = (event) => {
    event.preventDefault()
    const payload = {
      name: locationTypeForm.name.trim(),
      description: (locationTypeForm.description || '').trim()
    }

    if (!payload.name) {
      return
    }

    if (locationTypeDrawer.mode === 'edit') {
      onSaveLocationType?.({ ...payload, id: locationTypeForm.id }, 'edit')
    } else {
      onSaveLocationType?.(payload, 'create')
    }

    closeLocationTypeDrawer()
  }

  const handleSubmitRelationshipType = (event) => {
    event.preventDefault()
    const payload = {
      name: relationshipTypeForm.name.trim(),
      category: (relationshipTypeForm.category || '').trim(),
      forwardLabel: (relationshipTypeForm.forwardLabel || '').trim(),
      reverseLabel: (relationshipTypeForm.reverseLabel || '').trim(),
      allowedSources: Array.isArray(relationshipTypeForm.allowedSources)
        ? relationshipTypeForm.allowedSources
        : [],
      allowedTargets: Array.isArray(relationshipTypeForm.allowedTargets)
        ? relationshipTypeForm.allowedTargets
        : []
    }

    if (!payload.name) {
      return
    }

    if (payload.allowedSources.length === 0 || payload.allowedTargets.length === 0) {
      if (typeof window !== 'undefined') {
        window.alert('Select at least one source and one target entity type.')
      }
      return
    }

    if (relationshipTypeDrawer.mode === 'edit') {
      onSaveRelationshipType?.({ ...payload, id: relationshipTypeForm.id }, 'edit')
    } else {
      onSaveRelationshipType?.(payload, 'create')
    }

    closeRelationshipTypeDrawer()
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

      {activeSectionId === 'location-types' && (
        <StandardListView
          entityName="Location type"
          columns={locationTypeColumns}
          records={locationTypes}
          onCreate={permissions.canManageLocationTypes ? openCreateLocationType : undefined}
          onEdit={permissions.canManageLocationTypes ? openEditLocationType : undefined}
          onDelete={permissions.canManageLocationTypes ? handleRequestDeleteLocationType : undefined}
          emptyMessage="Define categories to organise your locations."
        />
      )}

      {activeSectionId === 'relationship-types' && (
        <StandardListView
          entityName="Relationship type"
          columns={relationshipTypeColumns}
          records={relationshipTypes}
          onCreate={permissions.canManageRelationshipTypes ? openCreateRelationshipType : undefined}
          onEdit={permissions.canManageRelationshipTypes ? openEditRelationshipType : undefined}
          onDelete={permissions.canManageRelationshipTypes ? handleRequestDeleteRelationshipType : undefined}
          emptyMessage="Create relationship templates to map entity connections."
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

      <RecordDrawer
        open={locationTypeDrawer.open}
        title={locationTypeDrawer.mode === 'edit' ? 'Edit location type' : 'Create location type'}
        onClose={closeLocationTypeDrawer}
        actions={
          <>
            <button type="button" className="ghost" onClick={closeLocationTypeDrawer}>
              Cancel
            </button>
            <button type="submit" className="primary" form={locationTypeFormId}>
              {locationTypeDrawer.mode === 'edit' ? 'Save' : 'Submit'}
            </button>
          </>
        }
      >
        <form id={locationTypeFormId} className="drawer-form" onSubmit={handleSubmitLocationType}>
          <label>
            <span>Name</span>
            <input
              required
              type="text"
              value={locationTypeForm.name}
              onChange={(event) =>
                setLocationTypeForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              rows={3}
              value={locationTypeForm.description}
              onChange={(event) =>
                setLocationTypeForm((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </label>
        </form>
      </RecordDrawer>

      <RecordDrawer
        open={relationshipTypeDrawer.open}
        title={
          relationshipTypeDrawer.mode === 'edit'
            ? 'Edit relationship type'
            : 'Create relationship type'
        }
        onClose={closeRelationshipTypeDrawer}
        actions={
          <>
            <button type="button" className="ghost" onClick={closeRelationshipTypeDrawer}>
              Cancel
            </button>
            <button type="submit" className="primary" form={relationshipTypeFormId}>
              {relationshipTypeDrawer.mode === 'edit' ? 'Save' : 'Submit'}
            </button>
          </>
        }
      >
        <form
          id={relationshipTypeFormId}
          className="drawer-form"
          onSubmit={handleSubmitRelationshipType}
        >
          <label>
            <span>Name</span>
            <input
              required
              type="text"
              value={relationshipTypeForm.name}
              onChange={(event) =>
                setRelationshipTypeForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Category</span>
            <input
              type="text"
              value={relationshipTypeForm.category}
              onChange={(event) =>
                setRelationshipTypeForm((prev) => ({ ...prev, category: event.target.value }))
              }
            />
          </label>

          <label>
            <span>Forward label</span>
            <input
              type="text"
              value={relationshipTypeForm.forwardLabel}
              onChange={(event) =>
                setRelationshipTypeForm((prev) => ({ ...prev, forwardLabel: event.target.value }))
              }
              placeholder="e.g. Mentor of"
            />
          </label>

          <label>
            <span>Reverse label</span>
            <input
              type="text"
              value={relationshipTypeForm.reverseLabel}
              onChange={(event) =>
                setRelationshipTypeForm((prev) => ({ ...prev, reverseLabel: event.target.value }))
              }
              placeholder="e.g. Mentee of"
            />
          </label>

          <fieldset className="roles-fieldset">
            <legend>Source entities</legend>
            {RELATIONSHIP_ENTITY_OPTIONS.map((option) => {
              const fieldId = `relationship-source-${option.id}`
              return (
                <label key={option.id} className="checkbox-option" htmlFor={fieldId}>
                  <input
                    id={fieldId}
                    type="checkbox"
                    checked={relationshipTypeForm.allowedSources.includes(option.id)}
                    onChange={(event) =>
                      updateRelationshipEntitySelection('allowedSources', option.id, event.target.checked)
                    }
                  />
                  {option.label}
                </label>
              )
            })}
            <p className="helper-text">Select all entity types that can initiate this relationship.</p>
          </fieldset>

          <fieldset className="roles-fieldset">
            <legend>Target entities</legend>
            {RELATIONSHIP_ENTITY_OPTIONS.map((option) => {
              const fieldId = `relationship-target-${option.id}`
              return (
                <label key={option.id} className="checkbox-option" htmlFor={fieldId}>
                  <input
                    id={fieldId}
                    type="checkbox"
                    checked={relationshipTypeForm.allowedTargets.includes(option.id)}
                    onChange={(event) =>
                      updateRelationshipEntitySelection('allowedTargets', option.id, event.target.checked)
                    }
                  />
                  {option.label}
                </label>
              )
            })}
            <p className="helper-text">Select all entity types that can be targeted by this relationship.</p>
          </fieldset>
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

function EntityRelationshipManager({
  entity,
  entityType,
  relationships,
  relationshipTypes,
  entityDirectory,
  onCreateRelationship,
  onDeleteRelationship,
  onNavigate,
  canManage
}) {
  const formId = useMemo(() => newId('relationship-form'), [])
  const [editorOpen, setEditorOpen] = useState(false)
  const [form, setForm] = useState({ optionKey: '', targetId: '', note: '' })
  const [formError, setFormError] = useState('')

  const relationshipOptions = useMemo(() => {
    if (!entity || !entityType) return []
    const options = []
    relationshipTypes.forEach((type) => {
      if (!type || !type.id) return
      const allowedSources = Array.isArray(type.allowedSources) ? type.allowedSources : []
      const allowedTargets = Array.isArray(type.allowedTargets) ? type.allowedTargets : []
      const canForward = allowedSources.includes(entityType)
      const canReverse = allowedTargets.includes(entityType)

      if (canForward) {
        options.push({
          key: `${type.id}:forward`,
          typeId: type.id,
          orientation: 'forward',
          label: type.forwardLabel || type.name,
          counterpartTypes: allowedTargets,
          typeName: type.name
        })
      }

      const isSymmetric =
        canForward &&
        canReverse &&
        (type.forwardLabel || type.name) === (type.reverseLabel || type.name) &&
        allowedSources.length === allowedTargets.length &&
        allowedSources.every((value) => allowedTargets.includes(value))

      if (canReverse && !isSymmetric) {
        options.push({
          key: `${type.id}:reverse`,
          typeId: type.id,
          orientation: 'reverse',
          label: type.reverseLabel || type.name,
          counterpartTypes: allowedSources,
          typeName: type.name
        })
      } else if (!canForward && canReverse) {
        options.push({
          key: `${type.id}:reverse`,
          typeId: type.id,
          orientation: 'reverse',
          label: type.reverseLabel || type.name,
          counterpartTypes: allowedSources,
          typeName: type.name
        })
      }
    })

    const unique = new Map()
    options.forEach((option) => {
      if (!option.counterpartTypes || option.counterpartTypes.length === 0) return
      if (unique.has(option.key)) return
      unique.set(option.key, option)
    })
    return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [entity, entityType, relationshipTypes])

  const relevantRelationships = useMemo(() => {
    if (!entity) return []
    const result = []
    relationships.forEach((relationship) => {
      if (!relationship) return
      const isSource =
        relationship.source?.type === entityType && relationship.source?.id === entity.id
      const isTarget =
        relationship.target?.type === entityType && relationship.target?.id === entity.id
      if (!isSource && !isTarget) return

      const type = relationshipTypes.find((candidate) => candidate.id === relationship.typeId)
      const orientation = relationship.orientation === 'reverse' ? 'reverse' : 'forward'
      const counterpartRef = isSource ? relationship.target : relationship.source
      const counterpartRegistry = entityDirectory?.[counterpartRef?.type]
      const counterpartRecord = counterpartRegistry?.records?.find(
        (record) => record && record.id === counterpartRef?.id
      )
      const counterpartName = counterpartRegistry?.getName?.(counterpartRecord) ||
        counterpartRef?.id ||
        'Unknown'
      const typeLabel = counterpartRegistry?.label || 'Entity'

      let label = 'Related to'
      if (type) {
        if (isSource) {
          label = orientation === 'reverse' ? type.reverseLabel || type.name : type.forwardLabel || type.name
        } else {
          label = orientation === 'reverse' ? type.forwardLabel || type.name : type.reverseLabel || type.name
        }
      }

      result.push({
        id: relationship.id,
        label,
        note: relationship.note || '',
        typeName: type?.name || '',
        counterpart: {
          type: counterpartRef?.type,
          id: counterpartRef?.id,
          name: counterpartName,
          typeLabel
        }
      })
    })

    return result.sort((a, b) => a.counterpart.name.localeCompare(b.counterpart.name))
  }, [entity, entityType, relationships, relationshipTypes, entityDirectory])

  const counterpartOptions = useMemo(() => {
    if (!entity) return []
    const option = relationshipOptions.find((candidate) => candidate.key === form.optionKey)
    if (!option) return []

    const choices = []
    option.counterpartTypes.forEach((type) => {
      const registry = entityDirectory?.[type]
      if (!registry || !Array.isArray(registry.records)) return
      registry.records.forEach((record) => {
        if (!record || record.id === entity.id) return
        choices.push({
          value: `${type}:${record.id}`,
          label: registry.getName?.(record) || record.id,
          type,
          id: record.id,
          typeLabel: registry.label || type
        })
      })
    })

    return choices.sort((a, b) => a.label.localeCompare(b.label))
  }, [entity, form.optionKey, entityDirectory, relationshipOptions])

  const resetForm = () => {
    setForm({ optionKey: '', targetId: '', note: '' })
    setFormError('')
  }

  const openEditor = () => {
    resetForm()
    setEditorOpen(true)
  }

  const closeEditor = () => {
    setEditorOpen(false)
    resetForm()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!entity) return
    const option = relationshipOptions.find((candidate) => candidate.key === form.optionKey)
    if (!option) {
      setFormError('Select how this relationship should be described.')
      return
    }
    if (!form.targetId) {
      setFormError('Choose who or what this relationship connects to.')
      return
    }

    const [targetType, targetId] = form.targetId.split(':')
    if (!targetType || !targetId) {
      setFormError('Choose who or what this relationship connects to.')
      return
    }

    const duplicate = relationships.some((relationship) => {
      if (relationship.typeId !== option.typeId) return false
      const matchForward =
        relationship.source?.type === entityType &&
        relationship.source?.id === entity.id &&
        relationship.target?.type === targetType &&
        relationship.target?.id === targetId
      const matchReverse =
        relationship.target?.type === entityType &&
        relationship.target?.id === entity.id &&
        relationship.source?.type === targetType &&
        relationship.source?.id === targetId
      return matchForward || matchReverse
    })

    if (duplicate) {
      setFormError('That relationship is already tracked.')
      return
    }

    onCreateRelationship?.({
      typeId: option.typeId,
      orientation: option.orientation,
      source: { type: entityType, id: entity.id },
      target: { type: targetType, id: targetId },
      note: form.note
    })

    closeEditor()
  }

  return (
    <section className="drawer-subsection">
      <div className="drawer-subsection-header">
        <h4>Relationships</h4>
        {canManage && relationshipOptions.length > 0 && (
          <Button variant="secondary" onClick={openEditor}>
            Add relationship
          </Button>
        )}
      </div>

      {relevantRelationships.length === 0 ? (
        <p className="helper-text">No relationships recorded yet.</p>
      ) : (
        <ul className="relationship-list">
          {relevantRelationships.map((entry) => (
            <li key={entry.id} className="relationship-entry">
              <div className="relationship-entry__header">
                <span className="relationship-entry__label">{entry.label}</span>
                {entry.counterpart?.id && entry.counterpart?.type ? (
                  <button
                    type="button"
                    className="relationship-entry__link"
                    onClick={() => onNavigate?.(entry.counterpart.type, entry.counterpart.id)}
                  >
                    {entry.counterpart.name}
                  </button>
                ) : (
                  <span className="relationship-entry__link relationship-entry__link--disabled">
                    {entry.counterpart?.name}
                  </span>
                )}
              </div>
              <div className="relationship-entry__meta">
                <span className="relationship-entry__tag">{entry.counterpart?.typeLabel || 'Entity'}</span>
                {entry.typeName && (
                  <span className="relationship-entry__tag relationship-entry__tag--muted">
                    {entry.typeName}
                  </span>
                )}
                {canManage && onDeleteRelationship && (
                  <button
                    type="button"
                    className="ghost destructive"
                    onClick={() => onDeleteRelationship(entry.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
              {entry.note && <p className="relationship-entry__note">{entry.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {canManage && relationshipOptions.length === 0 && (
        <p className="helper-text">No compatible relationship types are available for this record.</p>
      )}

      {canManage && (
        <FormModal
          open={editorOpen}
          title="Add relationship"
          onClose={closeEditor}
          actions={
            <>
              <button type="button" className="ghost" onClick={closeEditor}>
                Cancel
              </button>
              <button type="submit" className="primary" form={formId}>
                Save relationship
              </button>
            </>
          }
        >
          <form id={formId} className="drawer-form" onSubmit={handleSubmit}>
            <label>
              <span>Relationship type</span>
              <select
                value={form.optionKey}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, optionKey: event.target.value, targetId: '' }))
                  setFormError('')
                }}
                required
              >
                <option value="">Select a relationship type</option>
                {relationshipOptions.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Connects to</span>
              <select
                value={form.targetId}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, targetId: event.target.value }))
                  setFormError('')
                }}
                required
                disabled={counterpartOptions.length === 0}
              >
                <option value="">Select counterpart</option>
                {counterpartOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} · {option.typeLabel}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Notes (optional)</span>
              <textarea
                rows={3}
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Add context or qualifiers for this connection"
              />
            </label>

            {formError && <p className="form-error">{formError}</p>}
            {form.optionKey && counterpartOptions.length === 0 && (
              <p className="helper-text">No eligible records found for this relationship type.</p>
            )}
          </form>
        </FormModal>
      )}
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
  onView,
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
  const hasActions = Boolean(onEdit || onDelete || onView)

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
                {hasActions && <th scope="col" className="actions-header">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {displayedRecords.map((record) => (
                <tr key={record.id}>
                  {visibleColumns.map((column) => (
                    <td key={column.id}>{renderCellValue(column, record)}</td>
                  ))}
                  {hasActions && (
                    <td className="row-actions">
                      {onView && (
                        <button type="button" className="ghost" onClick={() => onView(record)}>
                          View
                        </button>
                      )}
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

function FormModal({ open, title, onClose, actions, children, size = 'md', className = '' }) {
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

  const modalClasses = classNames('form-modal', `form-modal--${size}`, className)

  return (
    <div className="modal-layer">
      <div className="modal-overlay" onClick={onClose} />
      <div
        ref={dialogRef}
        className={modalClasses}
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

function DrawerTabs({ tabs = [], initialTabId }) {
  const firstTabId = useMemo(() => (tabs.length > 0 ? tabs[0].id : null), [tabs])
  const [activeTabId, setActiveTabId] = useState(initialTabId || firstTabId)

  useEffect(() => {
    const hasActive = tabs.some((tab) => tab.id === activeTabId)
    if (!hasActive) {
      if (initialTabId && tabs.some((tab) => tab.id === initialTabId)) {
        setActiveTabId(initialTabId)
      } else {
        setActiveTabId(firstTabId)
      }
    }
  }, [tabs, activeTabId, initialTabId, firstTabId])

  const handleKeyDown = (event, index) => {
    if (tabs.length === 0) return
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const nextIndex = (index + 1) % tabs.length
      setActiveTabId(tabs[nextIndex].id)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const nextIndex = (index - 1 + tabs.length) % tabs.length
      setActiveTabId(tabs[nextIndex].id)
    }
  }

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || null

  return (
    <div className="drawer-tabs">
      <div className="drawer-tabs__list" role="tablist">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId
          return (
            <button
              key={tab.id}
              type="button"
              id={`${tab.id}-tab`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab.id}-panel`}
              className={classNames('drawer-tabs__tab', isActive && 'drawer-tabs__tab--active')}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActiveTabId(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {activeTab && (
        <div
          id={`${activeTab.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${activeTab.id}-tab`}
          className="drawer-tabs__panel"
        >
          {activeTab.content}
        </div>
      )}
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
