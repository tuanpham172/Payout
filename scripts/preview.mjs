import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { serve } from './server.mjs'
const here = path.dirname(fileURLToPath(import.meta.url))
serve(path.resolve(here, '../dist'), Number(process.env.PORT || 4173))
