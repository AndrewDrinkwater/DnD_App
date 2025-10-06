import { useEffect, useMemo, useState } from 'react'
import './App.css'

const seededRoles = [
  {
    id: 'role-system-admin',
    name: 'System Administrator',
    description: 'Full platform access and configuration rights.',
    createdAt: '2024-01-12T10:15:00Z',
    updatedAt: '2024-04-01T08:25:00Z'
  },
  {
    id: 'role-dungeon-master',
    name: 'Dungeon Master',
    description: 'Owns the storytelling experience for a campaign.',
    createdAt: '2024-02-06T14:10:00Z',
    updatedAt: '2024-03-18T09:32:00Z'
  },
  {
    id: 'role-player',
    name: 'Player',
    description: 'Participates in assigned campaigns with scoped permissions.',
    createdAt: '2024-02-06T14:10:00Z',
    updatedAt: '2024-03-18T09:32:00Z'
  }
]

const seededUsers = [
  {
    id: 'user-aelar',
    displayName: 'Aelar Morningstar',
    email: 'aelar@example.com',
    username: 'aelar',
    password: 'Temp!123',
    status: 'Active',
    roles: ['role-system-admin'],
    updatedAt: '2024-04-18T12:02:00Z'
  },
  {
    id: 'user-lyra',
    displayName: 'Lyra Willowstep',
    email: 'lyra@example.com',
    username: 'lyra',
    password: 'Welcome1',
    status: 'Invited',
    roles: ['role-player'],
    updatedAt: '2024-04-11T09:44:00Z'
  }
]

const seededCampaigns = [
  {
    id: 'campaign-tiamat',
    name: 'Rise of Tiamat',
    status: 'Planning',
    summary: 'High level threat from the Dragon Queen.',
    assignments: [
      { id: 'assign-1', userId: 'user-aelar', roleId: 'role-dungeon-master' },
      { id: 'assign-2', userId: 'user-lyra', roleId: 'role-player' }
    ],
    updatedAt: '2024-04-14T21:00:00Z'
  }
]

const modules = [
  {
    id: 'platform-admin',
    label: 'Platform Admin',
    description: 'Manage users, roles, and campaigns across the multiverse.'
  }
]

const sections = [
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles' },
  { id: 'campaigns', label: 'Campaigns' }
]

const capabilityMatrix = {
  'platform-admin': {
    'system-admin': ['view', 'manage-users', 'manage-roles', 'manage-campaigns']
  }
}

