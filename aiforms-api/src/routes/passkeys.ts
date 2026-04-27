import { Router } from 'express'
import { SignJWT, jwtVerify } from 'jose'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import { sql } from '../lib/db'
import { signToken, setTokenCookie } from '../lib/auth'
import { requireAuth } from '../lib/adminAuth'

const router = Router()

const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

const primaryFrontend = frontendUrls[0]
const rpID = new URL(primaryFrontend).hostname
const rpName = 'SBEAMP'
const challengeSecret = () => new TextEncoder().encode(process.env.JWT_SECRET!)

let tableReady: Promise<void> | null = null
function ensureTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS user_passkeys (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          credential_id TEXT NOT NULL UNIQUE,
          public_key TEXT NOT NULL,
          counter BIGINT NOT NULL DEFAULT 0,
          transports TEXT,
          device_name TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMPTZ
        )
      `
    })()
  }
  return tableReady
}

interface ChallengePayload {
  challenge: string
  type: 'reg' | 'auth'
  userId?: number
}

async function setChallengeCookie(res: any, payload: ChallengePayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(challengeSecret())
  res.setHeader(
    'Set-Cookie',
    `pk_chal=${token}; HttpOnly; Path=/; Max-Age=300; SameSite=None; Secure`
  )
}

async function readChallengeCookie(req: any, type: 'reg' | 'auth'): Promise<ChallengePayload | null> {
  const raw = req.cookies?.pk_chal
  if (!raw) return null
  try {
    const { payload } = await jwtVerify(raw, challengeSecret())
    if (payload.type !== type) return null
    return payload as unknown as ChallengePayload
  } catch {
    return null
  }
}

function clearChallengeCookie(res: any) {
  res.setHeader(
    'Set-Cookie',
    `pk_chal=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure`
  )
}

// --- Registration: must be authenticated ---

router.post('/register/options', requireAuth, async (_req, res) => {
  await ensureTable()
  const user = res.locals.user as { id: number; email: string; name: string }

  const existing = await sql`
    SELECT credential_id, transports FROM user_passkeys WHERE user_id = ${user.id}
  `

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(String(user.id)),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: 'none',
    excludeCredentials: existing.map((c: any) => ({
      id: c.credential_id,
      transports: c.transports ? c.transports.split(',') : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  })

  await setChallengeCookie(res, { challenge: options.challenge, type: 'reg', userId: user.id })
  res.json({ success: true, options })
})

router.post('/register/verify', requireAuth, async (req, res) => {
  await ensureTable()
  const user = res.locals.user as { id: number }
  const { response, deviceName } = req.body
  const expected = await readChallengeCookie(req, 'reg')
  if (!expected || expected.userId !== user.id) {
    res.status(400).json({ error: 'Challenge expired' })
    return
  }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: expected.challenge,
      expectedOrigin: frontendUrls,
      expectedRPID: rpID,
    })
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Verification failed' })
    return
  }

  if (!verification.verified || !verification.registrationInfo) {
    res.status(400).json({ error: 'Verification failed' })
    return
  }

  const { credential } = verification.registrationInfo
  const transports = response?.response?.transports?.join(',') || null

  await sql`
    INSERT INTO user_passkeys (user_id, credential_id, public_key, counter, transports, device_name)
    VALUES (
      ${user.id},
      ${credential.id},
      ${Buffer.from(credential.publicKey).toString('base64')},
      ${credential.counter},
      ${transports},
      ${deviceName || null}
    )
  `

  clearChallengeCookie(res)
  res.json({ success: true })
})

router.get('/list', requireAuth, async (_req, res) => {
  await ensureTable()
  const user = res.locals.user as { id: number }
  const rows = await sql`
    SELECT id, device_name, created_at, last_used_at
    FROM user_passkeys WHERE user_id = ${user.id}
    ORDER BY created_at DESC
  `
  res.json({ success: true, passkeys: rows })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await ensureTable()
  const user = res.locals.user as { id: number }
  const id = Number(req.params.id)
  await sql`DELETE FROM user_passkeys WHERE id = ${id} AND user_id = ${user.id}`
  res.json({ success: true })
})

// --- Authentication: usernameless / discoverable ---

router.post('/login/options', async (_req, res) => {
  await ensureTable()
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  })
  await setChallengeCookie(res, { challenge: options.challenge, type: 'auth' })
  res.json({ success: true, options })
})

router.post('/login/verify', async (req, res) => {
  await ensureTable()
  const { response } = req.body
  const expected = await readChallengeCookie(req, 'auth')
  if (!expected) {
    res.status(400).json({ error: 'Challenge expired' })
    return
  }

  const credentialId: string = response?.id
  if (!credentialId) {
    res.status(400).json({ error: 'Missing credential id' })
    return
  }

  const [row] = await sql`
    SELECT p.id, p.user_id, p.credential_id, p.public_key, p.counter, p.transports,
           u.id as uid, u.name, u.email, u.role
    FROM user_passkeys p
    JOIN users u ON u.id = p.user_id
    WHERE p.credential_id = ${credentialId}
  `
  if (!row) {
    res.status(401).json({ error: 'Unknown passkey' })
    return
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: expected.challenge,
      expectedOrigin: frontendUrls,
      expectedRPID: rpID,
      credential: {
        id: row.credential_id,
        publicKey: Buffer.from(row.public_key, 'base64'),
        counter: Number(row.counter),
        transports: row.transports ? row.transports.split(',') : undefined,
      },
    })
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Verification failed' })
    return
  }

  if (!verification.verified) {
    res.status(401).json({ error: 'Verification failed' })
    return
  }

  await sql`
    UPDATE user_passkeys
    SET counter = ${verification.authenticationInfo.newCounter}, last_used_at = NOW()
    WHERE id = ${row.id}
  `

  const token = await signToken({ userId: row.uid, email: row.email })
  setTokenCookie(res, token)
  clearChallengeCookie(res)
  res.json({
    success: true,
    user: { id: row.uid, name: row.name, email: row.email, role: row.role },
  })
})

export default router
