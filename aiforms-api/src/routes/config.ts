import { Router } from 'express'
import { sql } from '../lib/db'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const rows = await sql`SELECT key, value FROM app_settings`
    const map: Record<string, string> = Object.fromEntries(
      rows.map((r: Record<string, any>) => [r.key as string, r.value as string])
    )

    res.json({
      success: true,
      config: {
        appName: map.appName ?? 'Business Assessment',
        primaryColor: map.primaryColor ?? '#667eea',
        secondaryColor: map.secondaryColor ?? '#764ba2',
        logoUrl: map.logoUrl || null,
        logoWidth: map.logoWidth ? parseInt(map.logoWidth) : null,
        logoHeight: map.logoHeight ? parseInt(map.logoHeight) : null,
      },
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
