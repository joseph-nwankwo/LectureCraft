/**
 * Round 4 — Finding 7: text/plain magic-byte (content) validation
 *
 * Verifies:
 * - validateSubmissionMagicBytes returns true for plain ASCII text
 * - validateSubmissionMagicBytes returns true for UTF-8 text without null bytes
 * - validateSubmissionMagicBytes returns false for buffers containing null bytes
 *   (binary content falsely declared as text/plain)
 * - Other MIME types with null bytes pass through their own magic-byte checks
 */

process.env.DATABASE_URL       = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET  = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.COOKIE_SECRET      = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL            = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-central-entitlement-service-secret-0123'

import { validateSubmissionMagicBytes } from '../services/storage/storage.service'

describe('Finding 7: validateSubmissionMagicBytes — text/plain', () => {
  it('accepts valid ASCII text', () => {
    const buf = Buffer.from('Hello World\nThis is a submission.\n')
    expect(validateSubmissionMagicBytes(buf, 'text/plain')).toBe(true)
  })

  it('accepts valid UTF-8 text (no null bytes)', () => {
    const buf = Buffer.from('こんにちは — LectureSuite submission\n', 'utf8')
    expect(validateSubmissionMagicBytes(buf, 'text/plain')).toBe(true)
  })

  it('rejects binary content containing a null byte', () => {
    const buf = Buffer.from([0x48, 0x65, 0x6c, 0x00, 0x6c, 0x6f])  // "Hel\0lo"
    expect(validateSubmissionMagicBytes(buf, 'text/plain')).toBe(false)
  })

  it('rejects an EXE header disguised as text/plain (contains null bytes)', () => {
    // MZ header followed by null bytes (PE binary)
    const buf = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00])
    expect(validateSubmissionMagicBytes(buf, 'text/plain')).toBe(false)
  })
})

describe('Finding 7: validateSubmissionMagicBytes — PDF still validated', () => {
  it('accepts a valid PDF magic header', () => {
    const buf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])  // %PDF-1
    expect(validateSubmissionMagicBytes(buf, 'application/pdf')).toBe(true)
  })

  it('rejects a buffer that lacks the PDF magic bytes', () => {
    const buf = Buffer.from('Not a PDF file')
    expect(validateSubmissionMagicBytes(buf, 'application/pdf')).toBe(false)
  })
})
