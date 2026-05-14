'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function UpdatePasswordClient({ email }: { email: string }) {
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
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d2240] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <path d="M0 300 Q200 200 400 300 Q600 400 800 300 L800 600 L0 600 Z" fill="white" />
            <path d="M0 400 Q200 300 400 400 Q600 500 800 400 L800 600 L0 600 Z" fill="white" opacity="0.5" />
          </svg>
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <svg width="40" height="24" viewBox="0 0 60 36" fill="none">
              <path d="M4 18 Q15 8 30 18 Q45 28 56 18" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.6"/>
              <path d="M4 26 Q15 16 30 26 Q45 36 56 26" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none"/>
            </svg>
            <span className="text-white text-2xl font-bold tracking-tight">HarborDirect</span>
          </div>
          <p className="text-blue-300 text-sm font-medium tracking-widest uppercase">
            Twin Harbors Medical Supply
          </p>
        </div>
        <div className="relative z-10">
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Almost there.
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed max-w-sm">
            Set a password for your account and you&apos;ll be able to log in any time from the sign-in page.
          </p>
        </div>
        <div className="relative z-10">
          <p className="text-blue-400 text-sm">
            Questions? Contact Twin Harbors Medical Supply.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <svg width="32" height="20" viewBox="0 0 60 36" fill="none">
            <path d="M4 18 Q15 8 30 18 Q45 28 56 18" stroke="#0d2240" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5"/>
            <path d="M4 26 Q15 16 30 26 Q45 36 56 26" stroke="#0d2240" strokeWidth="4" strokeLinecap="round" fill="none"/>
          </svg>
          <span className="text-[#0d2240] text-xl font-bold">HarborDirect</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#0d2240] mb-1">Set your password</h1>
            <p className="text-slate-500 text-sm">
              Setting up access for <span className="font-medium text-slate-700">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                New password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a4a8a] focus:border-transparent transition text-sm"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirm password
              </label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a4a8a] focus:border-transparent transition text-sm"
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-[#0d2240] hover:bg-[#1a3a6a] text-white font-semibold rounded-lg transition-colors disabled:opacity-60 text-sm"
            >
              {saving ? 'Saving…' : 'Set Password & Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
