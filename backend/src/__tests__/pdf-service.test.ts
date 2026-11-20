/**
 * T-PDF — Puppeteer PDF generation smoke test
 *
 * Phase B override adds ip-address 10.7.6 (via socks -> proxy-agent ->
 * @puppeteer/browsers -> puppeteer). This test exercises the actual
 * generatePDF() function to verify puppeteer remains functional after
 * the override.
 *
 * Chrome availability: This is a LOCAL DEVELOPMENT convenience test.
 * The authoritative CI PDF verification is the `docker-verify` job in
 * .github/workflows/ci.yml, which builds the production Docker image,
 * launches Chromium at /usr/bin/chromium-browser (Alpine package), and
 * calls generatePDF() against the compiled dist/. The backend-test CI job
 * sets PUPPETEER_SKIP_DOWNLOAD=true so this Jest test skips deterministically
 * there; docker-verify provides the runtime evidence.
 *
 * Local resolution order (when PUPPETEER_SKIP_DOWNLOAD is not set):
 *   1. PUPPETEER_EXECUTABLE_PATH env var (explicit override)
 *   2. System Chrome at known Windows paths
 *   3. Puppeteer-bundled Chrome cache
 * If none are found the test is skipped with a note.
 *
 * SOCKS proxy note: ip-address is used by socks@2.8.9 for proxy-connection
 * validation. No SOCKS proxy is configured in this environment, so the
 * ip-address -> socks code path is NOT directly exercised. The test
 * verifies that puppeteer.launch() and PDF generation succeed; socks/
 * ip-address remain indirectly verified via the working proxy-agent chain.
 */

// -- Environment setup -------------------------------------------------------
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET               = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET              = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.CRAFT_LAUNCH_SECRET             = 'test-craft-launch-secret-min-32-chars-long!'
process.env.COOKIE_SECRET                   = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL         = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-entitlement-service-secret-min-32-chars'

import fs from 'fs'
import path from 'path'

// Resolve a Chrome executable before importing pdf.service (which loads puppeteer).
// Priority: PUPPETEER_EXECUTABLE_PATH (CI) > system Chrome (Windows local dev) > puppeteer cache.
function resolveChromePath(): string | null {
  // In CI backend-test job, PUPPETEER_SKIP_DOWNLOAD=true is set, so no Chrome
  // is downloaded and this function returns null — the test skips. The docker-verify
  // CI job is the authoritative PDF smoke test for the production runtime.
  if (process.env.PUPPETEER_SKIP_DOWNLOAD === 'true') return null

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const p = process.env.PUPPETEER_EXECUTABLE_PATH
    return fs.existsSync(p) ? p : null
  }
  const windowsCandidates = [
    path.join('C:\\', 'Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join('C:\\', 'Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env.LOCALAPPDATA ?? '', 'Chromium', 'Application', 'chrome.exe'),
  ]
  for (const c of windowsCandidates) {
    if (c && fs.existsSync(c)) return c
  }
  // Fall back to puppeteer-bundled cache (only present when downloaded via full install)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require('puppeteer') as { executablePath(): string }
    const cached = puppeteer.executablePath()
    return fs.existsSync(cached) ? cached : null
  } catch {
    return null
  }
}

const chromePath = resolveChromePath()
if (chromePath && !process.env.PUPPETEER_EXECUTABLE_PATH) {
  process.env.PUPPETEER_EXECUTABLE_PATH = chromePath
}

import { generatePDF, contentToHtml } from '../services/document/pdf.service'

const describeOrSkip = chromePath ? describe : describe.skip

describeOrSkip('Puppeteer PDF generation (T-PDF) -- ip-address 10.7.6 override smoke test', () => {
  if (!chromePath) {
    it.skip('T-PDF-a: SKIPPED — no Chrome/Chromium executable found (CI-only test)', () => {})
    return
  }

  it('T-PDF-a: generates a non-empty PDF buffer with %PDF- magic bytes', async () => {
    const html = contentToHtml(
      'Phase B ip-address Smoke Test',
      'Verifying puppeteer PDF generation after ip-address 10.7.6 override. ' +
      'Chromium: ' + chromePath,
    )

    const pdfBuf = await generatePDF(html)

    expect(pdfBuf).toBeInstanceOf(Buffer)
    expect(pdfBuf.length).toBeGreaterThan(100)

    // Verify %PDF- magic bytes at offset 0
    const header = pdfBuf.subarray(0, 5).toString('ascii')
    expect(header).toBe('%PDF-')
  }, 60_000)
})
