import { Router } from 'express'
import { sql } from '../../lib/db'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const rows = await sql`SELECT key, value FROM app_settings ORDER BY key ASC`
    const settings: Record<string, string> = Object.fromEntries(
      rows.map((r: Record<string, any>) => [r.key as string, r.value as string])
    )
    res.json({ success: true, settings })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/', async (req, res) => {
  try {
    const body = req.body
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'Body must be an object of { key: value } pairs' })
      return
    }

    const entries = Object.entries(body as Record<string, unknown>)
    if (entries.length === 0) {
      res.status(400).json({ error: 'No settings provided' })
      return
    }

    if (res.locals.user?.role === 'admin-viewer') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }

    for (const [key, value] of entries) {
      const strValue = value === null || value === undefined ? '' : String(value)
      await sql`
        INSERT INTO app_settings (key, value)
        VALUES (${key}, ${strValue})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `
    }

    const rows = await sql`SELECT key, value FROM app_settings ORDER BY key ASC`
    const settings: Record<string, string> = Object.fromEntries(
      rows.map((r: Record<string, any>) => [r.key as string, r.value as string])
    )
    res.json({ success: true, settings })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
