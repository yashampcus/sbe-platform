'use client'
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface BrandingConfig {
  appName: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  logoWidth: number | null
  logoHeight: number | null
}

interface BrandingContextType {
  config: BrandingConfig
  loading: boolean
  refresh: () => Promise<void>
}

const defaults: BrandingConfig = {
  appName: 'SBEAMP',
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  logoUrl: null,
  logoWidth: null,
  logoHeight: null,
}

const BrandingContext = createContext<BrandingContextType>({
  config: defaults,
  loading: false,
  refresh: async () => {},
})

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<BrandingConfig>(defaults)
  const [loading, setLoading] = useState(true)

  const load = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch(`${API}/config`, { credentials: 'include' })
      const data = await res.json()
      if (data?.success && data?.config) {
        setConfig(prev => ({ ...prev, ...data.config }))
      }
    } catch {
      // keep defaults
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.title = config.appName || 'SBEAMP'
    const root = document.documentElement
    if (config.primaryColor) root.style.setProperty('--brand-primary', config.primaryColor)
    if (config.secondaryColor) root.style.setProperty('--brand-secondary', config.secondaryColor)
  }, [config.appName, config.primaryColor, config.secondaryColor])

  const value = useMemo(() => ({
    config,
    loading,
    refresh: () => load(true),
  }), [config, loading])

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
}

export function useBranding() {
  return useContext(BrandingContext)
}
