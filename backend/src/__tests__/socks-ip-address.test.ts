/**
 * T-SOCKS — SOCKS5/ip-address integration test
 *
 * Phase B override: ip-address@10.7.6
 * Dependency chain: puppeteer → @puppeteer/browsers → proxy-agent →
 *   socks-proxy-agent → socks@2.8.9 → ip-address@10.7.6
 *
 * WHERE ip-address IS CALLED:
 *   socks/build/common/helpers.js exports three functions that use ip-address:
 *   - ipv4ToInt32(ip)  → new Address4(ip).toArray()  [SOCKS4 frame encoding]
 *   - int32ToIpv4(n)   → reconstructs dotted-quad from int
 *   - ipToBuffer(ip)   → new Address4/Address6(ip).toArray() [SOCKS5 frame encoding]
 *
 *   SocksClient.sendSocks5CommandRequest() (socksclient.js:611-617) calls
 *   helpers.ipToBuffer(destination.host) when the destination is an IPv4 or
 *   IPv6 address. This is the production code path triggered whenever Puppeteer
 *   connects to a Chromium instance via a SOCKS proxy.
 *
 * TEST STRATEGY:
 *   Three levels of verification, all deterministic and local (no external network):
 *   T-SOCKS-a — Full integration: SocksClient connects through an in-process
 *     SOCKS5 proxy to a local TCP echo server using 127.0.0.1 as the destination.
 *     This causes SocksClient to call ipToBuffer('127.0.0.1') during the
 *     SOCKS5 command request frame. A successful connection proves ip-address
 *     Address4 is compatible with socks@2.8.9 at runtime.
 *   T-SOCKS-b — End-to-end data: Sends a probe string through the SOCKS5 tunnel
 *     and verifies the echo server reflects it back. Proves the full proxy path.
 *   T-SOCKS-c — Direct helper unit tests: Calls ipv4ToInt32, int32ToIpv4, and
 *     ipToBuffer (IPv4 + IPv6) directly. These call ip-address Address4/Address6
 *     with no network setup required and confirm API compatibility with the
 *     expected return values used by socks internally.
 */

// ── Environment setup ─────────────────────────────────────────────────────────
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.JWT_ACCESS_SECRET               = 'test-jwt-access-secret-min-32-chars-long!!'
process.env.JWT_REFRESH_SECRET              = 'test-jwt-refresh-secret-min-32-chars-long!'
process.env.CRAFT_LAUNCH_SECRET             = 'test-craft-launch-secret-min-32-chars-long!'
process.env.COOKIE_SECRET                   = 'test-cookie-secret-min-32-chars-long!!!!!!!'
process.env.CENTRAL_ENTITLEMENT_URL         = 'http://portal.test/api/internal/entitlements/verify'
process.env.CENTRAL_ENTITLEMENT_SERVICE_SECRET = 'test-entitlement-service-secret-min-32-chars'

import net from 'net'

// socks is a transitive dep (puppeteer → proxy-agent → socks-proxy-agent → socks).
// Not a direct dep; use require() with the type exported by the package itself.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SocksClient } = require('socks') as typeof import('socks')

// socks helper functions that call ip-address internally (not part of public API
// but stable across socks@2.x and directly tested to prove compatibility).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const socksHelpers = require('../../node_modules/socks/build/common/helpers') as {
  ipv4ToInt32: (ip: string) => number
  int32ToIpv4: (n: number) => string
  ipToBuffer:  (ip: string) => Buffer
}

// ── Minimal in-process SOCKS5 proxy ──────────────────────────────────────────
//
// Implements the RFC 1928 SOCKS5 no-authentication connect flow:
//   CLIENT  →  \x05\x01\x00                    (greeting: v5, 1 method, no-auth)
//   SERVER  →  \x05\x00                         (auth method: no-auth)
//   CLIENT  →  \x05\x01\x00\x01<4B-ip><2B-port> (connect to IPv4 target)
//   SERVER  →  \x05\x00\x00\x01\x00\x00\x00\x00\x00\x00  (success)
//   <data tunnelled between client and target>
//
// The server only accepts IPv4 destinations; other address types are rejected.

function startSocks5Server(): Promise<{ server: net.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((client) => {
      let buf = Buffer.alloc(0)
      let state: 'greeting' | 'request' | 'tunnel' = 'greeting'
      let targetSocket: net.Socket | null = null

      client.on('data', (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk])

        if (state === 'greeting') {
          // Need at least 3 bytes: ver + nMethods + method[0]
          if (buf.length < 2) return
          const nMethods = buf[1]
          if (buf.length < 2 + nMethods) return
          // Respond: accept no-auth regardless of offered methods
          client.write(Buffer.from([0x05, 0x00]))
          buf = buf.subarray(2 + nMethods)
          state = 'request'
        }

        if (state === 'request') {
          // Minimum request is 10 bytes for IPv4: ver+cmd+rsv+atype+4ip+2port
          if (buf.length < 10) return
          if (buf[3] !== 0x01) {
            // Not IPv4 — reject
            client.write(Buffer.from([0x05, 0x08, 0x00, 0x01, 0, 0, 0, 0, 0, 0]))
            client.destroy()
            return
          }
          const destIp   = `${buf[4]}.${buf[5]}.${buf[6]}.${buf[7]}`
          const destPort = buf.readUInt16BE(8)
          const remaining = buf.subarray(10)
          buf = Buffer.alloc(0)
          state = 'tunnel'

          targetSocket = net.createConnection(destPort, destIp, () => {
            // Send SOCKS5 success reply (bind addr 0.0.0.0:0)
            const reply = Buffer.from([
              0x05, 0x00, 0x00, 0x01,
              0x00, 0x00, 0x00, 0x00,
              0x00, 0x00,
            ])
            client.write(reply)
            if (remaining.length > 0) targetSocket!.write(remaining)
            client.pipe(targetSocket!)
            targetSocket!.pipe(client)
          })
          targetSocket.on('error', () => { client.destroy() })
          client.on('error',  () => { targetSocket?.destroy() })
        }
      })

      client.on('error', () => { targetSocket?.destroy() })
    })

    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port
      resolve({ server, port })
    })
    server.on('error', reject)
  })
}

