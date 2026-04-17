import { SignJWT, jwtVerify } from 'jose'
import type { Request, Response } from 'express'

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET!)

export interface TokenPayload {
  userId: number
  email: string
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(await secret())
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, await secret())
  return { userId: payload.userId as number, email: payload.email as string }
}

export function setTokenCookie(res: Response, token: string): void {
  res.setHeader(
    'Set-Cookie',
    `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=None; Secure`
  )
}

export function clearTokenCookie(res: Response): void {
  res.setHeader(
    'Set-Cookie',
    `token=; HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure`
  )
}

export function getTokenFromCookie(req: Request): string | null {
  return req.cookies?.token ?? null
}
