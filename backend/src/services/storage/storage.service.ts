import crypto from 'crypto'
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { s3Client, S3_BUCKET, S3_PUBLIC_URL } from '../../config/s3'
import { env } from '../../config/env'

// ── R2 availability ───────────────────────────────────────────────────────────

export function isR2Configured(): boolean {
  return !!(
    env.AWS_ACCESS_KEY_ID &&
    env.AWS_SECRET_ACCESS_KEY &&
    env.AWS_S3_BUCKET &&
    env.AWS_S3_PUBLIC_URL
  )
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
  mimeType: string
): Promise<string> {
  const ext = mimeToExt(mimeType)
  const key = `${folder}/${crypto.randomBytes(16).toString('hex')}.${ext}`

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
