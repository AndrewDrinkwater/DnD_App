import { useEffect, useMemo, useState } from 'react'
import { useApiClient } from '../utils/apiClient'
import { useData } from '../context/DataContext'

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '1rem',
  backgroundColor: '#fff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 12px 22px rgba(15, 23, 42, 0.08)',
}

const headerCellStyle = {
  textAlign: 'left',
  padding: '0.85rem 1rem',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  fontWeight: 600,
  fontSize: '0.9rem',
}

const cellStyle = {
  padding: '0.85rem 1rem',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'top',
  fontSize: '0.95rem',
  color: '#1f2937',
}

const emptyStateStyle = {
  marginTop: '1.5rem',
  padding: '1.25rem 1.5rem',
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
}

const selectStyle = {
  borderRadius: '0.75rem',
  border: '1px solid #cbd5f5',
  padding: '0.45rem 0.75rem',
  minWidth: '12rem',
  backgroundColor: '#fff',
}

const formatVisibility = (entries = []) => {
  if (!entries.length) {
    return 'No visibility rules defined'
  }

  const labels = entries.map((entry) => {
    if (!entry.campaign_id && !entry.player_id) {
      return 'Public'
    }
    if (entry.campaign?.name) {
      return `Campaign: ${entry.campaign.name}`
    }
    if (entry.player?.username) {
      return `Player: ${entry.player.username}`
    }
    return 'Restricted'
  })

  const uniqueLabels = [...new Set(labels)]
  return uniqueLabels.join(', ')
}

export default function LocationsAtlas() {
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

  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!activeWorldId) {
      setLocations([])
      setLoading(false)
      setError(null)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    api
      .get('/locations', {
        context: {
          worldId: activeWorldId,
          campaignId: activeCampaignId,
          characterId: activeCharacterId,
        },
        signal: controller.signal,
      })
      .then((data) => {
        if (controller.signal.aborted) return
        setLocations(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Failed to load locations', err)
        setLocations([])
        setError(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [api, activeWorldId, activeCampaignId, activeCharacterId])

  const activeWorldName = useMemo(() => {
    if (!activeWorldId) return null
    return worlds.find((world) => world.id === activeWorldId)?.name ?? null
  }, [activeWorldId, worlds])

  const handleWorldChange = (event) => {
    setActiveWorldId(event.target.value || null)
  }

  return (
    <section>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            Locations atlas
          </h1>
          <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>
            Explore the settlements, regions, and points of interest available to the
            currently selected world.
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
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.name}
                </option>
              ))}
            </select>
          </label>
          {activeWorldName && (
            <span style={{ fontSize: '0.9rem', color: '#1f2937' }}>
              Showing locations for <strong>{activeWorldName}</strong>
            </span>
          )}
        </div>
      </header>

      <div style={{ marginTop: '1.5rem' }}>
        {(worldsLoading || loading) && <p>Loading locations…</p>}
        {!loading && !worldsLoading && (error || worldsError) && (
          <p style={{ color: '#b91c1c' }}>
            Unable to load locations:{' '}
            {worldsError?.message || error?.message || 'Unknown error'}
          </p>
        )}

        {!loading && !worldsLoading && !error && !worldsError && (
          <>
            {locations.length === 0 ? (
              <div style={emptyStateStyle}>
                <p style={{ margin: 0 }}>
                  No locations were returned for this world. Try seeding some content or
                  adjust the visibility filters for your campaigns.
                </p>
              </div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...headerCellStyle, width: '20%' }}>Name</th>
                    <th style={{ ...headerCellStyle, width: '15%' }}>Type</th>
                    <th style={headerCellStyle}>Summary</th>
                    <th style={{ ...headerCellStyle, width: '25%' }}>Visibility</th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((location) => (
                    <tr key={location.id}>
                      <td style={cellStyle}>
                        <strong>{location.name}</strong>
                        {location.organisations?.length ? (
                          <div style={{ marginTop: '0.35rem', fontSize: '0.8rem', color: '#475569' }}>
                            Linked organisations: {location.organisations.length}
                          </div>
                        ) : null}
                      </td>
                      <td style={cellStyle}>{location.type?.name || 'Uncategorised'}</td>
                      <td style={cellStyle}>
                        {location.summary || location.description || 'No summary provided.'}
                      </td>
                      <td style={cellStyle}>{formatVisibility(location.visibility)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </section>
  )
}
