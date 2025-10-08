import { useEffect, useMemo, useRef } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

const defaultBrand = {
  initials: 'DD',
  title: 'D&D Shared Space',
  subtitle: 'Collaborative command centre'
}

export default function AppLayout({
  children,
  sidebarModules = [],
  activeModuleId = null,
  onSelectModule,
  headerProps = {},
  brand: providedBrand
}) {
  const brand = useMemo(() => ({ ...defaultBrand, ...providedBrand }), [providedBrand])
  const headerRef = useRef(null)

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

  return (
    <div className="app-shell">
      <div className="app-body">
        <Sidebar
          modules={sidebarModules}
          activeModuleId={activeModuleId}
          onSelectModule={onSelectModule}
          brand={brand}
        />
        <div className="shell-main">
          <Header ref={headerRef} brand={brand} {...headerProps} />
          <main className="module-content">{children}</main>
        </div>
      </div>
    </div>
  )
}
