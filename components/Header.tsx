'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShoppingCartIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import ThemeToggle from './ThemeToggle'
import { BrandMark, useBrand } from './BrandProvider'

interface HeaderProps {
  email?: string
  cartCount?: number
  onCartClick?: () => void
}

export default function Header({ email, cartCount = 0, onCartClick }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const brand = useBrand()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navLink = (href: string, label: string, icon: React.ReactNode) => {
    const active = pathname === href
    return (
      <button
        onClick={() => router.push(href)}
        className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition-colors ${
          active
            ? 'bg-white/20 text-white font-semibold'
            : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </button>
    )
  }

  return (
    <header className="bg-[var(--brand)] text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark size={28} />
            <div className="min-w-0">
              <span className="font-bold text-base sm:text-lg tracking-tight">{brand.brand_name}</span>
              {brand.tagline && (
                <span className="hidden sm:block text-white/60 text-xs tracking-widest uppercase -mt-0.5">
                  {brand.tagline}
                </span>
              )}
            </div>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1 mx-2">
            {navLink('/catalog', 'Catalog', (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            ))}
            {navLink('/orders', 'Orders', (
              <ClipboardDocumentListIcon className="w-4 h-4 flex-shrink-0" />
            ))}
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {email && (
              <span className="hidden lg:block text-white/70 text-sm truncate max-w-[180px]">
                {email}
              </span>
            )}

            {/* Cart */}
            {onCartClick && (
              <button
                onClick={onCartClick}
                className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Cart"
              >
                <ShoppingCartIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-400 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
            )}

            <ThemeToggle />

            <button
              onClick={handleSignOut}
              className="text-xs sm:text-sm text-white/70 hover:text-white transition-colors px-2 sm:px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