const newId = (prefix) => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function App() {
  const [currentUser] = useState({
    id: 'user-aelar',
    name: 'Aelar Morningstar',
    roles: ['system-admin']
  })

  const [activeModuleId, setActiveModuleId] = useState('platform-admin')
  const [activeSectionId, setActiveSectionId] = useState('users')

  const [roles, setRoles] = useState(seededRoles)
  const [users, setUsers] = useState(seededUsers)
  const [campaigns, setCampaigns] = useState(seededCampaigns)

  const permissions = useMemo(() => {
    const modulePermissions = capabilityMatrix['platform-admin'] || {}
    const derivedPermissions = new Set()

    currentUser.roles.forEach((roleKey) => {
      const capabilities = modulePermissions[roleKey]
      if (capabilities) {
        capabilities.forEach((cap) => derivedPermissions.add(cap))
      }
    })

    return {
      canViewPlatformAdmin: derivedPermissions.has('view'),
      canManageUsers: derivedPermissions.has('manage-users'),
      canManageRoles: derivedPermissions.has('manage-roles'),
      canManageCampaigns: derivedPermissions.has('manage-campaigns')
    }
  }, [currentUser.roles])

  useEffect(() => {
    if (!permissions.canViewPlatformAdmin) {
      setActiveModuleId(null)
    }
  }, [permissions.canViewPlatformAdmin])

  const breadcrumbs = useMemo(() => {
    const trail = ['Home']

    if (activeModuleId) {
      const module = modules.find((item) => item.id === activeModuleId)
      if (module) {
        trail.push(module.label)
      }
    }

    if (activeSectionId) {
      const section = sections.find((item) => item.id === activeSectionId)
      if (section) {
        trail.push(section.label)
      }
    }

    return trail
  }, [activeModuleId, activeSectionId])

  const moduleDescription = useMemo(() => {
    if (!activeModuleId) return ''
    const module = modules.find((item) => item.id === activeModuleId)
    return module?.description || ''
  }, [activeModuleId])

  const sidebarModules = useMemo(() => {
    if (!permissions.canViewPlatformAdmin) {
      return []
    }

    return modules
  }, [permissions.canViewPlatformAdmin])

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
  }

  return (
    <div className="app-shell">
      <aside className="shell-sidebar">
        <div className="sidebar-header">
          <div className="brand-mark">DnD Platform</div>
          <p className="brand-subtitle">Orchestrate adventures with confidence.</p>
        </div>
        <nav className="sidebar-nav">
          {sidebarModules.length === 0 && <p className="sidebar-empty">No modules available for your role.</p>}
          {sidebarModules.map((module) => {
            const isActive = module.id === activeModuleId
            return (
              <button
                key={module.id}
                className={`sidebar-link${isActive ? ' active' : ''}`}
                type="button"
                onClick={() => setActiveModuleId(module.id)}
              >
                <span>{module.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="app-header">
          <div>
            <nav className="breadcrumbs" aria-label="Breadcrumb">
              {breadcrumbs.map((item, index) => (
                <span key={item} className="breadcrumb-item">
                  {item}
                  {index < breadcrumbs.length - 1 && <span aria-hidden="true">›</span>}
                </span>
              ))}
            </nav>
            <h1 className="module-title">{breadcrumbs[breadcrumbs.length - 1]}</h1>
            {moduleDescription && <p className="module-description">{moduleDescription}</p>}
          </div>

          <div className="current-user">
            <span className="user-name">{currentUser.name}</span>
            <span className="user-role">{currentUser.roles.map((role) => role.replace('-', ' ')).join(', ')}</span>
          </div>
        </header>

        <main className="module-content">
          {!permissions.canViewPlatformAdmin && (
            <div className="empty-state">
              <h2>Access restricted</h2>
              <p>You currently do not have permission to administer the platform.</p>
            </div>
          )}

          {permissions.canViewPlatformAdmin && activeModuleId === 'platform-admin' && (
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
            />
          )}
        </main>
      </div>
    </div>
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
  onDeleteCampaign
}) {
  const [userDrawer, setUserDrawer] = useState({ open: false, mode: 'create', record: null })
  const [roleDrawer, setRoleDrawer] = useState({ open: false, mode: 'create', record: null })
  const [campaignDrawer, setCampaignDrawer] = useState({ open: false, mode: 'create', record: null })

  const [userForm, setUserForm] = useState({ displayName: '', email: '', username: '', password: '', roles: [], status: 'Invited' })
  const [roleForm, setRoleForm] = useState({ name: '', description: '' })
  const [campaignForm, setCampaignForm] = useState({ name: '', status: 'Draft', summary: '', assignments: [] })

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
      setCampaignForm({ name: '', status: 'Draft', summary: '', assignments: [] })
    }
  }, [campaignDrawer.open])

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
    setCampaignDrawer({ open: true, mode: 'create', record: null })
  }

  const openEditCampaign = (record) => {
    setCampaignForm({
      id: record.id,
      name: record.name,
      status: record.status,
      summary: record.summary,
      assignments: record.assignments.map((assignment) => ({ ...assignment }))
    })
    setCampaignDrawer({ open: true, mode: 'edit', record })
  }

  const closeUserDrawer = () => setUserDrawer((prev) => ({ ...prev, open: false }))
  const closeRoleDrawer = () => setRoleDrawer((prev) => ({ ...prev, open: false }))
  const closeCampaignDrawer = () => setCampaignDrawer((prev) => ({ ...prev, open: false }))

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
    []
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

  const handleAddCampaignAssignment = () => {
    setCampaignForm((prev) => ({
      ...prev,
      assignments: [
        ...prev.assignments,
        { id: newId('assignment'), userId: users[0]?.id ?? '', roleId: roles[0]?.id ?? '' }
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
          onDelete={permissions.canManageUsers ? onDeleteUser : undefined}
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
          onDelete={permissions.canManageRoles ? onDeleteRole : undefined}
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
          onDelete={permissions.canManageCampaigns ? onDeleteCampaign : undefined}
          emptyMessage="Launch your first campaign and assemble a party."
        />
      )}

      <RecordDrawer
        open={userDrawer.open}
        title={userDrawer.mode === 'edit' ? 'Edit user' : 'Invite user'}
        onClose={closeUserDrawer}
      >
        <form className="drawer-form" onSubmit={handleSubmitUser}>
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

          <div className="drawer-actions">
            <button type="button" className="ghost" onClick={closeUserDrawer}>
              Cancel
            </button>
            <button type="submit" className="primary">
              {userDrawer.mode === 'edit' ? 'Save changes' : 'Invite user'}
            </button>
          </div>
        </form>
      </RecordDrawer>

      <RecordDrawer
        open={roleDrawer.open}
        title={roleDrawer.mode === 'edit' ? 'Edit role' : 'Create role'}
        onClose={closeRoleDrawer}
      >
        <form className="drawer-form" onSubmit={handleSubmitRole}>
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

          <div className="drawer-actions">
            <button type="button" className="ghost" onClick={closeRoleDrawer}>
              Cancel
            </button>
            <button type="submit" className="primary">
              {roleDrawer.mode === 'edit' ? 'Save changes' : 'Create role'}
            </button>
          </div>
        </form>
      </RecordDrawer>

      <RecordDrawer
        open={campaignDrawer.open}
        title={campaignDrawer.mode === 'edit' ? 'Edit campaign' : 'Create campaign'}
        onClose={closeCampaignDrawer}
      >
        <form className="drawer-form" onSubmit={handleSubmitCampaign}>
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
              <option value="Draft">Draft</option>
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
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
                disabled={users.length === 0 || roles.length === 0}
              >
                Add assignment
              </button>
            </div>

            {campaignForm.assignments.length === 0 && <p className="helper-text">Link players and storytellers to the campaign.</p>}

            {campaignForm.assignments.map((assignment) => (
              <div key={assignment.id} className="assignment-row">
                <label>
                  <span>User</span>
                  <select
                    value={assignment.userId}
                    onChange={(event) =>
                      handleUpdateCampaignAssignment(assignment.id, 'userId', event.target.value)
                    }
                  >
                    <option value="">Select user</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Role</span>
                  <select
                    value={assignment.roleId}
                    onChange={(event) =>
                      handleUpdateCampaignAssignment(assignment.id, 'roleId', event.target.value)
                    }
                  >
                    <option value="">Select role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleRemoveCampaignAssignment(assignment.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="drawer-actions">
            <button type="button" className="ghost" onClick={closeCampaignDrawer}>
              Cancel
            </button>
            <button type="submit" className="primary">
              {campaignDrawer.mode === 'edit' ? 'Save changes' : 'Create campaign'}
            </button>
          </div>
        </form>
      </RecordDrawer>
    </div>
  )
}

function StandardListView({
  entityName,
  columns,
  records,
  onCreate,
  onEdit,
  onDelete,
  emptyMessage
}) {
  const [visibleColumnIds, setVisibleColumnIds] = useState(() =>
    columns
      .filter((column) => column.defaultVisible !== false)
      .map((column) => column.id)
  )
  const [columnMenuOpen, setColumnMenuOpen] = useState(false)

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

  const renderCellValue = (column, record) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(record)
    }
    if (column.id in record) {
      return record[column.id]
    }
    return '—'
  }

  const visibleColumns = columns.filter((column) => visibleColumnIds.includes(column.id))

  return (
    <section className="standard-list">
      <header className="list-header">
        <div>
          <h2>{entityName} directory</h2>
          <p>Configure and orchestrate {entityName.toLowerCase()}s for the entire platform.</p>
        </div>

        <div className="list-actions">
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

      {records.length === 0 ? (
        <div className="empty-state">
          <h3>No {entityName.toLowerCase()}s yet</h3>
          <p>{emptyMessage}</p>
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
                {(onEdit || onDelete) && <th scope="col" className="actions-header">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  {visibleColumns.map((column) => (
                    <td key={column.id}>{renderCellValue(column, record)}</td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td className="row-actions">
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
    </section>
  )
}

function RecordDrawer({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="drawer-layer">
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="record-drawer" role="dialog" aria-modal="true">
        <header className="drawer-header">
          <h3>{title}</h3>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  )
}

export default App
