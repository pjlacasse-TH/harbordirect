'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'

interface HeaderProps {
  email?: string
  cartCount?: number
  onCartClick?: () => void
}

export default function Header({ email, cartCount = 0, onCartClick }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-[#0d2240] text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <svg width="32" height="20" viewBox="0 0 60 36" fill="none">
              <path d="M4 18 Q15 8 30 18 Q45 28 56 18" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5"/>
              <path d="M4 26 Q15 16 30 26 Q45 36 56 26" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none"/>
            </svg>
            <div>
              <span className="font-bold text-lg tracking-tight">HarborDirect</span>
              <span className="hidden sm:block text-blue-300 text-xs tracking-widest uppercase -mt-0.5">
                Twin Harbors Medical Supply
              </span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {email && (
              <span className="hidden md:block text-blue-200 text-sm truncate max-w-xs">
                {email}
              </span>
            )}

            {/* Cart */}
            <button
              onClick={onCartClick}
              className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Cart"
            >
              <ShoppingCartIcon className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-400 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            <button
              onClick={handleSignOut}
              className="text-sm text-blue-200 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
