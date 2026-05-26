'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { placeOrder, type CartItem } from './actions'
import Header from '@/components/Header'

function money(n: number) {
  return '$' + n.toFixed(2)
}

export default function CheckoutClient({ email }: { email: string }) {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('hd_cart')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)

  async function handleSubmit() {
    if (items.length === 0) return
    setSubmitting(true)
    setError('')
    try {
      const { checkoutUrl } = await placeOrder(items, notes)
      sessionStorage.removeItem('hd_cart')
      // Redirect to Stripe hosted checkout
      window.location.href = checkoutUrl
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to start checkout')
      setSubmitting(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
        <Header email={email} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 max-w-md w-full text-center">
            <p className="text-slate-500 dark:text-slate-400 mb-6">Your cart is empty.</p>
            <button
              onClick={() => router.push('/catalog')}
              className="py-3 px-6 bg-[#0d2240] text-white font-semibold rounded-lg hover:bg-[#1a3a6a] transition-colors"
            >
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header email={email} />

      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 flex-1">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0d2240] dark:text-blue-200">Review Your Order</h2>

        {/* Order items */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Mobile list */}
          <ul className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
            {items.map((item, i) => (
              <li key={i} className="flex items-start justify-between px-4 py-3.5 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-200 text-sm leading-snug">{item.item_name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.sku}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">
                    {item.mode} · {item.qty} × {money(item.unit_price)}
                  </p>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap pt-0.5">{money(item.line_total)}</p>
              </li>
            ))}
            <li className="flex justify-between px-4 py-3.5 bg-slate-50 dark:bg-slate-700/50 border-t-2 border-slate-200 dark:border-slate-600">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Subtotal</span>
              <span className="font-bold text-[#0d2240] dark:text-blue-200">{money(subtotal)}</span>
            </li>
          </ul>

          {/* Desktop table */}
          <table className="w-full text-sm hidden sm:table">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Item</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">Mode</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">Qty</th>
                <th className="text-right px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">Unit</th>
                <th className="text-right px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{item.item_name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{item.sku}</p>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full capitalize">{item.mode}</span>
                  </td>
                  <td className="px-3 py-4 text-center text-slate-700 dark:text-slate-300">{item.qty}</td>
                  <td className="px-3 py-4 text-right text-slate-700 dark:text-slate-300">{money(item.unit_price)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-800 dark:text-slate-200">{money(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
              <tr>
                <td colSpan={4} className="px-5 py-4 text-right font-bold text-slate-700 dark:text-slate-300">Subtotal</td>
                <td className="px-5 py-4 text-right font-bold text-lg text-[#0d2240] dark:text-blue-200">{money(subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Notes */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Order Notes <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Delivery instructions, special requests..."
            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#0d2240]/20 focus:border-[#0d2240] placeholder-slate-400 dark:placeholder-slate-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Stripe CTA */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-600 dark:text-slate-400 text-sm">You will be redirected to Stripe to complete payment securely.</span>
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs font-medium">Secure</span>
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 bg-[#0d2240] hover:bg-[#1a3a6a] disabled:opacity-50 text-white font-bold text-base rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Redirecting to payment…
              </>
            ) : (
              <>Pay {money(subtotal)} — Proceed to Checkout</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
