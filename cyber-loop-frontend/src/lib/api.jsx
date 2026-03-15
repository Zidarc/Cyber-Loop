const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',  // ← add this
      ...(options.headers ?? {}),
    },
  });
  return res;
}