// ── Minimal TCP echo server ───────────────────────────────────────────────────

function startEchoServer(): Promise<{ server: net.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      socket.on('data', (data: Buffer) => socket.write(data))
      socket.on('error', () => {})
    })
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as net.AddressInfo).port
      resolve({ server, port })
    })
    server.on('error', reject)
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SOCKS5/ip-address integration (T-SOCKS) — ip-address@10.7.6 override', () => {
  let echoServer:  net.Server
  let socksServer: net.Server
  let echoPort:  number
  let socksPort: number

  beforeAll(async () => {
    const echo  = await startEchoServer()
    const socks = await startSocks5Server()
    echoServer  = echo.server
    echoPort    = echo.port
    socksServer = socks.server
    socksPort   = socks.port
  })

  afterAll(async () => {
    await Promise.all([
      new Promise<void>(r => echoServer.close(()  => r())),
      new Promise<void>(r => socksServer.close(() => r())),
    ])
  })

  it('T-SOCKS-a: SocksClient connects to IPv4 target through SOCKS5 proxy (exercises ip-address Address4 via ipToBuffer)', async () => {
    // This triggers SocksClient.sendSocks5CommandRequest() which calls
    // helpers.ipToBuffer('127.0.0.1') → new ip_address_1.Address4('127.0.0.1')
    const result = await SocksClient.createConnection({
      proxy:       { host: '127.0.0.1', port: socksPort, type: 5 },
      destination: { host: '127.0.0.1', port: echoPort },
      command:     'connect',
    })

    expect(result.socket).toBeTruthy()
    expect(result.socket.destroyed).toBe(false)
    result.socket.destroy()
  }, 10_000)

  it('T-SOCKS-b: Echo data through SOCKS5 tunnel verifies end-to-end proxy path', async () => {
    const result = await SocksClient.createConnection({
      proxy:       { host: '127.0.0.1', port: socksPort, type: 5 },
      destination: { host: '127.0.0.1', port: echoPort },
      command:     'connect',
    })

    const probe = 'SOCKS-PROBE-ip-address-10.7.6'

    const received = await new Promise<string>((resolve, reject) => {
      const chunks: Buffer[] = []
      result.socket.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
        const text = Buffer.concat(chunks).toString('utf8')
        if (text.includes(probe)) resolve(text)
      })
      result.socket.on('error', reject)
      result.socket.write(probe)
    })

    result.socket.destroy()
    expect(received).toContain(probe)
  }, 10_000)

  it('T-SOCKS-c: socks helper functions using ip-address produce correct binary encodings (Address4 + Address6)', () => {
    // ── IPv4: ipv4ToInt32 + int32ToIpv4 roundtrip ──────────────────────────
    // These call ip-address Address4 internally (socks/build/common/helpers.js:132)
    expect(socksHelpers.ipv4ToInt32('127.0.0.1')).toBe(0x7F000001)
    expect(socksHelpers.ipv4ToInt32('10.0.0.1')).toBe(0x0A000001)
    expect(socksHelpers.ipv4ToInt32('255.255.255.255')).toBe(0xFFFFFFFF >>> 0)
    expect(socksHelpers.int32ToIpv4(socksHelpers.ipv4ToInt32('192.168.1.1'))).toBe('192.168.1.1')

    // ── IPv4: ipToBuffer produces the correct 4-byte big-endian encoding ──
    // SocksClient writes this buffer into the SOCKS5 command frame (socksclient.js:613)
    const buf4 = socksHelpers.ipToBuffer('127.0.0.1')
    expect(buf4).toBeInstanceOf(Buffer)
    expect(buf4.length).toBe(4)
    expect([...buf4]).toEqual([127, 0, 0, 1])

    const buf4b = socksHelpers.ipToBuffer('10.20.30.40')
    expect([...buf4b]).toEqual([10, 20, 30, 40])

    // ── IPv6: ipToBuffer produces the correct 16-byte encoding ────────────
    // SocksClient writes this buffer for IPv6 destinations (socksclient.js:617)
    const buf6 = socksHelpers.ipToBuffer('::1')
    expect(buf6).toBeInstanceOf(Buffer)
    expect(buf6.length).toBe(16)
    // Last byte should be 0x01 (loopback)
    expect(buf6[15]).toBe(0x01)
    // First 15 bytes should be zero
    expect([...buf6.subarray(0, 15)].every(b => b === 0)).toBe(true)
  })
})
