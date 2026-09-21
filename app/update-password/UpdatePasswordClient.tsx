'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BrandMark, useBrand } from '@/components/BrandProvider'

export default function UpdatePasswordClient({ email }: { email: string }) {
  const brand = useBrand()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    router.push('/catalog')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left branding panel (always dark navy) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--brand)] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <path d="M0 300 Q200 200 400 300 Q600 400 800 300 L800 600 L0 600 Z" fill="white" />
            <path d="M0 400 Q200 300 400 400 Q600 500 800 400 L800 600 L0 600 Z" fill="white" opacity="0.5" />
          </svg>
        </div>
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
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Almost there.
          </h2>
          <p className="text-white/75 text-lg leading-relaxed max-w-sm">
            Set a password for your account and you&apos;ll be able to log in any time from the sign-in page.
          </p>
        </div>
        <div className="relative z-10">
          <p className="text-white/60 text-sm">
            Questions? Contact {brand.support_email || brand.tagline || brand.brand_name}.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-slate-50 dark:bg-slate-900">
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <span className="text-[var(--brand)] dark:text-blue-200"><BrandMark size={32} tone="dark" /></span>
          <span className="text-[var(--brand)] dark:text-blue-200 text-xl font-bold">{brand.brand_name}</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--brand)] dark:text-blue-200 mb-1">Set your password</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Setting up access for <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                New password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition text-sm"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition text-sm"
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-semibold rounded-lg transition-colors disabled:opacity-60 text-sm"
            >
              {saving ? 'Saving…' : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
