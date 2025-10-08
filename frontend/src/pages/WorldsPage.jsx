import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'

const listStyle = {
  listStyle: 'none',
  padding: 0,
  margin: '1.5rem 0 0',
  display: 'grid',
  gap: '1rem',
}

const worldCardStyle = (isActive) => ({
  border: `1px solid ${isActive ? '#2563eb' : '#e2e8f0'}`,
  borderRadius: '12px',
  padding: '1rem 1.25rem',
  backgroundColor: isActive ? '#eff6ff' : '#ffffff',
  boxShadow: '0 10px 18px rgba(15, 23, 42, 0.08)',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
})

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  padding: '0.25rem 0.65rem',
  borderRadius: '9999px',
  backgroundColor: '#1e293b',
  color: '#f8fafc',
  fontSize: '0.75rem',
  fontWeight: 600,
}

export default function WorldsPage() {
  const { currentUser } = useAuth()
  const {
    worlds,
    worldsLoading,
    worldsError,
    activeWorldId,
    setActiveWorldId,
    refreshWorlds,
  } = useData()

  const activeWorld = useMemo(
    () => worlds.find((world) => world.id === activeWorldId) ?? null,
    [activeWorldId, worlds],
  )

  const handleWorldChange = (event) => {
    setActiveWorldId(event.target.value || null)
  }

  const handleRefresh = () => {
    refreshWorlds()
  }

  return (
    <section>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Worlds</h1>
          <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>
            Review the shared worlds available to your campaigns and choose which one
            to explore across the NPC, location, and character directories.
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
          {worlds.length > 1 && (
            <label style={{ display: 'flex', flexDirection: 'column', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 600, color: '#1f2937' }}>Active world context</span>
              <select
                value={activeWorldId ?? ''}
                onChange={handleWorldChange}
                style={{
                  marginTop: '0.35rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #cbd5f5',
                  padding: '0.45rem 0.75rem',
                  minWidth: '12rem',
                  backgroundColor: '#fff',
                }}
              >
                {worlds.map((world) => (
                  <option key={world.id} value={world.id}>
                    {world.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            style={{
              border: '1px solid #2563eb',
              color: '#1d4ed8',
              background: '#fff',
              borderRadius: '9999px',
              padding: '0.45rem 1.25rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Refresh worlds
          </button>
        </div>
      </header>

      <div style={{ marginTop: '1.5rem' }}>
        {worldsLoading && <p>Loading worlds…</p>}
        {!worldsLoading && worldsError && (
          <p style={{ color: '#b91c1c' }}>
            Unable to load worlds: {worldsError.message || 'Unknown error'}
          </p>
        )}
        {!worldsLoading && !worldsError && worlds.length === 0 && (
          <p>No worlds available for your account yet.</p>
        )}

        {!worldsLoading && !worldsError && worlds.length > 0 && (
          <ul style={listStyle}>
            {worlds.map((world) => {
              const isActive = world.id === activeWorldId
              const campaignCount = Array.isArray(world.campaigns)
                ? world.campaigns.length
                : 0
              return (
                <li key={world.id} style={worldCardStyle(isActive)}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{world.name}</h2>
                      {world.description && (
                        <p style={{ margin: '0.5rem 0 0', color: '#475569' }}>
                          {world.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {isActive && (
                        <span style={badgeStyle}>
                          <span aria-hidden>⭐</span>
                          Active context
                        </span>
                      )}
                      <span style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                        {campaignCount} campaign{campaignCount === 1 ? '' : 's'} linked
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {activeWorld && (
        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Active world summary
          </h2>
          <p style={{ margin: 0, color: '#475569' }}>
            {activeWorld.description
              ? activeWorld.description
              : 'This world does not have a description yet.'}
          </p>
        </section>
      )}

      <p style={{ marginTop: '2.5rem', fontSize: '0.875rem', color: '#64748b' }}>
        Logged in as {currentUser?.name}{' '}
        {currentUser?.roleNames?.length
          ? `(${currentUser.roleNames.join(', ')})`
          : ''}
      </p>
    </section>
  )
}
