'use client'
import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ClipboardList, Users, Layers, HelpCircle, TrendingUp, Clock } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Stats {
  totals: { users: number; assessments: number; assessmentTypes: number; categories: number; questions: number }
  assessments: { today: number; last7Days: number; last30Days: number }
  recent: Array<{ id: number; email: string; name: string; assessment_type_name: string; created_at: string }>
}

export default function AdminPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}/admin/stats`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = stats ? [
    { label: 'Total Assessments', value: stats.totals.assessments, icon: ClipboardList, sub: `${stats.assessments.today} today` },
    { label: 'Users',             value: stats.totals.users,       icon: Users,         sub: 'registered' },
    { label: 'Assessment Types',  value: stats.totals.assessmentTypes, icon: Layers,    sub: `${stats.totals.categories} categories` },
    { label: 'Questions',         value: stats.totals.questions,   icon: HelpCircle,    sub: 'total' },
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Welcome back, <span className="font-medium text-slate-700">{user?.name || user?.email}</span>
          {user?.role === 'admin-viewer' && <Badge variant="secondary" className="ml-2">Viewer</Badge>}
        </p>
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-8 bg-slate-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ label, value, icon: Icon, sub }) => (
            <Card key={label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-500 font-medium">{label}</span>
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-slate-900">{value}</div>
                <div className="text-xs text-slate-400 mt-1">{sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Activity row */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Submission activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Today',      value: stats.assessments.today },
                { label: 'Last 7 days', value: stats.assessments.last7Days },
                { label: 'Last 30 days', value: stats.assessments.last30Days },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Recent submissions
              </CardTitle>
              <CardDescription>Latest 10 assessments</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recent.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No submissions yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.recent.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{a.name || a.email || 'Anonymous'}</div>
                        <div className="text-xs text-slate-400 truncate">{a.assessment_type_name}</div>
                      </div>
                      <div className="text-xs text-slate-400 shrink-0 ml-4">
                        {new Date(a.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
