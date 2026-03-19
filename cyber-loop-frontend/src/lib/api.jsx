const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // ── FIX #12: This header is only needed when tunnelling through ngrok locally.
      //             Sending it in production is harmless but noisy. Gate it on DEV mode.
      ...(import.meta.env.DEV ? { 'ngrok-skip-browser-warning': 'true' } : {}),
      ...(options.headers ?? {}),
    },
  })
  return res
}

// Auth-aware fetch — reads JWT from sessionStorage automatically
export async function authFetch(path, options = {}) {
  const token = sessionStorage.getItem('token')
  return apiFetch(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}