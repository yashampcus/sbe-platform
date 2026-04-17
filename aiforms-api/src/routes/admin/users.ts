import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { sql } from '../../lib/db'

const router = Router()

const ALLOWED_ROLES = ['user', 'admin', 'admin-viewer']

function blockViewer(res: import('express').Response): boolean {
  if (res.locals.user?.role === 'admin-viewer') {
    res.status(403).json({ error: 'Forbidden' })
    return true
  }
  return false
}

router.get('/', async (_req, res) => {
  try {
    const users = await sql`
      SELECT id, name, email, role, created_at, updated_at
      FROM users
      ORDER BY id ASC
    `
    res.json({ success: true, users })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const [user] = await sql`
      SELECT id, name, email, role, created_at, updated_at
      FROM users WHERE id = ${req.params.id}
    `
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({ success: true, user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const { name, email, password, role = 'user' } = req.body ?? {}
    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email, and password are required' })
      return
    }
    if (!ALLOWED_ROLES.includes(role)) {
      res.status(400).json({ error: 'Invalid role' })
      return
    }

    const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`
    if (existing) {
      res.status(409).json({ error: 'Email already in use' })
      return
    }

    const password_hash = await bcrypt.hash(password, 10)
    const [user] = await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${name}, ${email}, ${password_hash}, ${role})
      RETURNING id, name, email, role, created_at, updated_at
    `
    res.status(201).json({ success: true, user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.patch('/:id', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const id = Number(req.params.id)
    const [existing] = await sql`SELECT id FROM users WHERE id = ${id}`
    if (!existing) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const { name, email, role, password } = req.body ?? {}

    if (role !== undefined && !ALLOWED_ROLES.includes(role)) {
      res.status(400).json({ error: 'Invalid role' })
      return
    }

    if (email !== undefined) {
      const [dup] = await sql`SELECT id FROM users WHERE email = ${email} AND id <> ${id}`
      if (dup) {
        res.status(409).json({ error: 'Email already in use' })
        return
      }
    }

    let password_hash: string | undefined
    if (password) password_hash = await bcrypt.hash(password, 10)

    const [user] = await sql`
      UPDATE users SET
        name = COALESCE(${name ?? null}, name),
        email = COALESCE(${email ?? null}, email),
        role = COALESCE(${role ?? null}, role),
        password_hash = COALESCE(${password_hash ?? null}, password_hash),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, email, role, created_at, updated_at
    `
    res.json({ success: true, user })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id', async (req, res) => {
  if (blockViewer(res)) return
  try {
    const id = Number(req.params.id)
    if (res.locals.user?.id === id) {
      res.status(400).json({ error: 'Cannot delete your own account' })
      return
    }
    const result = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`
    if (result.length === 0) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
