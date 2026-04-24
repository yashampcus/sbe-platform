import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sql } from '../lib/db'
import { signToken, setTokenCookie, clearTokenCookie, getTokenFromCookie, verifyToken } from '../lib/auth'
import { requireAuth } from '../lib/adminAuth'
import { getAuthCodeUrl, exchangeCodeForToken } from '../lib/microsoft'

const router = Router()

function frontendBaseUrl(): string {
  const raw = process.env.FRONTEND_URL || ''
  return raw.split(',')[0].trim().replace(/\/$/, '')
}

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

router.get('/microsoft', async (_req, res) => {
  try {
    const state = crypto.randomBytes(16).toString('hex')
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 10 * 60 * 1000,
      path: '/',
    })
    const url = await getAuthCodeUrl(state)
    res.redirect(url)
  } catch (err) {
    console.error('Microsoft auth init error:', err)
    res.status(500).json({ error: 'Failed to start Microsoft auth' })
  }
})

router.get('/microsoft/callback', async (req, res) => {
  const frontend = frontendBaseUrl()
  try {
    const { code, state } = req.query
    const storedState = req.cookies?.oauth_state
    if (!code || !state || state !== storedState) {
      return res.redirect(`${frontend}/login?error=invalid_state`)
    }

    const tokenResponse = await exchangeCodeForToken(String(code))
    const claims = (tokenResponse?.idTokenClaims ?? {}) as Record<string, unknown>
    const email = (claims.preferred_username as string) || (claims.email as string) || ''
    const name = (claims.name as string) || email
    const msOid = (claims.oid as string) || ''

    if (!email) {
      return res.redirect(`${frontend}/login?error=no_email`)
    }

    let [user] = await sql`SELECT id, name, email, role FROM users WHERE email = ${email}`
    if (!user) {
      [user] = await sql`
        INSERT INTO users (name, email, password_hash, role, ms_oid)
        VALUES (${name}, ${email}, NULL, 'user', ${msOid || null})
        RETURNING id, name, email, role
      `
    } else if (msOid) {
      await sql`UPDATE users SET ms_oid = ${msOid} WHERE id = ${user.id} AND (ms_oid IS NULL OR ms_oid = '')`
    }

    const token = await signToken({ userId: user.id, email: user.email })
    setTokenCookie(res, token)
    res.append('Set-Cookie', 'oauth_state=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure')
    res.redirect(`${frontend}/?auth=success`)
  } catch (err) {
    console.error('Microsoft OAuth callback error:', err)
    res.redirect(`${frontend}/login?error=auth_failed`)
  }
})

export default router
