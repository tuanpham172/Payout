import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const mime = {
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml'
}

export function serve(rootDir, port=5173) {
  const server = http.createServer(async (req,res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname)
      if (pathname === '/') pathname = '/index.html'
      let filePath = path.join(rootDir, pathname)
      try { if ((await stat(filePath)).isDirectory()) filePath = path.join(filePath,'index.html') } catch {}
      let data
      try { data = await readFile(filePath) } catch { data = await readFile(path.join(rootDir,'index.html')) }
      res.writeHead(200, { 'content-type': mime[path.extname(filePath)] || 'application/octet-stream', 'cache-control':'no-store' })
      res.end(data)
    } catch (error) {
      res.writeHead(500); res.end(String(error))
    }
  })
  server.listen(port, () => console.log(`Payout MVP running at http://localhost:${port}`))
}
