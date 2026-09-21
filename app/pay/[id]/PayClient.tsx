'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createInvoiceCheckout } from './actions'

type InvoiceItem = {
  id: string
  item_type: string
  description: string
  quantity: number
  rate: number
  total: number
  sort_order: number
}

type Invoice = {
  id: string
  invoice_number: string
  status: string
  invoice_date: string
  due_date: string | null
  customer_name: string
  customer_email: string
  from_name: string
  from_email: string
  subtotal: number
  tax_rate: number
  total: number
  paid_at: string | null
  payment_method: string | null
  invoice_items: InvoiceItem[]
}

function money(n: number) {
  return '$' + Number(n).toFixed(2)
}

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function isOverdue(due: string | null, status: string) {
  if (!due || status === 'Paid') return false
  return new Date(due + 'T00:00:00') < new Date()
}

export default function PayClient({
  invoice,
  invoiceId,
  userEmail,
}: {
  invoice: Invoice | null
  invoiceId: string
  userEmail: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ── Invalid / not found ──────────────────────────────────────────────────
  if (!invoice) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 max-w-md w-full text-center">
          <BrandHeader />
          <div className="w-14 h-14 bg-red-100 dark:bg-red-950/40 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Invoice not found</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This payment link is invalid or has expired. Please contact Twin Harbors Medical Supply.
          </p>
        </div>
      </div>
    )
  }

  // ── Already paid ─────────────────────────────────────────────────────────
  if (invoice.status === 'Paid') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 max-w-md w-full text-center">
          <BrandHeader />
          <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1">Invoice Paid</h1>
          <p className="text-2xl font-bold text-[var(--brand)] dark:text-blue-200 mb-1">{invoice.invoice_number}</p>
          {invoice.paid_at && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
              Paid on {fmtDate(invoice.paid_at.slice(0, 10))}
              {invoice.payment_method && ` via ${invoice.payment_method}`}
            </p>
          )}
          <p className="text-sm text-slate-500 dark:text-slate-400">
            This invoice has already been paid. Thank you!
          </p>
        </div>
      </div>
    )
  }

  const items = [...(invoice.invoice_items ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  const tax = Math.max(0, invoice.total - invoice.subtotal)
  const overdue = isOverdue(invoice.due_date, invoice.status)

  async function handlePay() {
    setLoading(true)
    setError('')
    try {
      const result = await createInvoiceCheckout(invoiceId)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      window.location.href = result.checkoutUrl!
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Payment setup failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Soft login banner — only if not logged in */}
      {!userEmail && (
        <div className="bg-[var(--brand)] text-white text-sm px-4 py-2.5 flex items-center justify-center gap-4 flex-wrap">
          <span className="text-blue-200">
            Have a HarborDirect account? Sign in to track orders &amp; payment history.
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-white font-semibold underline underline-offset-2 hover:text-blue-200 transition-colors"
            >
              Sign in
            </Link>
            <span className="text-blue-400">·</span>
            <Link
              href="/login"
              className="text-blue-200 hover:text-white transition-colors font-medium"
            >
              Apply for account
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <BrandHeader />

        {/* Invoice header card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mt-6">
          <div className="bg-[var(--brand)] px-6 py-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">Invoice</p>
              <p className="text-white text-2xl font-bold">{invoice.invoice_number}</p>
              <p className="text-blue-200 text-sm mt-1">
                From {invoice.from_name || 'Twin Harbors Medical Supply'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">Amount Due</p>
              <p className="text-white text-3xl font-bold">{money(invoice.total)}</p>
              {invoice.due_date && (
                <p className={`text-xs mt-1 font-semibold ${overdue ? 'text-red-300' : 'text-blue-200'}`}>
                  {overdue ? '⚠ Overdue · ' : ''}Due {fmtDate(invoice.due_date)}
                </p>
              )}
            </div>
          </div>

          {/* Billed to */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Billed to</p>
            <p className="font-semibold text-slate-800 dark:text-slate-200">{invoice.customer_name || 'Customer'}</p>
            {invoice.customer_email && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{invoice.customer_email}</p>
            )}
          </div>

          {/* Line items */}
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {items.map(item => (
              <div key={item.id} className="px-6 py-3.5 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">{item.description || '—'}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 capitalize">
                    {item.item_type} · {item.quantity} × {money(item.rate)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap pt-0.5">
                  {money(item.total)}
                </p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span>{money(invoice.subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>Tax {invoice.tax_rate ? `(${invoice.tax_rate}%)` : ''}</span>
                <span>{money(tax)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base text-[var(--brand)] dark:text-blue-200 pt-1.5 border-t border-slate-200 dark:border-slate-600">
              <span>Total Due</span>
              <span>{money(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Pay button */}
        <div className="mt-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-5">
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs mb-4">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>You will be securely redirected to Stripe to complete payment. No account required.</span>
          </div>
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full py-4 bg-[var(--brand)] hover:bg-[var(--brand-hover)] disabled:opacity-50 text-white font-bold text-base rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Redirecting to payment…
              </>
            ) : (
              <>Pay {money(invoice.total)} — Secure Checkout</>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          Questions about this invoice? Contact Twin Harbors Medical Supply.
        </p>
      </div>
    </div>
  )
}

function BrandHeader() {
  return (
    <div className="flex items-center justify-center gap-2.5 py-2">
      <svg width="28" height="18" viewBox="0 0 60 36" fill="none">
        <path d="M4 18 Q15 8 30 18 Q45 28 56 18" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5"/>
        <path d="M4 26 Q15 16 30 26 Q45 36 56 26" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      </svg>
      <span className="font-bold text-[var(--brand)] dark:text-blue-200 text-base">Twin Harbors Medical Supply</span>
    </div>
  )
}
