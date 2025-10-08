import { useEffect, useRef } from 'react'
import Header from './Header'
import Sidebar from './Sidebar'

export default function AppLayout({ children }) {
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
        <Sidebar />
        <div className="shell-main">
          <div ref={headerRef}>
            <Header />
          </div>
          <main className="module-content">{children}</main>
        </div>
      </div>
    </div>
  )
}
