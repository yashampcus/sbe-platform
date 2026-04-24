'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import RichTextEditor from '@/components/common/RichTextEditor'
import { TableSkeleton } from '@/components/admin/TableSkeleton'
import {
  HelpCircle, Plus, Pencil, Trash2, Loader2, X, Info, Lightbulb, Layers, Hash, Type as TypeIcon,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const QUESTION_TYPES = [
  'text', 'textarea', 'number', 'email', 'phone', 'url', 'date',
  'select', 'multi_select', 'radio', 'checkbox', 'scale', 'yes_no',
  'percentage_range', 'file', 'rich_text', 'group',
]

interface Question {
  id: number
  category_id: number
  question_code: string
  question_text: string
  question_type: string
  is_required: boolean
  help_text?: string | null
  placeholder?: string | null
  parent_id?: number | null
  display_order: number
  options?: any
  validation_rules?: any
  category_name?: string
}
interface Category { id: number; name: string; assessment_type_id: number }
interface AssessmentType { id: number; name: string }

type FormState = {
  category_id: number | ''
  parent_id: number | ''
  question_code: string
  question_text: string
  question_type: string
  is_required: boolean
  help_text: string
  placeholder: string
  display_order: number
  options_json: string
  validation_json: string
}

const blank = (catId: number | '' = ''): FormState => ({
  category_id: catId, parent_id: '', question_code: '', question_text: '',
  question_type: 'text', is_required: false, help_text: '', placeholder: '',
  display_order: 0, options_json: '', validation_json: '',
})

function stripHtml(html?: string | null, max = 120) {
  if (!html) return ''
  const txt = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return txt.length > max ? txt.slice(0, max) + '…' : txt
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [types, setTypes] = useState<AssessmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(blank())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterType, setFilterType] = useState('')

  const loadAll = async () => {
    setLoading(true)
    try {
      const [qRes, cRes, tRes] = await Promise.all([
        fetch(`${API}/admin/questions${filterCat ? `?category_id=${filterCat}` : filterType ? `?assessment_type_id=${filterType}` : ''}`, { credentials: 'include' }),
        fetch(`${API}/admin/categories`, { credentials: 'include' }),
        fetch(`${API}/admin/assessment-types`, { credentials: 'include' }),
      ])
      const [qData, cData, tData] = await Promise.all([qRes.json(), cRes.json(), tRes.json()])
      if (qData.success) setQuestions(qData.questions)
      if (cData.success) setCategories(cData.categories)
      if (tData.success) setTypes(tData.assessmentTypes)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [filterCat, filterType])

  const catName = (id: number) => categories.find(c => c.id === id)?.name || '—'

  const openNew = () => {
    setForm(blank(categories[0]?.id || ''))
    setEditingId(null); setError(''); setModalOpen(true)
  }
  const openEdit = (q: Question) => {
    setForm({
      category_id: q.category_id,
      parent_id: q.parent_id || '',
      question_code: q.question_code,
      question_text: q.question_text,
      question_type: q.question_type,
      is_required: q.is_required,
      help_text: q.help_text || '',
      placeholder: q.placeholder || '',
      display_order: q.display_order,
      options_json: q.options ? JSON.stringify(q.options, null, 2) : '',
      validation_json: q.validation_rules ? JSON.stringify(q.validation_rules, null, 2) : '',
    })
    setEditingId(q.id); setError(''); setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setError('') }

  const save = async () => {
    if (!form.category_id) { setError('Please select a category'); return }
    if (!form.question_code.trim()) { setError('Question code is required'); return }
    if (!form.question_text.trim()) { setError('Question text is required'); return }

    let options: any = null
    let validation_rules: any = null
    try {
      if (form.options_json.trim()) options = JSON.parse(form.options_json)
    } catch { setError('Options JSON is invalid'); return }
    try {
      if (form.validation_json.trim()) validation_rules = JSON.parse(form.validation_json)
    } catch { setError('Validation rules JSON is invalid'); return }

    setSaving(true); setError('')
    try {
      const isNew = editingId === null
      const url = isNew ? `${API}/admin/questions` : `${API}/admin/questions/${editingId}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category_id: form.category_id,
          parent_id: form.parent_id || null,
          question_code: form.question_code.trim(),
          question_text: form.question_text,
          question_type: form.question_type,
          is_required: form.is_required,
          help_text: form.help_text,
          placeholder: form.placeholder,
          display_order: form.display_order,
          options,
          validation_rules,
        }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Save failed'); return }
      await loadAll(); closeModal()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const del = async (q: Question) => {
    if (!confirm(`Delete question "${q.question_code}"?`)) return
    const res = await fetch(`${API}/admin/questions/${q.id}`, { method: 'DELETE', credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (!data.success) { alert(data.error || 'Delete failed'); return }
    setQuestions(prev => prev.filter(x => x.id !== q.id))
  }

  const filteredCats = filterType ? categories.filter(c => c.assessment_type_id === Number(filterType)) : categories
  const formCategoryCandidates = categories
  const parentCandidates = useMemo(
    () => questions.filter(q => q.category_id === form.category_id && q.id !== editingId),
    [questions, form.category_id, editingId]
  )
  const total = questions.length

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full">
      <Card className="w-full rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                <HelpCircle className="h-6 w-6 text-primary" />
                Questions
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Total Questions: <span className="font-semibold text-primary">{total}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={filterType || 'all'} onValueChange={v => { const val = v === 'all' ? '' : v; setFilterType(val); setFilterCat('') }}>
                <SelectTrigger className="h-10 w-44"><SelectValue placeholder="All types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {types.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCat || 'all'} onValueChange={v => setFilterCat(v === 'all' ? '' : v)}>
                <SelectTrigger className="h-10 w-48"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {filteredCats.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                onClick={openNew}
                className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md hover:shadow-lg hover:from-[#5c72d8] hover:to-[#6a4391]"
                size="lg"
                disabled={categories.length === 0}
              >
                <Plus className="h-4 w-4" />
                Create New Question
              </Button>
            </div>
          </div>

          <div className="my-5 h-px bg-slate-200" />

          {/* Table */}
          {loading ? (
            <TableSkeleton columns={6} rows={6} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wider text-primary/80">
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Question</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3 text-center">Required</th>
                    <th className="px-5 py-3 text-center">Order</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map(q => (
                    <tr key={q.id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/60">
                      <td className="px-5 py-4 font-semibold text-primary">#{q.id}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          <Layers className="h-3 w-3" />
                          {catName(q.category_id)}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-500">{q.question_code}</td>
                      <td className="px-5 py-4">
                        <div className="max-w-md text-slate-900 line-clamp-2">{stripHtml(q.question_text, 140)}</div>
                        {q.parent_id && (
                          <div className="mt-0.5 text-[10px] text-slate-400">child of #{q.parent_id}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                          <TypeIcon className="h-3 w-3" />
                          {q.question_type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {q.is_required ? (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">Yes</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">No</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-semibold text-slate-600">
                          {q.display_order}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Button size="sm" onClick={() => openEdit(q)} className="h-8 bg-amber-500 hover:bg-amber-600 text-white">
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button size="sm" onClick={() => del(q)} className="h-8 bg-rose-500 hover:bg-rose-600 text-white">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {questions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-slate-400">
                        No questions yet. {categories.length === 0 ? 'Create a category first.' : 'Click "Create New Question" to add one.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={closeModal}>
          <div
            className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId === null ? 'Add Question' : 'Edit Question'}
              </h2>
              <button onClick={closeModal} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category <span className="text-rose-500">*</span></Label>
                  <Select
                    value={form.category_id ? String(form.category_id) : ''}
                    onValueChange={v => setForm(p => ({ ...p, category_id: Number(v) || '', parent_id: '' }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                    <SelectContent>
                      {formCategoryCandidates.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Info className="h-3.5 w-3.5 text-slate-400" />
                    Which section this question belongs to
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Question Type <span className="text-rose-500">*</span></Label>
                  <Select
                    value={form.question_type}
                    onValueChange={v => setForm(p => ({ ...p, question_type: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Question Code <span className="text-rose-500">*</span></Label>
                  <Input
                    placeholder="e.g., company_name"
                    value={form.question_code}
                    onChange={e => setForm(p => ({ ...p, question_code: e.target.value }))}
                    className="font-mono"
                  />
                  <p className="text-xs text-slate-500">Unique within the category; used as the answer key</p>
                </div>

                <div className="space-y-1.5">
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={form.display_order}
                    onChange={e => setForm(p => ({ ...p, display_order: Number(e.target.value) || 0 }))}
                  />
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                    Lower numbers appear first
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Question Text <span className="text-rose-500">*</span></Label>
                <RichTextEditor
                  value={form.question_text}
                  onChange={v => setForm(p => ({ ...p, question_text: v }))}
                  placeholder="What is the question the user will see?"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Help Text</Label>
                  <Input
                    placeholder="Shown under the question"
                    value={form.help_text}
                    onChange={e => setForm(p => ({ ...p, help_text: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Placeholder</Label>
                  <Input
                    placeholder="Placeholder inside the input"
                    value={form.placeholder}
                    onChange={e => setForm(p => ({ ...p, placeholder: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Parent Question (optional)</Label>
                  <Select
                    value={form.parent_id ? String(form.parent_id) : 'none'}
                    onValueChange={v => setForm(p => ({ ...p, parent_id: v === 'none' ? '' : Number(v) }))}
                    disabled={!form.category_id}
                  >
                    <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (top-level)</SelectItem>
                      {parentCandidates.map(q => (
                        <SelectItem key={q.id} value={String(q.id)}>#{q.id} — {q.question_code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Hash className="h-3.5 w-3.5 text-slate-400" />
                    Used for conditional / nested questions
                  </p>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-primary"
                    checked={form.is_required}
                    onChange={e => setForm(p => ({ ...p, is_required: e.target.checked }))}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-slate-900">Required</div>
                    <p className="mt-1 text-xs text-slate-500">
                      User must answer this question before proceeding.
                    </p>
                  </div>
                </label>
              </div>

              <details className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  Advanced: Options &amp; Validation (JSON)
                </summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Options</Label>
                    <textarea
                      className="w-full rounded-md border border-input bg-white p-2 font-mono text-xs"
                      rows={6}
                      placeholder='e.g., {"choices":["Yes","No"]}'
                      value={form.options_json}
                      onChange={e => setForm(p => ({ ...p, options_json: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Validation Rules</Label>
                    <textarea
                      className="w-full rounded-md border border-input bg-white p-2 font-mono text-xs"
                      rows={6}
                      placeholder='e.g., {"min":0,"max":100}'
                      value={form.validation_json}
                      onChange={e => setForm(p => ({ ...p, validation_json: e.target.value }))}
                    />
                  </div>
                </div>
              </details>
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
    </div>
  )
}
