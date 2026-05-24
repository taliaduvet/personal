import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import type { IncomingMessage, ServerResponse } from 'http'
import { exchangeToken, tokenEnvFromProcess } from './api/lib/tokenExchange'
import type { TokenRequestBody } from './api/lib/tokenExchange'
import { runTranscribe } from './api/lib/transcribeCore'

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}') as Record<string, unknown>)
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function veinLocalApiPlugin(): Plugin {
  return {
    name: 'vein-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed' })
          return
        }

        try {
          const body = await readJsonBody(req)

          if (req.url.startsWith('/api/auth/token')) {
            const result = await exchangeToken(body as TokenRequestBody, tokenEnvFromProcess())
            sendJson(res, result.status, result.body)
            return
          }

          if (req.url.startsWith('/api/transcribe')) {
            const driveFileId = body.driveFileId as string | undefined
            const accessToken = body.accessToken as string | undefined
            if (!driveFileId || !accessToken) {
              sendJson(res, 400, { error: 'Missing driveFileId or accessToken' })
              return
            }
            try {
              const result = await runTranscribe(driveFileId, accessToken)
              sendJson(res, 200, result)
            } catch (e) {
              const err = e as Error & { code?: string }
              if (err.code === 'FILE_TOO_LARGE') {
                sendJson(res, 413, {
                  error:
                    'This memo is too large to transcribe (over 25MB). Export a shorter clip from Voice Memos and import again.',
                })
                return
              }
              sendJson(res, 500, { error: err.message || 'Transcription failed' })
            }
            return
          }

          next()
        } catch (e) {
          console.error('local api error', e)
          sendJson(res, 500, { error: 'API error' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)

  return {
    plugins: [
      react(),
      tailwindcss(),
      veinLocalApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: false,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,woff2}'],
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-cache' },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    resolve: { alias: { '@': path.resolve(__dirname, './src') } },
    server: { port: 5173 },
  }
})
