import { createContext, useContext, useMemo } from 'react'

const sidebarModules = [
  { id: 'world', label: 'Worlds', path: '/worlds', exact: true },
  { id: 'campaigns', label: 'Campaigns', path: '/campaigns' },
  { id: 'characters', label: 'Characters', path: '/characters' },
  { id: 'npcs', label: 'NPC Directory', path: '/npcs' },
  { id: 'locations', label: 'Locations', path: '/locations' },
  { id: 'organisations', label: 'Organisations', path: '/organisations' },
  { id: 'races', label: 'Races', path: '/races' },
  { id: 'platform-admin', label: 'Admin', path: '/admin' },
]

const defaultBrand = {
  initials: 'DD',
  title: 'D&D Shared Space',
  subtitle: 'Collaborative command centre',
}

const DataContext = createContext({
  sidebarModules,
  brand: defaultBrand,
  headerProps: {},
})

export function DataProvider({ children }) {
  const value = useMemo(
    () => ({
      sidebarModules,
      brand: defaultBrand,
      headerProps: {
        showCampaignSelector: false,
        showCharacterSelector: false,
      },
    }),
    [],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
