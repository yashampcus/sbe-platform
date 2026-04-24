'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClipboardList, Search, Eye, Trash2, Loader2 } from 'lucide-react'
import { TableSkeleton } from '@/components/admin/TableSkeleton'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Assessment {
  id: number
  email: string | null
  name: string | null
  assessment_type_name: string
  created_at: string
}

export default function AssessmentsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [total, setTotal] = useState(0)

  const load = async (query = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (query) params.set('q', query)
      const res = await fetch(`${API}/admin/assessments?${params}`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setAssessments(data.assessments)
        setTotal(data.pagination?.total ?? data.assessments.length)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this assessment? This cannot be undone.')) return
    await fetch(`${API}/admin/assessments/${id}`, { method: 'DELETE', credentials: 'include' })
    setAssessments(prev => prev.filter(a => a.id !== id))
    setTotal(prev => prev - 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Assessments
          </h1>
          <p className="text-slate-500 text-sm mt-1">{total} total submissions</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or email…"
                className="pl-9"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && load(q)}
              />
            </div>
            <Button onClick={() => load(q)} variant="outline" size="sm">Search</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4"><TableSkeleton columns={6} rows={6} /></div>
          ) : assessments.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No assessments found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left">
                  <th className="px-4 py-3 font-medium text-slate-600">ID</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Name / Email</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(a => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">#{a.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{a.name || '—'}</div>
                      <div className="text-slate-400 text-xs">{a.email || '—'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">{a.assessment_type_name || '—'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(a.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="ghost">
                          <Link href={`/assessment/results/${a.id}`} target="_blank">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
