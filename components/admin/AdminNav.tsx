'use client'
import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import amazonLogo from '@/lib/amazon-logo-amazon-icon-transparent-free-png.webp'
import salesforceLogo from '@/lib/salesforce-2-logo-png-transparent.png'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  Navbar, NavBody, NavItems, MobileNav, MobileNavHeader,
  MobileNavMenu, MobileNavToggle, NavbarLogo, NavbarButton,
} from '@/components/ui/resizable-navbar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LogOut, ExternalLink, ChevronDown, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { name: 'Dashboard',   link: '/admin' },
  { name: 'Assessments', link: '/admin/assessments' },
  { name: 'Types',       link: '/admin/types' },
  { name: 'Categories',  link: '/admin/categories' },
  { name: 'Questions',   link: '/admin/questions' },
  { name: 'Users',       link: '/admin/users' },
  { name: 'Settings',    link: '/admin/settings' },
]

function getInitials(name?: string, email?: string): string {
  if (name) return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  if (email) return email[0].toUpperCase()
  return 'A'
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/admin' && pathname.startsWith(href))
}

export default function AdminNav() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const items = NAV_ITEMS.map(i => ({ ...i, active: isActive(pathname, i.link) }))

  const Logo = (
    <Link href="/admin" className="group flex items-center gap-2">
      <div className="flex items-center gap-1.5 rounded-full border border-neutral-200/70 bg-white/70 px-2 py-1 shadow-sm backdrop-blur-sm transition-all group-hover:shadow-md group-hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900/70">
        <Image
          src={amazonLogo}
          alt="Amazon"
          className="h-4 w-auto object-contain"
          priority
        />
        <span className="h-4 w-px bg-neutral-300 dark:bg-neutral-700" />
        <Image
          src={salesforceLogo}
          alt="Salesforce"
          className="h-4 w-auto object-contain"
          priority
        />
      </div>
      <span className="hidden sm:inline text-[13px] font-semibold tracking-tight text-neutral-900 dark:text-white">
        SBEAMP
      </span>
    </Link>
  )

  const UserMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-full pl-0.5 pr-2 py-0.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors outline-none">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[10px] bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white">
              {getInitials(user?.name, user?.email)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200 hidden xl:inline max-w-[100px] truncate">
            {user?.name || user?.email}
          </span>
          <ChevronDown className="h-3 w-3 text-neutral-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-0.5">
            <span className="text-sm font-semibold">{user?.name || 'Admin'}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/settings">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            View site
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <Navbar>
      <NavBody>
        <NavbarLogo>{Logo}</NavbarLogo>
        <NavItems
          items={items}
          onItemClick={() => setMobileOpen(false)}
        />
        <div className="flex items-center gap-2 shrink-0">
          <NavbarButton href="/" variant="secondary" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            View site
          </NavbarButton>
          {UserMenu}
        </div>
      </NavBody>

      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo>{Logo}</NavbarLogo>
          <div className="flex items-center gap-2">
            {UserMenu}
            <MobileNavToggle isOpen={mobileOpen} onClick={() => setMobileOpen(v => !v)} />
          </div>
        </MobileNavHeader>
        <MobileNavMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
          {items.map(item => (
            <Link
              key={item.link}
              href={item.link}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'w-full px-3 py-2 rounded-md text-sm font-medium transition-colors',
                item.active
                  ? 'bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white'
                  : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900',
              )}
            >
              {item.name}
            </Link>
          ))}
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  )
}
