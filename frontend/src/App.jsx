import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

function App() {
  const [userForm, setUserForm] = useState({ username: '', email: '', password: '' })
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [createdUser, setCreatedUser] = useState(null)
  const [userRoles, setUserRoles] = useState([])
  const [roles, setRoles] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isAssigningRole, setIsAssigningRole] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(true)
  const [userRolesLoading, setUserRolesLoading] = useState(false)

  useEffect(() => {
    const loadRoles = async () => {
      try {
        setRolesLoading(true)
        const res = await fetch(`${API_BASE_URL}/system-roles`)
        if (!res.ok) {
          throw new Error('Unable to load system roles')
        }
        const payload = await res.json()
        setRoles(payload.data || [])
      } catch (error) {
        console.error(error)
        setErrorMessage(error.message || 'Failed to load system roles')
      } finally {
        setRolesLoading(false)
      }
    }

    loadRoles()
  }, [])

  const resetMessages = () => {
    setStatusMessage('')
    setErrorMessage('')
  }

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setUserForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateUser = async (event) => {
    event.preventDefault()
    resetMessages()

    if (!userForm.username || !userForm.email || !userForm.password) {
      setErrorMessage('Please provide a username, email, and password before creating a user.')
      return
    }

    setIsCreatingUser(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userForm.username,
          email: userForm.email,
          password_hash: userForm.password
        })
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to create user')
      }

      setCreatedUser(payload.data)
      setUserRoles([])
      setSelectedRoleId('')
      await loadUserRoles(payload.data.id)
      setStatusMessage('User created successfully. You can now assign a system role.')
    } catch (error) {
      console.error(error)
      setErrorMessage(error.message)
    } finally {
      setIsCreatingUser(false)
    }
  }

  const loadUserRoles = async (userId) => {
    try {
      setUserRolesLoading(true)
      const res = await fetch(`${API_BASE_URL}/users/${userId}/system-roles`)
      if (!res.ok) {
        throw new Error('Unable to load system roles for the user')
      }
      const payload = await res.json()
      setUserRoles(payload.data || [])
    } catch (error) {
      console.error(error)
      setErrorMessage(error.message)
    } finally {
      setUserRolesLoading(false)
    }
  }

  const handleAssignRole = async (event) => {
    event.preventDefault()
    resetMessages()

    if (!createdUser) {
      setErrorMessage('Create a user before assigning roles.')
      return
    }

    if (!selectedRoleId) {
      setErrorMessage('Select a system role to assign.')
      return
    }

    setIsAssigningRole(true)
    try {
      const response = await fetch(`${API_BASE_URL}/users/${createdUser.id}/system-roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId: Number(selectedRoleId) })
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.message || 'Unable to assign system role')
      }

      setStatusMessage(payload.message || 'Role assigned successfully.')
      await loadUserRoles(createdUser.id)
    } catch (error) {
      console.error(error)
      setErrorMessage(error.message)
    } finally {
      setIsAssigningRole(false)
    }
  }

  const userSummary = useMemo(() => {
    if (!createdUser) return null
    return `${createdUser.username} (${createdUser.email})`
  }, [createdUser])

  return (
    <div className="app-shell">
      <header>
        <h1>System User Management</h1>
        <p>Create a new system user and assign system-wide roles in a single place.</p>
      </header>

      <main className="panels">
        <section className="panel">
          <h2>Create system user</h2>
          <form className="form" onSubmit={handleCreateUser}>
            <label className="form-field">
              <span>Username</span>
              <input
                name="username"
                type="text"
                placeholder="cleric42"
                value={userForm.username}
                onChange={handleInputChange}
                autoComplete="username"
              />
            </label>

            <label className="form-field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                placeholder="cleric42@example.com"
                value={userForm.email}
                onChange={handleInputChange}
                autoComplete="email"
              />
            </label>

            <label className="form-field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                placeholder="Enter a temporary password"
                value={userForm.password}
                onChange={handleInputChange}
                autoComplete="new-password"
              />
            </label>

            <button type="submit" disabled={isCreatingUser}>
              {isCreatingUser ? 'Creating user…' : 'Create user'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>Assign a system role</h2>
          <form className="form" onSubmit={handleAssignRole}>
            <label className="form-field">
              <span>User</span>
              <input type="text" value={userSummary || 'No user created yet'} readOnly />
            </label>

            <label className="form-field">
              <span>System role</span>
              <select
                value={selectedRoleId}
                onChange={(event) => setSelectedRoleId(event.target.value)}
                disabled={!createdUser || rolesLoading || roles.length === 0}
              >
                <option value="">{rolesLoading ? 'Loading roles…' : 'Select a system role'}</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" disabled={!createdUser || !selectedRoleId || isAssigningRole}>
              {isAssigningRole ? 'Assigning role…' : 'Assign role'}
            </button>
          </form>

          <div className="assigned-roles">
            <h3>Assigned system roles</h3>
            {!createdUser && <p>Create a user to view their roles.</p>}
            {createdUser && userRolesLoading && <p>Loading…</p>}
            {createdUser && !userRolesLoading && userRoles.length === 0 && (
              <p>No roles assigned yet.</p>
            )}
            {createdUser && userRoles.length > 0 && (
              <ul>
                {userRoles.map((role) => (
                  <li key={role.id}>{role.name}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      {(statusMessage || errorMessage) && (
        <div className={`message ${errorMessage ? 'error' : 'success'}`} role="status">
          {errorMessage || statusMessage}
        </div>
      )}
    </div>
  )
}

export default App
