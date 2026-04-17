const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function req(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  return res.json()
}

export const assessmentTypesAPI = {
  getAll: () => req('/assessment-types'),
  getById: (id: number | string) => req(`/assessment-types/${id}`),
  getBySlug: (slug: string) => req(`/assessment-types/slug/${slug}`),
}

export const assessmentAPI = {
  submit: (data: unknown) => req('/assessment/submit', { method: 'POST', body: JSON.stringify(data) }),
  getById: (id: number | string, format?: string) =>
    req(`/assessment/${id}${format ? `?format=${format}` : ''}`),
  search: (data: { email: string; name?: string }) =>
    req('/assessment/search', { method: 'POST', body: JSON.stringify(data) }),
}
