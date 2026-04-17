'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { assessmentAPI } from '@/lib/api'
import { useBranding } from '@/contexts/BrandingContext'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function formatDate(dateString?: string) {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return dateString }
}

export default function CheckResultsPage() {
  const router = useRouter()
  const { config: branding } = useBranding()
  const [searchType, setSearchType] = useState<'id' | 'email'>('id')
  const [assessmentId, setAssessmentId] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<any[]>([])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResults([])
    try {
      if (searchType === 'id') {
        if (!assessmentId.trim()) { setError('Please enter an Assessment ID'); setLoading(false); return }
        const res = await assessmentAPI.getById(assessmentId.trim(), 'detailed')
        if (res.success && res.assessment) setResults([res.assessment])
        else setError('Assessment not found. Please check the ID and try again.')
      } else {
        if (!email.trim()) { setError('Please enter an email address'); setLoading(false); return }
        const res = await assessmentAPI.search({ email: email.trim(), name: name.trim() || undefined })
        if (res.success && res.assessments?.length > 0) setResults(res.assessments)
        else setError('No assessments found with the provided information.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while searching. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '14px', fontSize: '1em', borderRadius: '10px', border: '2px solid #e0e0e0', transition: 'all 0.3s ease', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
          <div>
            <h1 style={{ fontSize: '2.5em', margin: '0 0 10px 0', color: '#333', background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              🔍 Check Assessment Results
            </h1>
            <p style={{ color: '#666', margin: '0' }}>View your submitted assessment results</p>
          </div>
          <Link href="/" style={{ padding: '12px 24px', fontSize: '1em', fontWeight: '600', color: 'var(--brand-primary)', background: 'white', border: '2px solid var(--brand-primary)', borderRadius: '10px', textDecoration: 'none' }}>
            🏠 Home
          </Link>
        </div>

        <form onSubmit={handleSearch} style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', padding: '15px', background: '#f8f9ff', borderRadius: '10px' }}>
            {(['id', 'email'] as const).map(type => (
              <label key={type} style={{ flex: 1, padding: '12px', background: searchType === type ? 'var(--brand-primary)' : 'white', color: searchType === type ? 'white' : 'var(--brand-primary)', borderRadius: '8px', textAlign: 'center', cursor: 'pointer', fontWeight: '600', border: '2px solid var(--brand-primary)' }}>
                <input type="radio" name="searchType" value={type} checked={searchType === type} onChange={() => setSearchType(type)} style={{ display: 'none' }} />
                {type === 'id' ? '🔑 By Assessment ID' : '📧 By Email & Name'}
              </label>
            ))}
          </div>

          {searchType === 'id' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#333' }}>Assessment ID *</label>
              <input type="text" value={assessmentId} onChange={e => setAssessmentId(e.target.value)} placeholder="Enter your Assessment ID (e.g., 123)" required style={inputStyle} />
              <small style={{ display: 'block', marginTop: '8px', color: '#666', fontSize: '0.9em' }}>💡 You received this ID when you submitted your assessment</small>
            </div>
          )}

          {searchType === 'email' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#333' }}>Email Address *</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address" required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600', color: '#333' }}>Full Name (Optional)</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name (optional)" style={inputStyle} />
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '15px', background: '#fee', border: '1px solid #fcc', borderRadius: '10px', color: '#c33', marginBottom: '20px' }}>⚠️ {error}</div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', fontSize: '1.1em', fontWeight: '600', color: 'white', background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '🔍 Searching...' : '🔍 Search Results'}
          </button>
        </form>

        {results.length > 0 && (
          <div>
            <h2 style={{ fontSize: '1.8em', marginBottom: '20px', color: '#333' }}>
              Found {results.length} Assessment{results.length > 1 ? 's' : ''}
            </h2>
            {results.map(assessment => (
              <div key={assessment.id} style={{ padding: '25px', background: '#f8f9ff', borderRadius: '15px', border: '2px solid #e0e7ff', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '1.3em' }}>Assessment #{assessment.id}</h3>
                    <p style={{ margin: '0', color: '#666', fontSize: '0.9em' }}>Submitted: {formatDate(assessment.submitted_at || assessment.created_at)}</p>
                  </div>
                  <button
                    onClick={() => router.push(`/assessment/results/${assessment.id}`)}
                    style={{ padding: '12px 24px', fontSize: '1em', fontWeight: '600', color: 'white', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '10px', cursor: 'pointer' }}
                  >
                    📊 View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
