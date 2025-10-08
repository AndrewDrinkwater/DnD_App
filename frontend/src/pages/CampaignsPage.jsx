import { useEffect, useMemo, useState } from 'react'
import { useApiClient } from '../utils/apiClient'
import { useData } from '../context/DataContext'

const listStyle = {
  display: 'grid',
  gap: '1rem',
  marginTop: '1.5rem',
}

const campaignCardStyle = (isActive) => ({
  border: `1px solid ${isActive ? '#16a34a' : '#e2e8f0'}`,
  borderRadius: '14px',
  padding: '1.1rem 1.3rem',
  backgroundColor: isActive ? '#dcfce7' : '#ffffff',
  boxShadow: '0 12px 20px rgba(15, 23, 42, 0.08)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
})

const selectStyle = {
  borderRadius: '0.75rem',
  border: '1px solid #cbd5f5',
  padding: '0.45rem 0.75rem',
  minWidth: '12rem',
  backgroundColor: '#fff',
}

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.25rem 0.65rem',
  borderRadius: '9999px',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  fontSize: '0.75rem',
  fontWeight: 600,
}

export default function CampaignsPage() {
  const api = useApiClient()
  const {
    worlds,
    worldsLoading,
    worldsError,
    activeWorldId,
    setActiveWorldId,
    campaigns,
    activeCampaignId,
    setActiveCampaignId,
    activeCharacterId,
  } = useData()

  const [campaignDetails, setCampaignDetails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!activeWorldId) {
      setCampaignDetails([])
      setLoading(false)
      setError(null)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    api
      .get('/campaigns', {
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
        const scoped = list.filter((entry) => {
          if (!activeWorldId) return true
          const worldId = entry.world_id || entry.world?.id
          return !worldId || worldId === activeWorldId
        })
        setCampaignDetails(scoped)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Failed to load campaigns', err)
        setCampaignDetails([])
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

  const handleCampaignChange = (event) => {
    setActiveCampaignId(event.target.value || null)
  }

  return (
    <section>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Campaigns</h1>
          <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>
            Select a world to review its campaigns, switch the active context, and see
            who is leading each adventure.
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
          {campaigns.length > 0 && (
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600, color: '#1f2937' }}>Active campaign</span>
              <select
                value={activeCampaignId ?? ''}
                onChange={handleCampaignChange}
                style={selectStyle}
              >
                <option value="">Select a campaign</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </header>

      <div style={{ marginTop: '1.5rem' }}>
        {(worldsLoading || loading) && <p>Loading campaigns…</p>}
        {!loading && !worldsLoading && (error || worldsError) && (
          <p style={{ color: '#b91c1c' }}>
            Unable to load campaigns: {worldsError?.message || error?.message || 'Unknown error'}
          </p>
        )}

        {!loading && !worldsLoading && !error && !worldsError && (
          <>
            {campaignDetails.length === 0 ? (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#f8fafc',
                }}
              >
                <p style={{ margin: 0 }}>
                  No campaigns were returned for this world. Ensure you have visibility or
                  create a new campaign to get started.
                </p>
              </div>
            ) : (
              <ul style={listStyle}>
                {campaignDetails.map((campaign) => {
                  const isActive = campaign.id === activeCampaignId
                  const dm = campaign.roles?.find((role) => role.name === 'Dungeon Master')
                  const owner = campaign.creator?.name || campaign.creator?.username || 'Unknown'
                  const participantCount = campaign.characters?.length ?? 0

                  return (
                    <li key={campaign.id} style={campaignCardStyle(isActive)}>
                      <header style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                        <div>
                          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{campaign.name}</h2>
                          {campaign.description && (
                            <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>{campaign.description}</p>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                          {isActive ? (
                            <span style={badgeStyle}>
                              <span aria-hidden>🎯</span>
                              Active
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveCampaignId(campaign.id)}
                              style={{
                                border: '1px solid #16a34a',
                                color: '#15803d',
                                background: '#f0fdf4',
                                borderRadius: '9999px',
                                padding: '0.35rem 1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Set active
                            </button>
                          )}
                          <span style={{ fontSize: '0.85rem', color: '#1f2937' }}>
                            {participantCount} participant{participantCount === 1 ? '' : 's'}
                          </span>
                        </div>
                      </header>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.9rem', color: '#1f2937' }}>
                        <span>
                          <strong>World:</strong> {campaign.world?.name || activeWorld?.name || 'Unassigned'}
                        </span>
                        <span>
                          <strong>DM:</strong> {dm?.users?.[0]?.username || owner}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}
