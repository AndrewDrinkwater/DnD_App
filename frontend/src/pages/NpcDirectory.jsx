import { useEffect, useMemo, useState } from 'react'
import { useApiClient } from '../utils/apiClient'
import { useData } from '../context/DataContext'

const directoryStyle = {
  display: 'grid',
  gap: '1rem',
  marginTop: '1.5rem',
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  padding: '1.1rem 1.3rem',
  boxShadow: '0 12px 20px rgba(15, 23, 42, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
}

const metaLineStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  fontSize: '0.85rem',
  color: '#334155',
}

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.25rem 0.6rem',
  borderRadius: '9999px',
  backgroundColor: '#e0f2fe',
  color: '#0369a1',
  fontWeight: 600,
  fontSize: '0.75rem',
}

const visibilityBadgeStyle = {
  ...badgeStyle,
  backgroundColor: '#ede9fe',
  color: '#5b21b6',
}

const selectStyle = {
  borderRadius: '0.75rem',
  border: '1px solid #cbd5f5',
  padding: '0.45rem 0.75rem',
  minWidth: '12rem',
  backgroundColor: '#fff',
}

const formatVisibility = (entries = []) => {
  if (!entries.length) return ['Public']

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

  return [...new Set(labels)]
}

export default function NpcDirectory() {
  const api = useApiClient()
  const {
    worlds,
    worldsLoading,
    worldsError,
    activeWorldId,
    setActiveWorldId,
  } = useData()

  const [npcs, setNpcs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!activeWorldId) {
      setNpcs([])
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    api
      .get('/npcs', {
        context: { worldId: activeWorldId },
        signal: controller.signal,
      })
      .then((data) => {
        if (controller.signal.aborted) return
        setNpcs(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Failed to load NPCs', err)
        setError(err)
        setNpcs([])
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [api, activeWorldId])

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>NPC directory</h1>
          <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>
            Keep track of allies, rivals, and notable figures for the selected world.
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
              Showing NPCs for <strong>{activeWorldName}</strong>
            </span>
          )}
        </div>
      </header>

      <div style={{ marginTop: '1.5rem' }}>
        {(worldsLoading || loading) && <p>Loading NPCs…</p>}
        {!loading && !worldsLoading && (error || worldsError) && (
          <p style={{ color: '#b91c1c' }}>
            Unable to load NPCs: {worldsError?.message || error?.message || 'Unknown error'}
          </p>
        )}

        {!loading && !worldsLoading && !error && !worldsError && (
          <>
            {npcs.length === 0 ? (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#f8fafc',
                }}
              >
                <p style={{ margin: 0 }}>
                  No NPCs were returned for this world. Create one or adjust visibility
                  permissions to make them available.
                </p>
              </div>
            ) : (
              <div style={directoryStyle}>
                {npcs.map((npc) => (
                  <article key={npc.id} style={cardStyle}>
                    <header>
                      <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{npc.name}</h2>
                      {npc.demeanor && (
                        <p style={{ margin: '0.25rem 0 0', color: '#475569' }}>
                          {npc.demeanor}
                        </p>
                      )}
                    </header>
                    <p style={{ margin: 0, color: '#334155' }}>
                      {npc.description || 'No description available.'}
                    </p>
                    <div style={metaLineStyle}>
                      <span>
                        <strong>Type:</strong> {npc.type?.name || 'Uncategorised'}
                      </span>
                      <span>
                        <strong>Race:</strong> {npc.race?.name || 'Unknown'}
                      </span>
                      <span>
                        <strong>Campaign links:</strong>{' '}
                        {npc.visibility?.filter((entry) => entry.campaign_id)?.length || 0}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {formatVisibility(npc.visibility).map((label) => (
                        <span key={label} style={visibilityBadgeStyle}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
