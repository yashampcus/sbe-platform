'use client'
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Loader2, Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface AppSettings {
  appName: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string
  logoWidth: string
  logoHeight: string
}

const defaults: AppSettings = {
  appName: 'Business Assessment',
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  logoUrl: '',
  logoWidth: '',
  logoHeight: '',
}

export default function SettingsPage() {
  const [form, setForm] = useState<AppSettings>(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API}/admin/app-settings`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.success) setForm({ ...defaults, ...data.settings })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      const res = await fetch(`${API}/admin/app-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error || 'Save failed'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { setError('Network error') } finally { setSaving(false) }
  }

  const FieldSkeleton = () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" /> Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Configure your platform branding and appearance</p>
      </div>

      {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branding</CardTitle>
            <CardDescription>Customise the name and colours shown to users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <FieldSkeleton />
                <div className="grid grid-cols-2 gap-4"><FieldSkeleton /><FieldSkeleton /></div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="appName">App name</Label>
                  <Input id="appName" value={form.appName} onChange={set('appName')} placeholder="Business Assessment" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary colour</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.primaryColor} onChange={set('primaryColor')} className="h-10 w-10 rounded-md border border-input cursor-pointer p-1" />
                      <Input id="primaryColor" value={form.primaryColor} onChange={set('primaryColor')} placeholder="#667eea" className="font-mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary colour</Label>
                    <div className="flex gap-2 items-center">
                      <input type="color" value={form.secondaryColor} onChange={set('secondaryColor')} className="h-10 w-10 rounded-md border border-input cursor-pointer p-1" />
                      <Input id="secondaryColor" value={form.secondaryColor} onChange={set('secondaryColor')} placeholder="#764ba2" className="font-mono" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logo</CardTitle>
            <CardDescription>Optional logo URL and dimensions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <FieldSkeleton />
                <div className="grid grid-cols-2 gap-4"><FieldSkeleton /><FieldSkeleton /></div>
              </>
            ) : (<>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" value={form.logoUrl} onChange={set('logoUrl')} placeholder="https://example.com/logo.png" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="logoWidth">Width (px)</Label>
                <Input id="logoWidth" type="number" value={form.logoWidth} onChange={set('logoWidth')} placeholder="56" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoHeight">Height (px)</Label>
                <Input id="logoHeight" type="number" value={form.logoHeight} onChange={set('logoHeight')} placeholder="56" />
              </div>
            </div>
            </>)}
            {form.logoUrl && (
              <div className="mt-2">
                <p className="text-xs text-slate-400 mb-2">Preview</p>
                <img src={form.logoUrl} alt="Logo preview" style={{ width: form.logoWidth ? `${form.logoWidth}px` : '56px', height: form.logoHeight ? `${form.logoHeight}px` : '56px', objectFit: 'contain' }} className="rounded border border-slate-200" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save settings'}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
  )
}
