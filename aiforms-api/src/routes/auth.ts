import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { sql } from '../lib/db'
import { signToken, setTokenCookie, clearTokenCookie, getTokenFromCookie, verifyToken } from '../lib/auth'
import { requireAuth } from '../lib/adminAuth'

const router = Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' })
      return
    }

    const [user] = await sql`SELECT id, name, email, password_hash, role FROM users WHERE email = ${email}`
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' })
      return
    }

    const token = await signToken({ userId: user.id, email: user.email })
    setTokenCookie(res, token)
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password required' })
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
      RETURNING id, name, email, role
    `

    const token = await signToken({ userId: user.id, email: user.email })
    setTokenCookie(res, token)
    res.status(201).json({ success: true, user })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json({ success: true, user: res.locals.user })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/logout', async (req, res) => {
  clearTokenCookie(res)
  res.json({ success: true })
})

router.post('/logout', async (req, res) => {
  clearTokenCookie(res)
  res.json({ success: true })
})

export default router
