import type { Request, Response, NextFunction } from 'express'
import { verifyToken } from './auth'
import { sql } from './db'

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.token
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const payload = await verifyToken(token).catch(() => null)
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const [user] = await sql`SELECT id, name, email, role FROM users WHERE id = ${payload.userId}`
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  res.locals.user = user
  next()
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.token
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const payload = await verifyToken(token).catch(() => null)
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const [user] = await sql`SELECT id, name, email, role FROM users WHERE id = ${payload.userId}`
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (user.role !== 'admin' && user.role !== 'admin-viewer') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  res.locals.user = user
  next()
}
