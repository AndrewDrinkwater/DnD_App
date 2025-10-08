const normalizeBaseUrl = (value) => {
  if (!value) return ''
  return value.endsWith('/') ? value.slice(0, -1) : value
}

const API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL) || 'http://localhost:3000/api'

const parseResponse = async (response) => {
  let payload = null

  try {
    payload = await response.json()
  } catch {
    // No JSON body returned
  }

  if (!response.ok || payload?.success === false) {
    const message = payload?.message || `Request failed with status ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export async function login({ username, email, password }) {
  const trimmedUsername = username?.trim()
  const trimmedEmail = email?.trim()
  const trimmedPassword = password?.trim()

  if (!trimmedPassword || (!trimmedUsername && !trimmedEmail)) {
    throw new Error('Username or email and password are required')
  }

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...(trimmedUsername ? { username: trimmedUsername } : {}),
      ...(trimmedEmail ? { email: trimmedEmail } : {}),
      password: trimmedPassword,
    }),
  })

  const payload = await parseResponse(response)

  return {
    token: payload.token,
    user: { ...payload.data, isAuthenticated: true },
  }
}
