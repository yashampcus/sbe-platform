'use client'
import { BrandingProvider } from '@/contexts/BrandingContext'
import { AuthProvider } from '@/contexts/AuthContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BrandingProvider>
      <AuthProvider>{children}</AuthProvider>
    </BrandingProvider>
  )
}
