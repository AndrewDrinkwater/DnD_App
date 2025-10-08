import { useEffect, useMemo, useState } from 'react'
import { useApiClient } from '../utils/apiClient'
import { useData } from '../context/DataContext'

const gridStyle = {
  display: 'grid',
  gap: '1rem',
  marginTop: '1.5rem',
}

const organisationCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  padding: '1.25rem 1.4rem',
  boxShadow: '0 12px 22px rgba(15, 23, 42, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
}

const selectStyle = {
  borderRadius: '0.75rem',
  border: '1px solid #cbd5f5',
  padding: '0.45rem 0.75rem',
  minWidth: '12rem',
  backgroundColor: '#fff',
}

const tagStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.25rem 0.65rem',
  borderRadius: '9999px',
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
  fontSize: '0.75rem',
  fontWeight: 600,
}

const formatVisibility = (entries = []) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return ['Public']
  }

  const labels = entries.map((entry) => {
    if (entry.campaign?.name) {
      return `Campaign: ${entry.campaign.name}`
    }
    if (entry.player?.username) {
      return `Player: ${entry.player.username}`
    }
    return 'Public'
  })

  return [...new Set(labels)]
}

export default function OrganisationsLedger() {
  const api = useApiClient()
  const {
    worlds,
    worldsLoading,
    worldsError,
    activeWorldId,
    setActiveWorldId,
    activeCampaignId,
    activeCharacterId,
  } = useData()

  const [organisations, setOrganisations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!activeWorldId) {
      setOrganisations([])
      setLoading(false)
      setError(null)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    api
      .get('/organisations', {
        signal: controller.signal,
        context: {
          worldId: activeWorldId,
          campaignId: activeCampaignId,
          characterId: activeCharacterId,
        },
      })
      .then((data) => {
        if (controller.signal.aborted) return
        const list = Array.isArray(data) ? data : []
        const scoped = list.filter((organisation) => {
          if (!activeWorldId) return true
          const worldId = organisation.world_id || organisation.world?.id
          return !worldId || worldId === activeWorldId
        })
        setOrganisations(scoped)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Failed to load organisations', err)
        setOrganisations([])
        setError(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [api, activeWorldId, activeCampaignId, activeCharacterId])

  const activeWorld = useMemo(
    () => worlds.find((world) => world.id === activeWorldId) ?? null,
    [activeWorldId, worlds],
  )

  const handleWorldChange = (event) => {
    setActiveWorldId(event.target.value || null)
  }

  return (
    <section>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Organisations</h1>
          <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>
            Track the factions and guilds available to the active world and review who can
            see them.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem' }}>
            <span style={{ fontWeight: 600, color: '#1f2937' }}>World context</span>
            <select
              value={activeWorldId ?? ''}
              onChange={handleWorldChange}
              disabled={worldsLoading || !!worldsError}
              style={selectStyle}
            >
              <option value="">Select a world</option>
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.name}
                </option>
              ))}
            </select>
          </label>
          {activeWorld && (
            <span style={{ fontSize: '0.9rem', color: '#1f2937' }}>
              Showing organisations for <strong>{activeWorld.name}</strong>
            </span>
          )}
        </div>
      </header>

      <div style={{ marginTop: '1.5rem' }}>
        {(worldsLoading || loading) && <p>Loading organisations…</p>}
        {!loading && !worldsLoading && (error || worldsError) && (
          <p style={{ color: '#b91c1c' }}>
            Unable to load organisations: {worldsError?.message || error?.message || 'Unknown error'}
          </p>
        )}

        {!loading && !worldsLoading && !error && !worldsError && (
          <>
            {organisations.length === 0 ? (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#f8fafc',
                }}
              >
                <p style={{ margin: 0 }}>
                  No organisations were returned for this world. Adjust your context or
                  visibility rules to see more.
                </p>
              </div>
            ) : (
              <div style={gridStyle}>
                {organisations.map((organisation) => {
                  const visibilityLabels = formatVisibility(organisation.visibility)
                  const locations = organisation.locations || []

                  return (
                    <article key={organisation.id} style={organisationCardStyle}>
                      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <div>
                          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{organisation.name}</h2>
                          {organisation.motto && (
                            <p style={{ margin: '0.35rem 0 0', color: '#2563eb', fontStyle: 'italic' }}>
                              “{organisation.motto}”
                            </p>
                          )}
                        </div>
                        {organisation.type?.name && (
                          <span style={tagStyle}>
                            <span aria-hidden>🏷️</span>
                            {organisation.type.name}
                          </span>
                        )}
                      </header>
                      {organisation.description && (
                        <p style={{ margin: 0, color: '#475569' }}>{organisation.description}</p>
                      )}
                      {locations.length > 0 && (
                        <div style={{ fontSize: '0.9rem', color: '#1f2937' }}>
                          <strong>Locations:</strong> {locations.map((loc) => loc.name).join(', ')}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {visibilityLabels.map((label) => (
                          <span key={label} style={{ ...tagStyle, backgroundColor: '#ede9fe', color: '#5b21b6' }}>
                            <span aria-hidden>👁️</span>
                            {label}
                          </span>
                        ))}
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
