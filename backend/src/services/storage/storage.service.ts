import crypto from 'crypto'
import { Readable } from 'stream'
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { s3Client, S3_BUCKET, S3_PUBLIC_URL } from '../../config/s3'
import { env } from '../../config/env'

// ── R2 availability ───────────────────────────────────────────────────────────

/**
 * Returns true when ALL required Cloudflare R2 configuration is present.
 * AWS_S3_ENDPOINT is required: without it the SDK silently targets AWS S3
 * instead of the R2 account endpoint (https://<id>.r2.cloudflarestorage.com).
 */
export function isR2Configured(): boolean {
  return !!(
    env.AWS_ACCESS_KEY_ID &&
    env.AWS_SECRET_ACCESS_KEY &&
    env.AWS_S3_BUCKET &&
    env.AWS_S3_ENDPOINT &&
    env.AWS_S3_PUBLIC_URL
  )
}

/**
 * Throws at startup if running in production without a fully configured R2
 * bucket. Upload handlers fall back to local disk in development; that path
 * is never safe for production (ephemeral container filesystem).
 *
 * AWS_S3_ENDPOINT (the Cloudflare R2 account endpoint) is required so the
 * SDK does not silently target the wrong storage provider.
 */
export function requireR2InProduction(): void {
  if (env.NODE_ENV === 'production' && !isR2Configured()) {
    throw new Error(
      'R2 storage is not configured. ' +
      'Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, ' +
      'AWS_S3_ENDPOINT (https://<account-id>.r2.cloudflarestorage.com), ' +
      'and AWS_S3_PUBLIC_URL before starting the production server.',
    )
  }
}

// ── MIME → extension (from MIME type, not user-supplied filename) ─────────────

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
  'image/gif':  'gif',
}

export function mimeToExt(mimeType: string): string {
  return MIME_TO_EXT[mimeType] ?? 'bin'
}

// ── Magic byte validation ─────────────────────────────────────────────────────
// Verifies that the binary content matches the declared MIME type.
// Prevents content-type spoofing (e.g. PHP/ELF disguised as image/jpeg).

type MagicCheck = { offset: number; bytes: number[] }
const MAGIC: Record<string, MagicCheck[]> = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8] }],
  'image/png':  [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  'image/webp': [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // RIFF
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // WEBP
  ],
  'image/gif': [{ offset: 0, bytes: [0x47, 0x49, 0x46] }],
}

export function validateImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const checks = MAGIC[mimeType]
  if (!checks) return false
  return checks.every(({ offset, bytes }) =>
    bytes.every((byte, i) => buffer[offset + i] === byte)
  )
}

// ── R2 upload ─────────────────────────────────────────────────────────────────

export async function uploadToR2(
  folder: string,
  buffer: Buffer,
  mimeType: string,
  overrideKey?: string,
): Promise<string> {
  const ext = mimeToExt(mimeType)
  const key = overrideKey ?? `${folder}/${crypto.randomBytes(16).toString('hex')}.${ext}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket:      S3_BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: mimeType,
    })
  )

  const base = S3_PUBLIC_URL ?? `https://${S3_BUCKET}.s3.amazonaws.com`
  return `${base}/${key}`
}

export async function deleteFromR2(urlOrKey: string): Promise<void> {
  // Accept either a full public URL or a bare key.
  const base = S3_PUBLIC_URL ?? `https://${S3_BUCKET}.s3.amazonaws.com`
  const key  = urlOrKey.startsWith(base) ? urlOrKey.slice(base.length + 1) : urlOrKey
  if (!key) return
  await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }))
}

// ── Signed download URL (private objects) ─────────────────────────────────────

export async function generateSignedDownloadUrl(
  key: string,
  expiresInSeconds = 600,
  fileName?: string | null,
): Promise<string> {
  const disposition = fileName
    ? `attachment; filename="${fileName.replace(/"/g, '_')}"`
    : 'attachment'
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ResponseContentDisposition: disposition,
    ResponseContentType: 'application/octet-stream',
  })
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds })
}

// ── Stream private object through backend ─────────────────────────────────────

export async function streamFromR2(key: string): Promise<{ body: Readable; contentType: string; contentLength?: number }> {
  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  const result  = await s3Client.send(command)
  if (!result.Body) throw new Error('R2 object body is empty')
  return {
    body:          result.Body as Readable,
    contentType:   result.ContentType ?? 'application/octet-stream',
    contentLength: result.ContentLength,
  }
}

// ── Submission-specific MIME types and magic bytes ────────────────────────────

export const SUBMISSION_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'text/plain',
  'image/jpeg',
  'image/png',
  'application/zip',
])

type SubmissionMagicCheck = { offset: number; bytes: number[] }
const SUBMISSION_MAGIC: Record<string, SubmissionMagicCheck[]> = {
  'application/pdf':  [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],                   // %PDF
  'application/msword': [{ offset: 0, bytes: [0xD0, 0xCF, 0x11, 0xE0] }],                 // OLE2
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }],                                     // ZIP/PK
  'application/vnd.oasis.opendocument.text':
    [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }],                                     // ZIP/PK
  'application/zip': [{ offset: 0, bytes: [0x50, 0x4B, 0x03, 0x04] }],                    // ZIP/PK
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8] }],
  'image/png':  [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  // text/plain has no reliable magic bytes — accept on MIME alone
}

export function validateSubmissionMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'text/plain') {
    // text/plain: must be valid UTF-8 and must not contain binary-like sequences.
    // Reject null bytes, BOM-free non-UTF-8 sequences, and C0 control chars
    // other than the three that appear in legitimate plain text (TAB, LF, CR).
    try {
      const text = buffer.toString('utf8')
      // After round-tripping through utf8, any invalid byte sequence becomes U+FFFD
      if (Buffer.byteLength(text, 'utf8') !== buffer.length) return false
      if (text.includes('�')) return false
    } catch {
      return false
    }
    for (let i = 0; i < buffer.length; i++) {
      const b = buffer[i]!
      if (b === 0x00) return false           // null byte
      // Reject C0 control chars except TAB (0x09), LF (0x0A), CR (0x0D)
      if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) return false
      // Reject DEL (0x7F)
      if (b === 0x7f) return false
    }
    return true
  }
  const checks = SUBMISSION_MAGIC[mimeType]
  if (!checks) return false
  return checks.every(({ offset, bytes }) =>
    bytes.every((byte, i) => buffer[offset + i] === byte)
  )
}
