import http from 'node:http'
import httpProxy from 'http-proxy'

const PORT = process.env.DEV_PROXY_PORT ?? 4000

const BACKEND = 'http://127.0.0.1:8000'
// Vite/Nitro dev servers bind to "localhost", which on some machines resolves
// to the IPv6 loopback ([::1]) only — target "localhost" here too rather than
// hardcoding 127.0.0.1, or the proxy gets ECONNREFUSED against an IPv4-only address.
const PUBLIC_WEB = 'http://localhost:3000'
const SPA = 'http://localhost:5173'

const proxy = httpProxy.createProxyServer({ changeOrigin: true, ws: true })

proxy.on('error', (err, req, res) => {
  console.error(`[dev-proxy] ${req.method} ${req.url} -> error: ${err.message}`)
  if (res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end('Bad gateway (is the target dev server running?)')
  }
})

function targetFor(url) {
  if (url.startsWith('/api/') || url.startsWith('/sanctum/')) return BACKEND
  if (
    url.startsWith('/articles') ||
    url.startsWith('/equipment') ||
    url.startsWith('/u/')
  ) {
    return PUBLIC_WEB
  }
  return SPA
}

const server = http.createServer((req, res) => {
  proxy.web(req, res, { target: targetFor(req.url) })
})

// Forward WebSocket upgrades (Vite/Nuxt HMR) to whichever app owns the path.
server.on('upgrade', (req, socket, head) => {
  proxy.ws(req, socket, head, { target: targetFor(req.url) })
})

server.listen(PORT, () => {
  console.log(`[dev-proxy] listening on http://localhost:${PORT}`)
  console.log(`[dev-proxy]   /api/**, /sanctum/** -> ${BACKEND}`)
  console.log(`[dev-proxy]   /articles/**, /equipment/**, /u/** -> ${PUBLIC_WEB}`)
  console.log(`[dev-proxy]   everything else -> ${SPA}`)
})
