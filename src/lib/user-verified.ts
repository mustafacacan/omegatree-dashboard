/**
 * Admin listelerinde yalnızca açıkça doğrulanmış kullanıcıları göstermek için.
 * API bazen boolean, 1/0 veya "true" string döndürebilir; yalnızca "doğrulandı"
 * kabul edilen değerler true döner.
 */
export function isVerifiedFlag(value: unknown): boolean {
  if (value === true) return true
  if (value === false || value == null) return false
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    return s === 'true' || s === '1' || s === 'yes'
  }
  return false
}

export function readUserVerifiedTrue(user: Record<string, unknown> | null | undefined): boolean {
  if (!user) return false
  return isVerifiedFlag(user.isVerified ?? user.is_verified)
}

/** Diyetisyen API satırında doğrulama bazen düğümde, bazen nested `user` içinde gelir */
export function readVerifiedFromDieticianNode(node: unknown): boolean {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return false
  const n = node as Record<string, unknown>
  if (readUserVerifiedTrue(n)) return true
  const u = n.user
  if (u && typeof u === 'object' && !Array.isArray(u)) {
    return readUserVerifiedTrue(u as Record<string, unknown>)
  }
  return false
}
