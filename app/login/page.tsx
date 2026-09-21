'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BrandMark, useBrand } from '@/components/BrandProvider'

export default function LoginPage() {
  const brand = useBrand()
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Handle implicit-flow tokens that Supabase puts in the URL hash
  // (invite and recovery links land here as #access_token=...&type=invite)
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    const params = new URLSearchParams(hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')
    if (!accessToken || !refreshToken) return

    const supabase = createClient()
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) return
        if (type === 'invite' || type === 'recovery') {
          router.push('/update-password')
        } else {
          router.push('/catalog')
        }
      })
  }, [router])

  async function handleForgot() {
    setError('')
    if (!email) { setError('Enter your email address above, then click "Forgot your password?".'); return }
    const supabase = createClient()
    // Lands on /login with #type=recovery, which the effect above routes to /update-password.
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` })
    setResetSent(true)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push('/catalog')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding (always dark navy) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--brand)] flex-col justify-between p-12 relative overflow-hidden">
        {/* Background wave decoration */}
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <path d="M0 300 Q200 200 400 300 Q600 400 800 300 L800 600 L0 600 Z" fill="white" />
            <path d="M0 400 Q200 300 400 400 Q600 500 800 400 L800 600 L0 600 Z" fill="white" opacity="0.5" />
          </svg>
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <BrandMark size={40} />
            <span className="text-white text-2xl font-bold tracking-tight">{brand.brand_name}</span>
          </div>
          {brand.tagline && (
            <p className="text-white/60 text-sm font-medium tracking-widest uppercase">
              {brand.tagline}
            </p>
          )}
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Your supplies,<br />delivered direct.
          </h2>
          <p className="text-white/75 text-lg leading-relaxed max-w-sm">
            Browse your full catalog, view your contracted pricing, and place orders — all in one place.
          </p>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          {brand.apply_url && (
            <p className="text-white/60 text-sm">
              Not a customer yet?{' '}
              <a href={brand.apply_url} className="text-white/80 underline hover:text-white transition-colors">
                Apply here
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50 dark:bg-slate-900">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <span className="text-[var(--brand)] dark:text-blue-200"><BrandMark size={32} tone="dark" /></span>
          <span className="text-[var(--brand)] dark:text-blue-200 text-xl font-bold">{brand.brand_name}</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--brand)] dark:text-blue-200 mb-1">Welcome back</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Sign in to access your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition text-sm"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs">
            {resetSent ? (
              <span className="text-emerald-600 dark:text-emerald-400">If that email has an account, a reset link is on its way.</span>
            ) : (
              <button type="button" onClick={handleForgot} className="text-slate-500 dark:text-slate-400 hover:text-[var(--brand)] dark:hover:text-blue-300 hover:underline">
                Forgot your password?
              </button>
            )}
          </p>

          {brand.apply_url && (
            <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
              Not a customer yet?{' '}
              <a href={brand.apply_url} className="text-[var(--brand)] dark:text-blue-400 font-medium hover:underline">
                Apply to become a customer
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
