/**
 * Dev/preview config: loads Firebase keys from repo app.env (or WRIT_ENV_PATH), maps them to import.meta.env,
 * and proxies /api to the Express server so the browser stays same-origin with /api/notes.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')

const candidateEnvFiles = [
  process.env.WRIT_ENV_PATH,
  path.join(repoRoot, 'app.env'),
  '/etc/app.env',
].filter((value): value is string => Boolean(value))

const selectedEnvPath = candidateEnvFiles.find((filePath) => fs.existsSync(filePath))

function loadAppEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {}
  const content = fs.readFileSync(filePath, 'utf8')
  const out: Record<string, string> = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    if (!key) continue
    let val = trimmed.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const appEnv = selectedEnvPath ? loadAppEnv(selectedEnvPath) : {}

/** Injects VITE_FIREBASE_* at build/dev time from process.env or parsed app.env (same keys as server uses without VITE_ prefix). */
function firebaseEnvDefine(): Record<string, string> {
  const map: [viteKey: string, appKey: string][] = [
    ['VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY'],
    ['VITE_FIREBASE_AUTH_DOMAIN', 'FIREBASE_AUTH_DOMAIN'],
    ['VITE_FIREBASE_PROJECT_ID', 'FIREBASE_PROJECT_ID'],
    ['VITE_FIREBASE_STORAGE_BUCKET', 'FIREBASE_STORAGE_BUCKET'],
    ['VITE_FIREBASE_MESSAGING_SENDER_ID', 'FIREBASE_MESSAGING_SENDER_ID'],
    ['VITE_FIREBASE_APP_ID', 'FIREBASE_APP_ID'],
    ['VITE_FIREBASE_MEASUREMENT_ID', 'FIREBASE_MEASUREMENT_ID'],
  ]
  const define: Record<string, string> = {}
  for (const [viteKey, appKey] of map) {
    const value =
      process.env[viteKey] ?? process.env[appKey] ?? appEnv[appKey] ?? ''
    define[`import.meta.env.${viteKey}`] = JSON.stringify(value)
  }
  return define
}

/** Forward API calls to Express; leaves /notes/* for the SPA router. */
const apiProxy = {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
} as const

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  define: firebaseEnvDefine(),
  server: {
    port: 5175,
    allowedHosts: true,
    proxy: { ...apiProxy },
  },
  preview: {
    port: 5175,
    allowedHosts: true,
    proxy: { ...apiProxy },
  },
})
