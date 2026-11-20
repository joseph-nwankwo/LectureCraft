/**
 * T-11 — DOCX extraction regression via mammoth + @xmldom/xmldom
 *
 * Phase B override adds @xmldom/xmldom 0.8.15 (patched for injection, ReDoS,
 * and quadratic-complexity parsing). This test verifies that the extraction
 * path introduced by that override still works correctly by exercising the
 * actual mammoth.extractRawText() call against a real DOCX buffer.
 *
 * The docx package (direct production dep) generates the test DOCX in-process
 * so no external fixture files are needed.
 */

// ── Environment setup ─────────────────────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET               = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET              = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.CRAFT_LAUNCH_SECRET             = 'test-craft-launch-secret-min-32-chars-long!'
process.env.COOKIE_SECRET                   = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL         = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-entitlement-service-secret-min-32-chars'

// ── Mocks ────────────────────────────────────────────────────────────────────
// Bypass auth so the test exercises extraction logic without a real JWT / DB
jest.mock('../middleware/auth.middleware', () => ({
  authenticate: (_req: Express.Request, _res: Express.Response, next: Express.NextFunction) => next(),
}))

import supertest from 'supertest'
import express from 'express'
import type Express from 'express-serve-static-core'
import contextExtractRouter from '../routes/context-extract.routes'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

function buildApp() {
  const app = express()
  app.use('/api/context-extract', contextExtractRouter)
  return app
}

/** Build a minimal valid DOCX buffer from text using the docx production dep. */
function buildDocxBuffer(text: string): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Document, Paragraph, Packer } = require('docx') as typeof import('docx')
  const doc = new Document({ sections: [{ children: [new Paragraph({ text })] }] })
  return Packer.toBuffer(doc).then((u8) => Buffer.from(u8))
}

const app = buildApp()

describe('POST /api/context-extract/extract — DOCX via mammoth + @xmldom/xmldom 0.8.15', () => {

  it('T-11a: extracts text from a valid DOCX (real mammoth + xmldom, no mocks)', async () => {
    const content = 'Phase B xmldom regression: Hello, LectureSuite!'
    const docxBuf = await buildDocxBuffer(content)

    const res = await supertest(app)
      .post('/api/context-extract/extract')
      .attach('files', docxBuf, { filename: 'regression.docx', contentType: DOCX_MIME })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('success')
    expect(res.body.sources).toHaveLength(1)
    expect(res.body.sources[0].filename).toBe('regression.docx')
    expect(res.body.sources[0].chars).toBeGreaterThan(0)
    expect(res.body.combined).toContain(content)
    expect(res.body.errors).toHaveLength(0)
    expect(res.body.totalChars).toBeGreaterThan(0)
  })

  it('T-11b: handles malformed (non-ZIP) DOCX gracefully — error captured, no 500', async () => {
    const garbage = Buffer.from('this-is-not-a-docx-file-xPKxxx')

    const res = await supertest(app)
      .post('/api/context-extract/extract')
      .attach('files', garbage, { filename: 'broken.docx', contentType: DOCX_MIME })

    // Route catches extraction errors per-file and returns 200 with errors array
    expect(res.status).toBe(200)
    expect(res.body.errors).toHaveLength(1)
    expect(res.body.errors[0].filename).toBe('broken.docx')
    expect(typeof res.body.errors[0].error).toBe('string')
    expect(res.body.sources).toHaveLength(0)
  })

  it('T-11c: returns 400 when no files are uploaded', async () => {
    const res = await supertest(app)
      .post('/api/context-extract/extract')

    expect(res.status).toBe(400)
  })

  it('T-11d: extracts plain text without invoking mammoth', async () => {
    const content = 'Plain text extraction — does not use mammoth or xmldom.'
    const textBuf = Buffer.from(content, 'utf-8')

    const res = await supertest(app)
      .post('/api/context-extract/extract')
      .attach('files', textBuf, { filename: 'notes.txt', contentType: 'text/plain' })

    expect(res.status).toBe(200)
    expect(res.body.combined).toContain(content)
    expect(res.body.errors).toHaveLength(0)
  })
})
