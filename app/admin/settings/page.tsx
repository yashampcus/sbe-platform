'use client'
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, Loader2, Check, Fingerprint, Trash2 } from 'lucide-react'
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

        <PasskeysCard />

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

interface Passkey {
  id: number
  device_name: string | null
  created_at: string
  last_used_at: string | null
}

function PasskeysCard() {
  const [items, setItems] = useState<Passkey[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [deviceName, setDeviceName] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/passkey/list`, { credentials: 'include' })
      const data = await res.json()
      if (data.success) setItems(data.passkeys)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const enroll = async () => {
    setError('')
    setBusy(true)
    try {
      const { startRegistration } = await import('@simplewebauthn/browser')
      const optsRes = await fetch(`${API}/auth/passkey/register/options`, {
        method: 'POST',
        credentials: 'include',
      })
      const optsData = await optsRes.json()
      if (!optsData.success) { setError(optsData.error || 'Failed'); return }

      const attestation = await startRegistration({ optionsJSON: optsData.options })

      const verifyRes = await fetch(`${API}/auth/passkey/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ response: attestation, deviceName: deviceName || null }),
      })
      const data = await verifyRes.json()
      if (!data.success) { setError(data.error || 'Failed'); return }
      setDeviceName('')
      await load()
    } catch (err: any) {
      setError(err?.message || 'Cancelled')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Remove this passkey?')) return
    await fetch(`${API}/auth/passkey/${id}`, { method: 'DELETE', credentials: 'include' })
    await load()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Fingerprint className="h-4 w-4" /> Passkeys
        </CardTitle>
        <CardDescription>Sign in with your device fingerprint, Face ID, or Windows Hello</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <div className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</div>}

        <div className="flex gap-2">
          <Input
            placeholder="Device name (e.g. Work laptop)"
            value={deviceName}
            onChange={e => setDeviceName(e.target.value)}
            disabled={busy}
          />
          <Button type="button" onClick={enroll} disabled={busy} className="gap-2 shrink-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
            Add passkey
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-slate-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-slate-500">No passkeys enrolled yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
            {items.map(p => (
              <li key={p.id} className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium text-slate-900">{p.device_name || 'Unnamed device'}</div>
                  <div className="text-xs text-slate-500">
                    Added {new Date(p.created_at).toLocaleDateString()}
                    {p.last_used_at && <> · Last used {new Date(p.last_used_at).toLocaleDateString()}</>}
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(p.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
