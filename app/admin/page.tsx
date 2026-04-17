'use client'
import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9ff', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '15px', marginBottom: '30px', color: 'white' }}>
          <div>
            <h1 style={{ margin: '0 0 5px', fontSize: '1.8em' }}>Admin Dashboard</h1>
            <p style={{ margin: 0, opacity: 0.8 }}>Welcome, {user?.name || user?.email}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.2)', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: '600' }}>
              🏠 Home
            </Link>
            <button onClick={handleLogout} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
              🚪 Logout
            </button>
          </div>
        </div>

        <div style={{ padding: '40px', background: 'white', borderRadius: '15px', textAlign: 'center', color: '#666' }}>
          <div style={{ fontSize: '3em', marginBottom: '20px' }}>🚧</div>
          <h2 style={{ color: '#333', marginBottom: '15px' }}>Admin Dashboard</h2>
          <p style={{ fontSize: '1.1em' }}>The full admin dashboard is coming soon. The backend API is ready — connect it here to manage users, assessments, categories, and questions.</p>
        </div>
      </div>
    </div>
  )
}
