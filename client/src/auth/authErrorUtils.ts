/**
 * Reads Firebase `FirebaseError.code` when present; returns trimmed string or empty for unknown throws.
 */
export function getAuthErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code).trim()
  }
  return ''
}
