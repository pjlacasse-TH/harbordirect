'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { cancelOrder } from '../actions'

function CancelContent() {
  const router = useRouter()
  const params = useSearchParams()
  const orderId = params.get('order_id')

  async function handleRetry() {
    router.push('/checkout')
  }

  async function handleCancel() {
    if (orderId) await cancelOrder(orderId)
    router.push('/catalog')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#0d2240] dark:text-blue-200 mb-2">Payment Cancelled</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Your payment was not completed. Your cart items are still saved — you can go back and try again.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            className="w-full py-3 bg-[#0d2240] text-white font-semibold rounded-lg hover:bg-[#1a3a6a] transition-colors text-sm"
          >
            Return to Checkout
          </button>
          <button
            onClick={handleCancel}
            className="w-full py-2.5 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm"
          >
            Cancel &amp; Return to Catalog
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CancelPage() {
  return (
    <Suspense>
      <CancelContent />
    </Suspense>
  )
}
