import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Sidebar from './Sidebar'

const PIN_STORAGE_KEY = 'dnd-app:sidebar-pinned'
const COLLAPSE_STORAGE_KEY = 'dnd-app:sidebar-collapsed'

function readStoredBoolean(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const value = window.localStorage.getItem(key)
    if (value === null) return fallback
    return value === 'true'
  } catch (error) {
    console.warn('Unable to read sidebar preference', error)
    return fallback
  }
}

function writeStoredBoolean(key, value) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value ? 'true' : 'false')
  } catch (error) {
    console.warn('Unable to persist sidebar preference', error)
  }
}

function useMediaQuery(query, fallback = false) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return fallback
    }
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mediaQueryList = window.matchMedia(query)
    const updateMatch = () => setMatches(mediaQueryList.matches)
    updateMatch()
    mediaQueryList.addEventListener('change', updateMatch)
    return () => mediaQueryList.removeEventListener('change', updateMatch)
  }, [query])

  return matches
}

export default function AppLayout({ children }) {
  const headerRef = useRef(null)
  const location = useLocation()
  const isCompactLayout = useMediaQuery('(max-width: 960px)')

  const [sidebarPinned, setSidebarPinned] = useState(() => readStoredBoolean(PIN_STORAGE_KEY, true))
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readStoredBoolean(COLLAPSE_STORAGE_KEY, false))
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const updateHeaderHeight = () => {
      const element = headerRef.current
      if (!element) return
      const nextHeight = `${element.offsetHeight}px`
      document.documentElement.style.setProperty('--app-header-height', nextHeight)
    }

    updateHeaderHeight()
    window.addEventListener('resize', updateHeaderHeight)
    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

  useEffect(() => {
    if (!isCompactLayout) {
      setIsMobileMenuOpen(false)
    }
  }, [isCompactLayout])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    writeStoredBoolean(PIN_STORAGE_KEY, sidebarPinned)
  }, [sidebarPinned])

  useEffect(() => {
    writeStoredBoolean(COLLAPSE_STORAGE_KEY, sidebarCollapsed)
  }, [sidebarCollapsed])

  const effectiveCollapsed = useMemo(() => {
    if (isCompactLayout) return false
    return sidebarCollapsed
  }, [isCompactLayout, sidebarCollapsed])

  const handleTogglePinned = () => {
    setSidebarPinned((prev) => !prev)
  }

  const handleToggleCollapsed = () => {
    setSidebarCollapsed((prev) => !prev)
  }

  const handleOpenMobileMenu = () => {
    setIsMobileMenuOpen(true)
  }

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <div className="app-body">
        <Sidebar
          isPinned={sidebarPinned}
          isCollapsed={effectiveCollapsed}
          isCompactLayout={isCompactLayout}
          isMobileOpen={isMobileMenuOpen}
          onPinToggle={handleTogglePinned}
          onCollapseToggle={handleToggleCollapsed}
          onRequestClose={handleCloseMobileMenu}
        />
        <div className="shell-main">
          <div ref={headerRef}>
            <Header
              isCompactLayout={isCompactLayout}
              isSidebarCollapsed={effectiveCollapsed}
              onRequestMobileMenu={handleOpenMobileMenu}
              onRequestCollapseToggle={handleToggleCollapsed}
            />
          </div>
          <main className="module-content">{children}</main>
        </div>
      </div>
    </div>
  )
}
