'use client'
import React, { useMemo, useState } from 'react'

function initialsFromName(name?: string) {
  const n = (name || '').trim()
  if (!n) return 'APP'
  const parts = n.split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || 'A'
  const second = parts[1]?.[0] || parts[0]?.[1] || 'P'
  return `${first}${second}`.toUpperCase()
}

interface BrandLogoProps {
  logoUrl?: string | null
  appName?: string
  showName?: boolean
  size?: number
  width?: number
  height?: number
  rounded?: number
  padding?: number
  background?: string
  foreground?: string
  nameColor?: string
  nameFontSize?: number
  nameFontWeight?: number
  nameStyle?: React.CSSProperties
  style?: React.CSSProperties
}

export default function BrandLogo({
  logoUrl,
  appName,
  showName = false,
  size = 56,
  width,
  height,
  rounded = 12,
  background = 'rgba(255,255,255,0.14)',
  foreground = '#ffffff',
  nameColor = '#0b5cab',
  nameFontSize = 14,
  nameFontWeight = 800,
  nameStyle,
  style,
}: BrandLogoProps) {
  const [failed, setFailed] = useState(false)
  const initials = useMemo(() => initialsFromName(appName), [appName])
  const w = 800
  const h = 150

  const resolvedLogoUrl = useMemo(() => {
    if (!logoUrl) return null
    if (typeof logoUrl !== 'string') return logoUrl
    if (logoUrl.startsWith('/') && !logoUrl.startsWith('//')) {
      const base = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')
      return `${base}${logoUrl}`
    }
    return logoUrl.split('/').pop()!
  }, [logoUrl])

  const containerStyle: React.CSSProperties =
    showName && appName
      ? { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }
      : {}

  const nameEl = showName && appName ? (
    <div style={{ color: nameColor, fontSize: nameFontSize, fontWeight: nameFontWeight, lineHeight: 1.1, textAlign: 'center', ...nameStyle }}>
      {appName}
    </div>
  ) : null

  if (!resolvedLogoUrl || failed) {
    const fallback = (
      <div
        aria-label={appName || 'App'}
        title={appName || 'App'}
        style={{
          width: `${w}px`, height: `${h}px`, borderRadius: rounded, background,
          display: 'grid', placeItems: 'center', fontWeight: 800,
          letterSpacing: '0.5px', color: foreground, userSelect: 'none', ...style,
        }}
      >
        {initials}
      </div>
    )
    if (!showName || !appName) return fallback
    return <div style={containerStyle}>{nameEl}{fallback}</div>
  }

  const img = (
    <img
      src={resolvedLogoUrl}
      alt={appName || 'Logo'}
      onError={() => setFailed(true)}
      style={{ width: `${w}px`, height: `${h}px`, objectFit: 'contain', borderRadius: rounded, background, ...style }}
    />
  )

  if (!showName || !appName) return img
  return <div style={containerStyle}>{nameEl}{img}</div>
}
