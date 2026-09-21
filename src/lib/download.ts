import { api, type ApiRequestConfig } from '@/lib/axios'

function parseFilenameFromDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim())
    } catch {
      return utf8Match[1].trim()
    }
  }
  const plainMatch = /filename="?([^";\n]+)"?/i.exec(header)
  return plainMatch?.[1]?.trim() || fallback
}

/** Fetch blob from API and trigger browser download. */
export async function downloadBlobFromApi(
  url: string,
  fallbackFilename: string,
): Promise<void> {
  const config: ApiRequestConfig = {
    responseType: 'blob',
    skipAuthRedirect: true,
  }
  const response = await api.get<Blob>(url, config)

  const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart])
  const filename = parseFilenameFromDisposition(
    response.headers['content-disposition'] as string | undefined,
    fallbackFilename,
  )

  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
