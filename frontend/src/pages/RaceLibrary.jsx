import { useEffect, useState } from 'react'
import { useApiClient } from '../utils/apiClient'
import { useData } from '../context/DataContext'

const listStyle = {
  display: 'grid',
  gap: '1rem',
  marginTop: '1.5rem',
}

const raceCardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  border: '1px solid #e2e8f0',
  padding: '1.25rem 1.4rem',
  boxShadow: '0 12px 22px rgba(15, 23, 42, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
}

export default function RaceLibrary() {
  const api = useApiClient()
  const { activeWorldId, activeCampaignId, activeCharacterId } = useData()
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!activeWorldId) {
      setRaces([])
      setLoading(false)
      setError(null)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    api
      .get('/races', {
        signal: controller.signal,
        context: {
          worldId: activeWorldId,
          campaignId: activeCampaignId,
          characterId: activeCharacterId,
        },
      })
      .then((data) => {
        if (controller.signal.aborted) return
        setRaces(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Failed to load races', err)
        setRaces([])
        setError(err)
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [api, activeWorldId, activeCampaignId, activeCharacterId])

  return (
    <section>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Race library</h1>
          <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>
            Reference the player races available in the current world context. The list
            reflects any visibility restrictions applied by the Dungeon Master.
          </p>
        </div>
      </header>

      <div style={{ marginTop: '1.5rem' }}>
        {loading && <p>Loading races…</p>}
        {!loading && error && (
          <p style={{ color: '#b91c1c' }}>
            Unable to load races: {error.message || 'Unknown error'}
          </p>
        )}

        {!loading && !error && (
          <>
            {races.length === 0 ? (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#f8fafc',
                }}
              >
                <p style={{ margin: 0 }}>
                  No races are visible in this world. Check your campaign permissions or
                  ask a world admin to add some entries.
                </p>
              </div>
            ) : (
              <div style={listStyle}>
                {races.map((race) => (
                  <article key={race.id} style={raceCardStyle}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{race.name}</h2>
                    {race.description && (
                      <p style={{ margin: 0, color: '#475569' }}>{race.description}</p>
                    )}
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
