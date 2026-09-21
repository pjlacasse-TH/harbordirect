import Link from 'next/link'

export default async function InvoicePaidPage({
  searchParams,
}: {
  searchParams: Promise<{ inv?: string }>
}) {
  const { inv } = await searchParams

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-10 max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <svg width="28" height="18" viewBox="0 0 60 36" fill="none">
            <path d="M4 18 Q15 8 30 18 Q45 28 56 18" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5"/>
            <path d="M4 26 Q15 16 30 26 Q45 36 56 26" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" fill="none"/>
          </svg>
          <span className="font-bold text-[var(--brand)] dark:text-blue-200">Twin Harbors Medical Supply</span>
        </div>

        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[var(--brand)] dark:text-blue-200 mb-2">Payment Received!</h1>

        {inv && (
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">Invoice <strong className="text-slate-700 dark:text-slate-300">{inv}</strong> has been paid.</p>
        )}

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 mb-8 leading-relaxed">
          Thank you! A receipt has been sent by Stripe to your email address. If you have any questions, contact Twin Harbors Medical Supply.
        </p>

        <Link
          href="/catalog"
          className="inline-block py-3 px-6 bg-[var(--brand)] text-white font-semibold rounded-lg hover:bg-[var(--brand-hover)] transition-colors text-sm"
        >
          Visit HarborDirect
        </Link>
      </div>
    </div>
  )
}
