import type { VercelRequest, VercelResponse } from '@vercel/node'
import { exchangeToken, tokenEnvFromProcess } from '../lib/tokenExchange'
import type { TokenRequestBody } from '../lib/tokenExchange'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const result = await exchangeToken(req.body as TokenRequestBody, tokenEnvFromProcess())
    return res.status(result.status).json(result.body)
  } catch (e) {
    console.error('auth/token error', e)
    return res.status(500).json({ error: 'Authentication service error' })
  }
}
