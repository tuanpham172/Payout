import { cp, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const src = new URL('../src/', import.meta.url)
const pub = new URL('../public/', import.meta.url)
const dist = new URL('../dist/', import.meta.url)

await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(src, dist, { recursive: true })
if (existsSync(pub)) await cp(pub, dist, { recursive: true })
console.log('Built static MVP to dist/')
