import { createContext, useContext, useMemo, useState } from 'react'

const DataContext = createContext({
  campaigns: [],
  characters: [],
})

export function DataProvider({ children }) {
  const [campaigns] = useState([])
  const [characters] = useState([])

  const value = useMemo(
    () => ({
      campaigns,
      characters,
    }),
    [campaigns, characters],
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
