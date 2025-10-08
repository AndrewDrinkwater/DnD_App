import { cloneElement } from 'react'

export function BrowserRouter({ children }) {
  return children
}

export function Link({ to, onClick, children, ...rest }) {
  const handleClick = (event) => {
    if (onClick) {
      onClick(event)
    }

    if (event.defaultPrevented) {
      return
    }

    event.preventDefault()
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', to)
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
    }
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

export default { BrowserRouter, Link }
