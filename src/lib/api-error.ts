export type ApiErrorMessageOptions = {
    fallback?: string
    includeDetail?: boolean
}

function extractMessageFromString(input: string): string {
    const raw = input.trim()
    if (!raw) return ''

    // If the backend accidentally returns/embeds stack traces, pick the most useful part.
    const firstLine = raw.split('\n')[0]?.trim() ?? raw

    const apiErrorIdx = firstLine.toLowerCase().indexOf('apierror:')
    if (apiErrorIdx >= 0) {
        const after = firstLine.slice(apiErrorIdx + 'apierror:'.length).trim()
        return after || firstLine
    }

    const errIdx = firstLine.toLowerCase().indexOf('error:')
    if (errIdx >= 0) {
        const after = firstLine.slice(errIdx + 'error:'.length).trim()
        return after || firstLine
    }

    return firstLine
}

function extractMessageFromResponseData(data: unknown): string {
    if (typeof data === 'string') return extractMessageFromString(data)
    if (!data || typeof data !== 'object') return ''

    const obj = data as Record<string, unknown>

    if (typeof obj.message === 'string' && obj.message.trim()) return extractMessageFromString(obj.message)
    if (typeof obj.error === 'string' && obj.error.trim()) return extractMessageFromString(obj.error)
    if (typeof obj.detail === 'string' && obj.detail.trim()) return extractMessageFromString(obj.detail)

    if (Array.isArray(obj.errors) && typeof obj.errors[0] === 'string') {
        return extractMessageFromString(String(obj.errors[0]))
    }

    // Some APIs wrap payload inside { data: ... }
    if ('data' in obj) {
        return extractMessageFromResponseData(obj.data)
    }

    return ''
}

function translateKnownMessages(message: string): { translated: string; original: string } {
    const original = message.trim()
    if (!original) return { translated: '', original: '' }

    const s = original.toLowerCase()

    if (s.includes('address not found for this user')) {
        return { translated: 'Bu kullanıcı için adres bulunamadı.', original }
    }

    if (s.includes('unauthorized') || s.includes('jwt') || s.includes('token')) {
        return { translated: 'Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.', original }
    }

    if (s.includes('forbidden') || s.includes('permission')) {
        return { translated: 'Bu işlem için yetkiniz yok.', original }
    }

    if (s.includes('not found')) {
        return { translated: 'Kayıt bulunamadı.', original }
    }

    if (s.includes('out of stock') || s.includes('insufficient') || s.includes('stock')) {
        return { translated: 'Stok yetersiz.', original }
    }

    if (s.includes('bad request') || s.includes('validation')) {
        return { translated: 'Girdiğiniz bilgiler geçersiz. Lütfen kontrol edin.', original }
    }

    return { translated: original, original }
}

export function getApiErrorMessage(err: unknown, options?: ApiErrorMessageOptions): string {
    const fallback = options?.fallback ?? 'İşlem başarısız.'
    const includeDetail = options?.includeDetail ?? true

    const e = err as {
        message?: unknown
        response?: {
            status?: unknown
            data?: unknown
        }
    }

    const status = typeof e?.response?.status === 'number' ? e.response.status : undefined
    const responseMessage = extractMessageFromResponseData(e?.response?.data)
    const errorMessage = typeof e?.message === 'string' ? extractMessageFromString(e.message) : ''

    // Prefer response message if present; otherwise fall back to Error.message.
    const primary = responseMessage || errorMessage

    // If we got nothing, provide a status-based fallback.
    if (!primary) {
        if (status === 401) return 'Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.'
        if (status === 403) return 'Bu işlem için yetkiniz yok.'
        if (status === 404) return fallback
        if (status === 413) return 'Dosya boyutu çok büyük.'
        return fallback
    }

    const { translated, original } = translateKnownMessages(primary)
    if (!includeDetail) return translated || fallback

    // If translation changes the message, keep original as detail.
    const translatedLower = translated.toLowerCase()
    const originalLower = original.toLowerCase()

    const shouldAddOriginalDetail = translatedLower !== originalLower
    const shouldAddErrorDetail = errorMessage && errorMessage.toLowerCase() !== originalLower && errorMessage.toLowerCase() !== translatedLower

    if (shouldAddOriginalDetail && shouldAddErrorDetail) {
        return `${translated} (Detay: ${original}; ${errorMessage})`
    }
    if (shouldAddOriginalDetail) {
        return `${translated} (Detay: ${original})`
    }
    if (shouldAddErrorDetail && translatedLower !== errorMessage.toLowerCase()) {
        return `${translated} (Detay: ${errorMessage})`
    }

    return translated || fallback
}
