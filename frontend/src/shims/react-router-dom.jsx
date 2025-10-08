/* eslint-disable react-refresh/only-export-components */
import {
  Children,
  cloneElement,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

const RouterContext = createContext(null)
const ParamsContext = createContext({})

const emptyLocation = { pathname: '/', search: '', hash: '', state: null }

const normalizePath = (path) => {
  if (!path) return '/'
  const stringPath = String(path)
  if (!stringPath) return '/'
  const [pathname] = stringPath.split('?')
  const prefixed = pathname.startsWith('/') ? pathname : `/${pathname}`
  const trimmed = prefixed.replace(/\/+$/, '')
  return trimmed || '/'
}

const readLocation = () => {
  if (typeof window === 'undefined' || !window.location) {
    return emptyLocation
  }
  const { pathname, search, hash } = window.location
  return {
    pathname: normalizePath(pathname),
    search: search ?? '',
    hash: hash ?? '',
    state: window.history?.state ?? null,
  }
}

const splitPath = (path) => {
  const normalized = normalizePath(path)
  if (normalized === '/') return []
  return normalized.split('/').filter(Boolean)
}

const matchPath = (pattern, pathname) => {
  if (pattern === undefined || pattern === null) {
    return { params: {}, score: 0 }
  }
  if (pattern === '*') {
    return { params: {}, score: 0 }
  }

  const patternSegments = splitPath(pattern)
  const pathSegments = splitPath(pathname)

  if (patternSegments.length > pathSegments.length) {
    return null
  }

  const params = {}

  for (let index = 0; index < patternSegments.length; index += 1) {
    const segment = patternSegments[index]
    const value = pathSegments[index]

    if (segment === '*') {
      return { params, score: patternSegments.length }
    }

    if (!value) {
      return null
    }

    if (segment.startsWith(':')) {
      params[segment.slice(1)] = value
      continue
    }

    if (segment !== value) {
      return null
    }
  }

  if (patternSegments.length < pathSegments.length) {
    return null
  }

  return { params, score: patternSegments.length }
}

export function BrowserRouter({ children }) {
  const [location, setLocation] = useState(() => readLocation())
  const locationRef = useRef(location)
  locationRef.current = location

  const navigate = useCallback((to, { replace = false, state } = {}) => {
    if (typeof window === 'undefined' || !window.history) {
      return
    }

    const target = typeof to === 'string' ? to : String(to)
    const method = replace ? 'replaceState' : 'pushState'
    window.history[method](state ?? null, '', target)
    setLocation(readLocation())
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handlePopState = () => {
      setLocation(readLocation())
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const value = useMemo(
    () => ({ location, navigate }),
    [location, navigate],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter() {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useRouter must be used within a BrowserRouter')
  }
  return context
}

export function useLocation() {
  return useRouter().location
}

export function useNavigate() {
  return useRouter().navigate
}

export function useParams() {
  return useContext(ParamsContext)
}

export function Routes({ children }) {
  const { location } = useRouter()
  const routeChildren = Children.toArray(children)

  let match = null

  for (const child of routeChildren) {
    if (!child || child.type !== Route) {
      continue
    }

    const { path = '*', element = null } = child.props || {}
    const result = matchPath(path, location.pathname)

    if (result) {
      match = { element, params: result.params }
      break
    }
  }

  const params = match?.params ?? {}

  return <ParamsContext.Provider value={params}>{match?.element ?? null}</ParamsContext.Provider>
}

export function Route() {
  return null
}

export function Navigate({ to, replace = false, state }) {
  const navigate = useNavigate()
  useEffect(() => {
    navigate(to, { replace, state })
  }, [navigate, to, replace, state])
  return null
}

const isLeftClick = (event) => event.button === 0

const isModifiedEvent = (event) => event.metaKey || event.altKey || event.ctrlKey || event.shiftKey

export function Link({ to, replace = false, state, onClick, children, ...rest }) {
  const navigate = useNavigate()

  const handleClick = (event) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (!isLeftClick(event) || isModifiedEvent(event)) return

    event.preventDefault()
    navigate(to, { replace, state })
  }

  const child = Array.isArray(children) ? children[0] : children
  if (cloneElement && child && child.type === 'a') {
    return cloneElement(child, { href: to, onClick: handleClick, ...rest })
  }

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}

export function NavLink({
  to,
  end = false,
  className,
  children,
  onClick,
  ...rest
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const targetPath = normalizePath(to)
  const currentPath = normalizePath(location.pathname)

  const isActive = end
    ? currentPath === targetPath
    : currentPath === targetPath || currentPath.startsWith(`${targetPath}/`)

  const resolvedClassName =
    typeof className === 'function' ? className({ isActive, isPending: false }) : className

  const handleClick = (event) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (!isLeftClick(event) || isModifiedEvent(event)) return
    event.preventDefault()
    navigate(to)
  }

  const content = typeof children === 'function' ? children({ isActive, isPending: false }) : children

  return (
    <a href={to} className={resolvedClassName} onClick={handleClick} {...rest}>
      {content}
    </a>
  )
}

export default {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
}
