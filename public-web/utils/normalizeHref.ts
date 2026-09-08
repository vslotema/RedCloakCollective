/**
 * Turn a user-typed/pasted link into a usable href. Leaves an explicit scheme,
 * root-relative path, or fragment alone; otherwise assumes `https://`. Empty in,
 * empty out.
 */
export function normalizeHref(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
