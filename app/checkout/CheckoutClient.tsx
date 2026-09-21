'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { placeOrder, type CartItem, type ShipToInput } from './actions'
import Header from '@/components/Header'
import type { PaymentMode } from '@/lib/portal'

export type SavedAddress = {
  id: string
  label: string | null
  attn: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  is_default: boolean | null
}

function money(n: number) {
  return '$' + n.toFixed(2)
}

const inputCls = 'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)] placeholder-slate-400 dark:placeholder-slate-500'
const cardCls = 'bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5'
const labelCls = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2'

function oneLine(a: SavedAddress) {
  return [a.address, a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

interface Props {
  email: string
  customerName: string
  paymentMode: PaymentMode
  requirePo: boolean
  addresses: SavedAddress[]
}

export default function CheckoutClient({ email, customerName, paymentMode, requirePo, addresses }: Props) {
  const router = useRouter()
  const isTerms = paymentMode === 'terms'
  const [items, setItems] = useState<CartItem[]>([])
  const [notes, setNotes] = useState('')
  const [po, setPo] = useState('')
  const [shipChoice, setShipChoice] = useState<string>(addresses[0]?.id ?? 'default')
  const [newAddr, setNewAddr] = useState({ name: customerName, address: '', city: '', state: '', zip: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('hd_cart')
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)

  function shipTo(): ShipToInput {
    if (shipChoice === 'new') return { kind: 'new', ...newAddr }
    if (shipChoice === 'default') return { kind: 'default' }
    return { kind: 'saved', address_id: shipChoice }
  }

  async function handleSubmit() {
    if (items.length === 0) return
    if (isTerms && requirePo && !po.trim()) { setError('Please enter your PO number.'); return }
    setSubmitting(true)
    setError('')
    try {
      const result = await placeOrder({
        items: items.map(i => ({ id: i.id, mode: i.mode, qty: i.qty })),
        notes,
        po_number: po,
        ship_to: isTerms ? shipTo() : undefined,
      })
      if (result.error) {
        setError(result.error)
        setSubmitting(false)
        return
      }
      sessionStorage.removeItem('hd_cart')
      sessionStorage.removeItem('hd_cart_state')
      if (result.checkoutUrl) window.location.href = result.checkoutUrl
      else router.push(`/checkout/success?order=${encodeURIComponent(result.orderNumber ?? '')}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to place order')
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
            <button onClick={() => router.push('/catalog')}
              className="py-3 px-6 bg-[var(--brand)] text-white font-semibold rounded-lg hover:bg-[var(--brand-hover)] transition-colors">
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
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand)] dark:text-blue-200">Review Your Order</h2>
          <button onClick={() => router.push('/catalog')} className="text-sm text-[var(--brand)] dark:text-blue-400 hover:underline">← Edit cart</button>
        </div>

        {/* Order items */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <ul className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
            {items.map((item, i) => (
              <li key={i} className="flex items-start justify-between px-4 py-3.5 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 dark:text-slate-200 text-sm leading-snug">{item.item_name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.sku}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {item.qty} {item.uom ?? item.mode} × {money(item.unit_price)}
                  </p>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap pt-0.5">{money(item.line_total)}</p>
              </li>
            ))}
            <li className="flex justify-between px-4 py-3.5 bg-slate-50 dark:bg-slate-700/50 border-t-2 border-slate-200 dark:border-slate-600">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">Subtotal</span>
              <span className="font-bold text-[var(--brand)] dark:text-blue-200">{money(subtotal)}</span>
            </li>
          </ul>

          <table className="w-full text-sm hidden sm:table">
            <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">Item</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">UOM</th>
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
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full">{item.uom ?? item.mode}</span>
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
                <td className="px-5 py-4 text-right font-bold text-lg text-[var(--brand)] dark:text-blue-200">{money(subtotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {isTerms && (
          <>
            {/* PO number */}
            <div className={cardCls}>
              <label className={labelCls}>
                PO Number {!requirePo && <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>}
              </label>
              <input value={po} onChange={e => setPo(e.target.value)} maxLength={60} placeholder="Your purchase order number" className={inputCls} />
            </div>

            {/* Ship to */}
            <div className={cardCls}>
              <p className={labelCls}>Ship To</p>
              <div className="flex flex-col gap-2">
                {addresses.map(a => (
                  <label key={a.id} className="flex items-start gap-3 text-sm cursor-pointer">
                    <input type="radio" name="shipto" className="mt-1 accent-[var(--brand)]" checked={shipChoice === a.id} onChange={() => setShipChoice(a.id)} />
                    <span className="text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{a.label || a.attn || customerName}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{oneLine(a)}</span>
                    </span>
                  </label>
                ))}
                <label className="flex items-start gap-3 text-sm cursor-pointer">
                  <input type="radio" name="shipto" className="mt-1 accent-[var(--brand)]" checked={shipChoice === 'default'} onChange={() => setShipChoice('default')} />
                  <span className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">My usual ship-to address</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">The address we have on file for {customerName}</span>
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm cursor-pointer">
                  <input type="radio" name="shipto" className="mt-1 accent-[var(--brand)]" checked={shipChoice === 'new'} onChange={() => setShipChoice('new')} />
                  <span className="font-medium text-slate-700 dark:text-slate-300">Ship to a different address</span>
                </label>
                {shipChoice === 'new' && (
                  <div className="grid grid-cols-6 gap-2 mt-1 sm:pl-7">
                    <input className={`${inputCls} col-span-6`} placeholder="Attention / name" value={newAddr.name} onChange={e => setNewAddr({ ...newAddr, name: e.target.value })} />
                    <input className={`${inputCls} col-span-6`} placeholder="Street address" value={newAddr.address} onChange={e => setNewAddr({ ...newAddr, address: e.target.value })} />
                    <input className={`${inputCls} col-span-6 sm:col-span-3`} placeholder="City" value={newAddr.city} onChange={e => setNewAddr({ ...newAddr, city: e.target.value })} />
                    <input className={`${inputCls} col-span-2 sm:col-span-1`} placeholder="State" value={newAddr.state} onChange={e => setNewAddr({ ...newAddr, state: e.target.value })} />
                    <input className={`${inputCls} col-span-4 sm:col-span-2`} placeholder="ZIP" value={newAddr.zip} onChange={e => setNewAddr({ ...newAddr, zip: e.target.value })} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        <div className={cardCls}>
          <label className={labelCls}>
            Order Notes <span className="text-slate-400 dark:text-slate-500 font-normal">(optional)</span>
          </label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} maxLength={2000}
            placeholder="Delivery instructions, special requests..." className={`${inputCls} resize-none`} />
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className={cardCls}>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            {isTerms
              ? 'Your order will be billed to your account on your usual terms. Final pricing, freight and tax appear on your invoice.'
              : 'You will be redirected to Stripe to complete payment securely.'}
          </p>
          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-4 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-white font-bold text-base rounded-xl transition-colors flex items-center justify-center gap-3">
            {submitting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {isTerms ? 'Submitting order…' : 'Redirecting to payment…'}
              </>
            ) : isTerms ? (
              <>Submit Order — {money(subtotal)}</>
            ) : (
              <>Pay {money(subtotal)} — Proceed to Checkout</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
