'use client'
import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { TableSkeleton } from '@/components/admin/TableSkeleton'
import {
  Users, Plus, Pencil, Trash2, Loader2, X, Shield, Eye, User as UserIcon, Info,
} from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const ROLES = [
  { value: 'user', label: 'User', icon: UserIcon, tone: 'bg-slate-100 text-slate-700' },
  { value: 'admin-viewer', label: 'Viewer', icon: Eye, tone: 'bg-sky-50 text-sky-700' },
  { value: 'admin', label: 'Admin', icon: Shield, tone: 'bg-violet-50 text-violet-700' },
]

interface User { id: number; name: string; email: string; role: string; created_at: string }

type FormState = { name: string; email: string; role: string; password: string }
const blank = (): FormState => ({ name: '', email: '', role: 'user', password: '' })

function getInitials(name?: string, email?: string): string {
  if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  if (email) return email[0].toUpperCase()
  return 'U'
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(blank())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/admin/users`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) setUsers(data.users)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setForm(blank()); setEditingId(null); setError(''); setModalOpen(true) }
  const openEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, role: u.role, password: '' })
    setEditingId(u.id); setError(''); setModalOpen(true)
  }
  const closeModal = () => { setModalOpen(false); setError('') }

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.email.trim()) { setError('Email is required'); return }
    if (editingId === null && !form.password.trim()) { setError('Password is required for new users'); return }

    setSaving(true); setError('')
    try {
      const isNew = editingId === null
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
      }
      if (form.password.trim()) payload.password = form.password
      const url = isNew ? `${API}/admin/users` : `${API}/admin/users/${editingId}`
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Save failed'); return }
      await load(); closeModal()
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const del = async (u: User) => {
    if (u.id === me?.id) return
    if (!confirm(`Delete user "${u.name || u.email}"?`)) return
    const res = await fetch(`${API}/admin/users/${u.id}`, { method: 'DELETE', credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (!data.success) { alert(data.error || 'Delete failed'); return }
    setUsers(prev => prev.filter(x => x.id !== u.id))
  }

  const roleInfo = (role: string) => ROLES.find(r => r.value === role) || ROLES[0]

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full">
      <Card className="w-full rounded-2xl border-slate-200 shadow-sm">
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                <Users className="h-6 w-6 text-primary" />
                Users
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Total Users: <span className="font-semibold text-primary">{users.length}</span>
              </p>
            </div>
            <Button
              onClick={openNew}
              className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-md hover:shadow-lg hover:from-[#5c72d8] hover:to-[#6a4391]"
              size="lg"
            >
              <Plus className="h-4 w-4" />
              Create New User
            </Button>
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
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3 text-center">Role</th>
                    <th className="px-5 py-3 text-center">Joined</th>
                    <th className="px-5 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const role = roleInfo(u.role)
                    const RoleIcon = role.icon
                    const isMe = u.id === me?.id
                    return (
                      <tr key={u.id} className="border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/60">
                        <td className="px-5 py-4 font-semibold text-primary">#{u.id}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-xs text-white">
                                {getInitials(u.name, u.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {u.name || <span className="text-slate-400">— No name —</span>}
                              </div>
                              {isMe && <div className="text-[10px] font-medium uppercase tracking-wider text-emerald-600">You</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{u.email}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${role.tone}`}>
                            <RoleIcon className="h-3 w-3" />
                            {role.label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center text-xs text-slate-500">
                          {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <Button size="sm" onClick={() => openEdit(u)} className="h-8 bg-amber-500 hover:bg-amber-600 text-white">
                              <Pencil className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => del(u)}
                              disabled={isMe}
                              className="h-8 bg-rose-500 hover:bg-rose-600 text-white disabled:bg-slate-200 disabled:text-slate-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400">
                        No users yet. Click "Create New User" to add one.
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
            className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId === null ? 'Add User' : 'Edit User'}
              </h2>
              <button onClick={closeModal} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full Name <span className="text-rose-500">*</span></Label>
                  <Input
                    placeholder="e.g., Jane Doe"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email <span className="text-rose-500">*</span></Label>
                  <Input
                    type="email"
                    placeholder="jane@company.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>
                  Password {editingId === null && <span className="text-rose-500">*</span>}
                </Label>
                <Input
                  type="password"
                  placeholder={editingId === null ? 'Set an initial password' : 'Leave blank to keep current password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
                {editingId !== null && (
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Info className="h-3.5 w-3.5 text-slate-400" />
                    Leave blank to keep the existing password
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Role <span className="text-rose-500">*</span></Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {ROLES.map(r => {
                    const Icon = r.icon
                    const selected = form.role === r.value
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, role: r.value }))}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                          selected
                            ? 'border-primary bg-primary/5 text-slate-900 shadow-sm ring-1 ring-primary/30'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`h-4 w-4 ${selected ? 'text-primary' : 'text-slate-400'}`} />
                        <span className="font-medium">{r.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  Admin has full access; Viewer can read admin pages but not edit.
                </p>
              </div>
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
