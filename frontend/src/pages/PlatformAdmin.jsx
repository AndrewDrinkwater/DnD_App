import { useCallback, useEffect, useState } from 'react'
import { useApiClient } from '../utils/apiClient'

export default function PlatformAdmin() {
  const api = useApiClient()
  const [users, setUsers] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [locationTypes, setLocationTypes] = useState([])
  const [userError, setUserError] = useState(null)
  const [campaignError, setCampaignError] = useState(null)
  const [locationTypeError, setLocationTypeError] = useState(null)

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.get('/users')
      setUsers(Array.isArray(data) ? data : [])
      setUserError(null)
    } catch (error) {
      console.error('Failed to load users', error)
      setUsers([])
      setUserError(error)
    }
  }, [api])

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await api.get('/campaigns')
      setCampaigns(Array.isArray(data) ? data : [])
      setCampaignError(null)
    } catch (error) {
      console.error('Failed to load campaigns', error)
      setCampaigns([])
      setCampaignError(error)
    }
  }, [api])

  const loadLocationTypes = useCallback(async () => {
    try {
      const data = await api.get('/locations/types')
      setLocationTypes(Array.isArray(data) ? data : [])
      setLocationTypeError(null)
    } catch (error) {
      console.error('Failed to load location types', error)
      setLocationTypes([])
      setLocationTypeError(error)
    }
  }, [api])

  useEffect(() => {
    loadUsers()
    loadCampaigns()
    loadLocationTypes()
  }, [loadUsers, loadCampaigns, loadLocationTypes])

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Platform Administration</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Users</h2>
        {userError && (
          <p className="text-red-300 mb-2">
            Failed to load users: {userError.message || 'Unknown error'}
          </p>
        )}
        <ul className="space-y-1">
          {users.map((user) => (
            <li key={user.id}>
              {user.username} ({user.roles?.map((role) => role.name || role).join(', ') || 'No roles'}) —{' '}
              {user.active ? 'Active' : 'Inactive'}
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Campaigns</h2>
        {campaignError && (
          <p className="text-red-300 mb-2">
            Failed to load campaigns: {campaignError.message || 'Unknown error'}
          </p>
        )}
        <ul className="space-y-1">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              {campaign.name} — World: {campaign.world?.name || campaign.world_id || 'Unassigned'}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Location Types</h2>
        {locationTypeError && (
          <p className="text-red-300 mb-2">
            Failed to load location types: {locationTypeError.message || 'Unknown error'}
          </p>
        )}
        <ul className="space-y-1">
          {locationTypes.map((type) => (
            <li key={type.id}>{type.name}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
