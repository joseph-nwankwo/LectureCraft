/**
 * Parses and validates ADDITIONAL_FRONTEND_URLS.
 * Accepts a comma-separated list of absolute HTTP/HTTPS origins.
 * Throws a descriptive Error on any invalid entry.
 */
export function parseAdditionalFrontendUrls(raw: string | undefined): string[] {
  if (!raw?.trim()) return []

  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(validateOrigin)
}

function validateOrigin(s: string): string {
  let u: URL
  try {
    u = new URL(s)
  } catch {
    throw new Error(
      `ADDITIONAL_FRONTEND_URLS: "${s}" is not a valid URL`,
    )
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error(
      `ADDITIONAL_FRONTEND_URLS: "${s}" must use http or https`,
    )
  }
  if (u.pathname !== '/' || u.search !== '' || u.hash !== '') {
    throw new Error(
      `ADDITIONAL_FRONTEND_URLS: "${s}" must be a bare origin with no path, query string or fragment`,
    )
  }
  return s
}
