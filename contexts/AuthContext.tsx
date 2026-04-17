'use client'
import React, { createContext, useState, useContext, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (data.success) setUser(data.user) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.user.role !== 'admin' && data.user.role !== 'admin-viewer') {
          return { success: false, error: 'Access denied. Admin login only.' }
        }
        setUser(data.user)
        return { success: true, user: data.user }
      }
      return { success: false, error: data.error || 'Login failed' }
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' }
    }
  }

  const logout = async () => {
    await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
