const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'API_ERROR',
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function parseError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string; message?: string }
    return new ApiError(
      response.status,
      body.message || body.error || response.statusText,
      body.error,
    )
  } catch {
    return new ApiError(response.status, response.statusText)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw await parseError(response)
  }

  return (await response.json()) as T
}

async function upload<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    credentials: 'include',
    body,
  })
  if (!response.ok) throw await parseError(response)
  return (await response.json()) as T
}

async function download(path: string, fallbackFilename: string) {
  const response = await fetch(`${API_BASE}/api/v1${path}`, { credentials: 'include' })
  if (!response.ok) throw await parseError(response)
  const disposition = response.headers.get('content-disposition') ?? ''
  const filename =
    disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)?.[1] ?? fallbackFilename
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  upload,
  download,
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}
