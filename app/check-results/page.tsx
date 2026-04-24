'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { assessmentAPI } from '@/lib/api'
import { useBranding } from '@/contexts/BrandingContext'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Search, Home, KeyRound, Mail, AlertCircle, Loader2,
  FileText, BarChart3, ArrowRight, Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import amazonLogo from '@/lib/amazon-logo-amazon-icon-transparent-free-png.webp'
import salesforceLogo from '@/lib/salesforce-2-logo-png-transparent.png'

function formatDate(dateString?: string) {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
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

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {/* Header — matches Assessment page */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-lg">
        <div className="flex h-11 w-full items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm transition-all group-hover:shadow-md group-hover:border-slate-300">
              <Image src={amazonLogo} alt="Amazon" className="h-4 w-auto object-contain" priority />
              <span className="h-4 w-px bg-slate-300" />
              <Image src={salesforceLogo} alt="Salesforce" className="h-4 w-auto object-contain" priority />
            </div>
            <span className="hidden text-sm font-semibold tracking-tight text-slate-900 sm:inline">
              {branding?.appName || 'SBEAMP'}
            </span>
          </Link>
          <Button asChild variant="outline" size="sm" className="h-7 gap-1.5 rounded-full border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900">
            <Link href="/">
              <Home className="h-3.5 w-3.5" />
              Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
        <Card className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="space-y-3 border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/50 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
              <Search className="h-3.5 w-3.5" /> Lookup
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Check Assessment Results
            </h1>
            <p className="text-sm leading-relaxed text-slate-600">
              View your submitted assessment results by ID, or search by email and name.
            </p>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Tabs */}
              <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                {([
                  { value: 'id', label: 'By Assessment ID', icon: KeyRound },
                  { value: 'email', label: 'By Email & Name', icon: Mail },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSearchType(value)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                      searchType === value
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-700',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Fields */}
              {searchType === 'id' ? (
                <div className="space-y-2">
                  <Label htmlFor="aid">Assessment ID <span className="text-rose-500">*</span></Label>
                  <Input
                    id="aid"
                    value={assessmentId}
                    onChange={e => setAssessmentId(e.target.value)}
                    placeholder="e.g., 123"
                    required
                    className="h-11"
                  />
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    You received this ID when you submitted your assessment
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address <span className="text-rose-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name <span className="text-xs font-normal text-slate-400">(optional)</span></Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="h-11"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full gap-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md hover:from-[#5c72d8] hover:to-[#6a4391]"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Searching…</>
                ) : (
                  <><Search className="h-4 w-4" /> Search Results</>
                )}
              </Button>
            </form>

            {results.length > 0 && (
              <div className="mt-10 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Found {results.length} Assessment{results.length > 1 ? 's' : ''}
                  </h2>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {results.length} result{results.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid gap-3">
                  {results.map(assessment => (
                    <div
                      key={assessment.id}
                      className="group flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-primary/30 hover:shadow-sm sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#667eea]/10 to-[#764ba2]/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            Assessment #{assessment.id}
                          </h3>
                          <p className="text-xs text-slate-500">
                            Submitted {formatDate(assessment.submitted_at || assessment.created_at)}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => router.push(`/assessment/results/${assessment.id}`)}
                        className="gap-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-sm hover:from-[#5c72d8] hover:to-[#6a4391]"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        View Details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
