export type ApiErrorMessageOptions = {
    fallback?: string
    includeDetail?: boolean
}

/** Yanıtın HTML sayfası (örn. 404 sayfası) olup olmadığını kontrol eder; böyleyse metin olarak kullanılmaz */
function isHtmlResponse(text: string): boolean {
    const t = text.trim().toLowerCase()
    return t.startsWith('<!doctype') || t.startsWith('<html') || (t.startsWith('<') && t.includes('<!'))
}

/** HTML etiketlerini ve stack trace kısmını kaldırır; sadece okunabilir hata metnini bırakır */
function stripHtmlAndStack(text: string): string {
    let s = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<pre>|<\/pre>/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    // " at FilePath" veya "\n at " ile başlayan stack trace satırlarını kes
    const atStack = s.search(/\s+at\s+\S/)
    if (atStack > 0) s = s.slice(0, atStack).trim()
    return s
}

function extractMessageFromString(input: string): string {
    const raw = input.trim()
    if (!raw) return ''

    // If the backend accidentally returns/embeds stack traces, pick the most useful part.
    const firstLine = raw.split('\n')[0]?.trim() ?? raw

    const apiErrorIdx = firstLine.toLowerCase().indexOf('apierror:')
    if (apiErrorIdx >= 0) {
        const after = firstLine.slice(apiErrorIdx + 'apierror:'.length).trim()
        return stripHtmlAndStack(after || firstLine)
    }

    const errIdx = firstLine.toLowerCase().indexOf('error:')
    if (errIdx >= 0) {
        const after = firstLine.slice(errIdx + 'error:'.length).trim()
        return stripHtmlAndStack(after || firstLine)
    }

    return stripHtmlAndStack(firstLine)
}

function extractMessageFromResponseData(data: unknown): string {
    if (typeof data === 'string') {
        if (isHtmlResponse(data)) return ''
        return extractMessageFromString(data)
    }
    if (!data || typeof data !== 'object') return ''

    const obj = data as Record<string, unknown>

    if (typeof obj.message === 'string' && obj.message.trim() && !isHtmlResponse(obj.message)) {
        return extractMessageFromString(obj.message)
    }
    if (typeof obj.error === 'string' && obj.error.trim() && !isHtmlResponse(obj.error)) {
        return extractMessageFromString(obj.error)
    }
    if (typeof obj.detail === 'string' && obj.detail.trim() && !isHtmlResponse(obj.detail)) {
        return extractMessageFromString(obj.detail)
    }

    if (Array.isArray(obj.errors) && typeof obj.errors[0] === 'string') {
        const first = String(obj.errors[0])
        if (!isHtmlResponse(first)) return extractMessageFromString(first)
    }

    // Some APIs wrap payload inside { data: ... }
    if ('data' in obj) {
        return extractMessageFromResponseData(obj.data)
    }

    return ''
}

function translateKnownMessages(message: string): { translated: string; original: string; known: boolean } {
    const original = message.trim()
    if (!original) return { translated: '', original: '', known: false }

    const s = original.toLowerCase()

    if (s.includes('address not found for this user') || s.includes('address not found')) {
        return { translated: 'Bu kullanıcı için adres bulunamadı. Lütfen profil veya adres bilginizi güncelleyin.', original, known: true }
    }

    if (s.includes('unauthorized') || s.includes('jwt') || s.includes('token')) {
        return { translated: 'Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.', original, known: true }
    }

    if (s.includes('forbidden') || s.includes('permission')) {
        return { translated: 'Bu işlem için yetkiniz yok.', original, known: true }
    }

    if (s.includes('not found')) {
        return { translated: 'Kayıt bulunamadı.', original, known: true }
    }

    if (s.includes('out of stock') || s.includes('insufficient') || s.includes('stock')) {
        return { translated: 'Stok yetersiz.', original, known: true }
    }

    if (s.includes('bad request') || s.includes('validation')) {
        return { translated: 'Girdiğiniz bilgiler geçersiz. Lütfen kontrol edin.', original, known: true }
    }

    // Axios / fetch genel hata metinleri (status code ile)
    if (s.includes('request failed with status code 404') || s.includes('status code 404')) {
        return { translated: 'Sayfa veya kayıt bulunamadı.', original, known: true }
    }
    if (s.includes('request failed with status code 500') || s.includes('status code 500')) {
        return { translated: 'Sunucu hatası. Lütfen kısa süre sonra tekrar deneyin.', original, known: true }
    }
    if (s.includes('request failed with status code 403')) {
        return { translated: 'Bu işlem için yetkiniz yok.', original, known: true }
    }
    if (s.includes('request failed with status code 401')) {
        return { translated: 'Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.', original, known: true }
    }
    if (s.includes('request failed with status code')) {
        return { translated: 'İstek başarısız. Lütfen tekrar deneyin.', original, known: true }
    }

    return { translated: original, original, known: false }
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
    let primary = responseMessage || errorMessage

    // HTML sayfası (404 vb.) veya anlamsız metin ise sayma; status ile Türkçe mesaj ver
    if (primary && (isHtmlResponse(primary) || primary.trim().toLowerCase().startsWith('<!doctype'))) {
        primary = ''
    }

    // If we got nothing, provide a status-based fallback.
    if (!primary) {
        if (status === 401) return 'Oturumunuzun süresi dolmuş olabilir. Lütfen tekrar giriş yapın.'
        if (status === 403) return 'Bu işlem için yetkiniz yok.'
        if (status === 404) return 'Sayfa veya kayıt bulunamadı.'
        if (status === 413) return 'Dosya boyutu çok büyük.'
        if (status && status >= 500) return 'Sunucu hatası. Lütfen kısa süre sonra tekrar deneyin.'
        return fallback
    }

    const { translated, original, known } = translateKnownMessages(primary)
    if (!includeDetail) return translated || fallback

    // Bilinen hatalarda sadece Türkçe mesajı göster (stack/HTML ekranı kirletmesin)
    if (known && translated) return translated

    // Diğer hatalarda çeviri varsa detay ekle
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
