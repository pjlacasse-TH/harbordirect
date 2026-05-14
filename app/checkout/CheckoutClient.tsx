'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { placeOrder, type CartItem } from './actions'

function money(n: number) {
  return '$' + n.toFixed(2)
}

export default function CheckoutClient({ email }: { email: string }) {
  const router = useRouter()
  const [items, setItems] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState<{ orderNumber: string } | null>(null)

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
      const result = await placeOrder(items, notes)
      sessionStorage.removeItem('hd_cart')
      setConfirmed({ orderNumber: result.orderNumber })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to place order')
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#0d2240] mb-2">Order Placed!</h1>
          <p className="text-gray-500 mb-1">Order number</p>
          <p className="text-3xl font-bold text-[#0d2240] mb-6">{confirmed.orderNumber}</p>
          <p className="text-sm text-gray-500 mb-8">
            Your order has been received and will be reviewed shortly. You&apos;ll be contacted when it&apos;s ready.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/orders')}
              className="w-full py-3 bg-[#0d2240] text-white font-semibold rounded-lg hover:bg-[#1a3a6a] transition-colors"
            >
              View My Orders
            </button>
            <button
              onClick={() => router.push('/catalog')}
              className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Catalog
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 max-w-md w-full text-center">
          <p className="text-gray-500 mb-6">Your cart is empty.</p>
          <button
            onClick={() => router.push('/catalog')}
            className="py-3 px-6 bg-[#0d2240] text-white font-semibold rounded-lg hover:bg-[#1a3a6a] transition-colors"
          >
            Back to Catalog
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      {/* Header */}
      <header className="bg-[#0d2240] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">HarborDirect</h1>
          <p className="text-xs text-blue-200">{email}</p>
        </div>
        <button
          onClick={() => router.push('/catalog')}
          className="text-sm text-blue-200 hover:text-white transition-colors"
        >
          ← Back to Catalog
        </button>
      </header>

      <div className="max-w-3xl mx-auto p-6 flex flex-col gap-6">
        <h2 className="text-2xl font-bold text-[#0d2240]">Review Your Order</h2>

        {/* Order items */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Item</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Mode</th>
                <th className="text-center px-3 py-3 font-semibold text-gray-600">Qty</th>
                <th className="text-right px-3 py-3 font-semibold text-gray-600">Unit</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-800">{item.item_name}</p>
                    <p className="text-xs text-gray-400">{item.sku}</p>
                  </td>
                  <td className="px-3 py-4 text-center">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                      {item.mode}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-center text-gray-700">{item.qty}</td>
                  <td className="px-3 py-4 text-right text-gray-700">{money(item.unit_price)}</td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-800">{money(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-200 bg-gray-50">
              <tr>
                <td colSpan={4} className="px-5 py-4 text-right font-bold text-gray-700">Subtotal</td>
                <td className="px-5 py-4 text-right font-bold text-lg text-[#0d2240]">{money(subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Order Notes <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Delivery instructions, special requests..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-[#0d2240]/20 focus:border-[#0d2240]"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 bg-[#0d2240] hover:bg-[#1a3a6a] disabled:opacity-50 text-white font-bold text-base rounded-xl transition-colors"
        >
          {submitting ? 'Placing Order...' : `Place Order — ${money(subtotal)}`}
        </button>
      </div>
    </div>
  )
}
