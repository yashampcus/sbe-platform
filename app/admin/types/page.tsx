'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import RichTextEditor, { SafeDescriptionHtml } from '@/components/common/RichTextEditor'
import {
  ClipboardList, Plus, Pencil, Trash2, Loader2, X, Eye, CheckCircle2, Ban, Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TableSkeleton } from '@/components/admin/TableSkeleton'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface AssessmentType {
  id: number
  name: string
  slug: string
  description: string | null
  icon: string | null
  is_active: boolean
  display_order: number
  settings?: { singleQuestionMode?: boolean } | null
  category_count?: string | number
  question_count?: string | number
  assessment_count?: string | number
}

type FormState = {
  name: string
  slug: string
  description: string
  icon: string
  display_order: number
  is_active: boolean
  singleQuestionMode: boolean
}

const blank = (): FormState => ({
  name: '', slug: '', description: '', icon: '',
  display_order: 0, is_active: true, singleQuestionMode: false,
})

function slugify(s: string) {
  return s.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function stripHtml(html?: string | null, max = 120) {
  if (!html) return ''
  const txt = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return txt.length > max ? txt.slice(0, max) + '…' : txt
}

export default function TypesPage() {
  const [types, setTypes] = useState<AssessmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(blank())
  const [slugEdited, setSlugEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState<AssessmentType | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/admin/assessment-types`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) setTypes(data.assessmentTypes)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm(blank()); setEditingId(null); setSlugEdited(false); setError(''); setModalOpen(true)
  }
  const openEdit = (t: AssessmentType) => {
    setForm({
      name: t.name, slug: t.slug, description: t.description || '',
      icon: t.icon || '', display_order: t.display_order,
      is_active: t.is_active,
      singleQuestionMode: Boolean(t.settings?.singleQuestionMode),
    })
    setEditingId(t.id); setSlugEdited(true); setError(''); setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setError('') }

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) { setError('Name and slug are required'); return }
    setSaving(true); setError('')
    try {
      const isNew = editingId === null
      const url = isNew ? `${API}/admin/assessment-types` : `${API}/admin/assessment-types/${editingId}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description,
          icon: form.icon,
          display_order: form.display_order,
          is_active: form.is_active,
          settings: { singleQuestionMode: form.singleQuestionMode },
        }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Save failed'); return }
      await load(); closeModal()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const del = async (t: AssessmentType) => {
    if (!confirm(`Delete "${t.name}" and all its categories/questions?`)) return
    const res = await fetch(`${API}/admin/assessment-types/${t.id}`, { method: 'DELETE', credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (!data.success) { alert(data.error || 'Delete failed'); return }
    setTypes(prev => prev.filter(x => x.id !== t.id))
  }

  const toggleActive = async (t: AssessmentType) => {
    const res = await fetch(`${API}/admin/assessment-types/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ is_active: !t.is_active }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.success) setTypes(prev => prev.map(x => x.id === t.id ? { ...x, is_active: !t.is_active } : x))
  }

  const total = types.length
  const totalCount = useMemo(() => total, [total])

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full">
      <Card className="w-full rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                <ClipboardList className="h-6 w-6 text-primary" />
                Assessment Types
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Total Assessment Types: <span className="font-semibold text-primary">{totalCount}</span>
              </p>
            </div>
            <Button
              onClick={openNew}
              className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md hover:shadow-lg hover:from-[#5c72d8] hover:to-[#6a4391]"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              Create New Assessment Type
            </Button>
          </div>

          <div className="my-5 h-px bg-slate-200" />

          {/* Table */}
          {loading ? (
            <TableSkeleton columns={8} rows={6} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-primary/80">
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Icon</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3 text-center">Categories</th>
                    <th className="px-5 py-3 text-center">Questions</th>
                    <th className="px-5 py-3 text-center">Assessments</th>
                    <th className="px-5 py-3 text-center">Status</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map(t => (
                    <tr key={t.id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-4 font-semibold text-primary">#{t.id}</td>
                      <td className="px-5 py-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-base">
                          {t.icon || <Layers className="h-4 w-4 text-primary/70" />}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{t.name}</div>
                        {t.description && (
                          <div className="mt-0.5 text-xs text-slate-500 line-clamp-2 max-w-md">
                            {stripHtml(t.description)}
                          </div>
                        )}
                        <div className="mt-1 font-mono text-[10px] text-slate-400">{t.slug}</div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                          {t.category_count ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                          {t.question_count ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full bg-primary/10 px-2 text-xs font-semibold text-primary">
                          {t.assessment_count ?? 0}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-center gap-1">
                          {t.is_active ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              <span className="text-xs font-medium text-emerald-700">Active</span>
                            </>
                          ) : (
                            <>
                              <Ban className="h-5 w-5 text-slate-400" />
                              <span className="text-xs font-medium text-slate-500">Inactive</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Button size="sm" onClick={() => setViewing(t)} className="h-8 bg-indigo-500 hover:bg-indigo-600 text-white">
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          <Button size="sm" onClick={() => openEdit(t)} className="h-8 bg-amber-500 hover:bg-amber-600 text-white">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button size="sm" onClick={() => del(t)} className="h-8 bg-rose-500 hover:bg-rose-600 text-white">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                          <Button size="sm" onClick={() => toggleActive(t)} className={cn(
                            'h-8 text-white',
                            t.is_active ? 'bg-slate-700 hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-700',
                          )}>
                            <Ban className="h-3.5 w-3.5" />
                            {t.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {types.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        No assessment types yet. Click "Create New Assessment Type" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId === null ? 'Add Assessment Type' : 'Edit Assessment Type'}
              </h2>
              <button onClick={closeModal} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

              <div className="space-y-1.5">
                <Label>Assessment Type Name <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="e.g., Employee Tech Review"
                  value={form.name}
                  onChange={e => {
                    const name = e.target.value
                    setForm(p => ({ ...p, name, slug: slugEdited ? p.slug : slugify(name) }))
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Slug <span className="text-rose-500">*</span></Label>
                <Input
                  placeholder="e.g., employee-tech-review"
                  value={form.slug}
                  onChange={e => { setForm(p => ({ ...p, slug: e.target.value })); setSlugEdited(true) }}
                />
                <p className="text-xs text-slate-500">URL-friendly identifier (lowercase, hyphens only)</p>
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <RichTextEditor
                  value={form.description}
                  onChange={v => setForm(p => ({ ...p, description: v }))}
                  placeholder="Describe this assessment type…"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Icon (Emoji or Code)</Label>
                  <Input
                    placeholder="e.g., tech-review"
                    value={form.icon}
                    onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={form.display_order}
                    onChange={e => setForm(p => ({ ...p, display_order: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Active <span className="text-xs font-normal text-slate-500">Enabled</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    This assessment type is currently active and visible to users.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 hover:bg-slate-50">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-primary"
                  checked={form.singleQuestionMode}
                  onChange={e => setForm(p => ({ ...p, singleQuestionMode: e.target.checked }))}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Layers className="h-4 w-4 text-primary" />
                    Single Question Mode
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Show one question at a time with "Save and Next". At the end, show a preview page before final submission.
                  </p>
                </div>
              </label>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <Button variant="ghost" onClick={closeModal} disabled={saving}>Cancel</Button>
              <Button
                onClick={save}
                disabled={saving}
                className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white hover:from-[#5c72d8] hover:to-[#6a4391]"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId === null ? 'Create' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setViewing(null)}>
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                <Eye className="h-5 w-5 text-indigo-500" />
                {viewing.name}
              </h2>
              <button onClick={() => setViewing(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{viewing.category_count ?? 0}</div>
                  <div className="text-xs text-slate-500">Categories</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{viewing.question_count ?? 0}</div>
                  <div className="text-xs text-slate-500">Questions</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <div className="text-2xl font-bold text-primary">{viewing.assessment_count ?? 0}</div>
                  <div className="text-xs text-slate-500">Assessments</div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Slug</div>
                <div className="font-mono text-sm text-slate-700">{viewing.slug}</div>
              </div>
              {viewing.description && (
                <div className="space-y-1">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</div>
                  <SafeDescriptionHtml html={viewing.description} className="text-sm text-slate-700" />
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Link href={`/admin/categories?type=${viewing.id}`}>
                  <Button size="sm" variant="outline"><Layers className="h-3.5 w-3.5" /> Manage Categories</Button>
                </Link>
                <Button size="sm" onClick={() => { const t = viewing; setViewing(null); openEdit(t) }}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
