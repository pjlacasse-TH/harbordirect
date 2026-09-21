import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { getSite } from '@/lib/portal'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; order?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { order: orderNumber } = await searchParams
  const isTerms = (await getSite()).payment_mode === 'terms'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header email={user.email ?? ''} />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-10 max-w-md w-full text-center">
          {/* Success icon */}
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[var(--brand)] dark:text-blue-200 mb-2">{isTerms ? 'Order Received' : 'Payment Confirmed!'}</h1>

          {orderNumber && (
            <>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Order number</p>
              <p className="text-2xl font-bold text-[var(--brand)] dark:text-blue-200 mb-5">{orderNumber}</p>
            </>
          )}

          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
            {isTerms
              ? 'Thank you — your order has been received and will be reviewed and confirmed by our team. You can follow its status under My Orders.'
              : 'Your payment was received and your order is confirmed. We’ll process it shortly and send tracking info when it ships.'}
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/orders"
              className="w-full py-3 bg-[var(--brand)] text-white font-semibold rounded-lg hover:bg-[var(--brand-hover)] transition-colors text-sm text-center"
            >
              View My Orders
            </Link>
            <Link
              href="/catalog"
              className="w-full py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-sm text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
