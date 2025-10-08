import { useEffect, useState } from 'react'
import { useApiClient } from '../utils/apiClient'

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: '1.5rem',
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

export default function CharactersPage() {
  const api = useApiClient()
  const [characters, setCharacters] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    api
      .get('/characters', { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setCharacters(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        console.error('Failed to load characters', err)
        setError(err)
        setCharacters([])
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [api])

  return (
    <section>
      <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Characters</h1>
          <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>
            Review the adventurers in your roster, their levels, classes, and campaign
            assignments.
          </p>
        </div>
      </header>

      <div style={{ marginTop: '1.5rem' }}>
        {loading && <p>Loading characters…</p>}
        {!loading && error && (
          <p style={{ color: '#b91c1c' }}>
            Unable to load characters: {error.message || 'Unknown error'}
          </p>
        )}

        {!loading && !error && (
          <>
            {characters.length === 0 ? (
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.25rem 1.5rem',
                  backgroundColor: '#f8fafc',
                }}
              >
                <p style={{ margin: 0 }}>No characters found for your account.</p>
              </div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...headerCellStyle, width: '22%' }}>Character</th>
                    <th style={{ ...headerCellStyle, width: '15%' }}>Owner</th>
                    <th style={{ ...headerCellStyle, width: '12%' }}>Level</th>
                    <th style={headerCellStyle}>Class</th>
                    <th style={{ ...headerCellStyle, width: '20%' }}>Campaigns</th>
                    <th style={{ ...headerCellStyle, width: '10%' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {characters.map((character) => (
                    <tr key={character.id}>
                      <td style={cellStyle}>
                        <strong>{character.name}</strong>
                        {character.description && (
                          <div style={{ marginTop: '0.35rem', color: '#475569', fontSize: '0.85rem' }}>
                            {character.description}
                          </div>
                        )}
                      </td>
                      <td style={cellStyle}>{character.owner?.username || 'Unassigned'}</td>
                      <td style={cellStyle}>{character.level ?? '—'}</td>
                      <td style={cellStyle}>{character.class || 'Unknown'}</td>
                      <td style={cellStyle}>
                        {character.campaigns?.length
                          ? character.campaigns.map((campaign) => campaign.name).join(', ')
                          : 'No campaigns'}
                      </td>
                      <td style={cellStyle}>{character.active ? 'Active' : 'Inactive'}</td>
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
