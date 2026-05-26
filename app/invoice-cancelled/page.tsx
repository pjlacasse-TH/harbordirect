export default function InvoiceCancelledPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-10 max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <svg width="28" height="18" viewBox="0 0 60 36" fill="none">
            <path d="M4 18 Q15 8 30 18 Q45 28 56 18" stroke="#0d2240" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5"/>
            <path d="M4 26 Q15 16 30 26 Q45 36 56 26" stroke="#0d2240" strokeWidth="4" strokeLinecap="round" fill="none"/>
          </svg>
          <span className="font-bold text-[#0d2240] dark:text-blue-200">Twin Harbors Medical Supply</span>
        </div>

        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-[#0d2240] dark:text-blue-200 mb-2">Payment Not Completed</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          Your invoice payment was not completed. Please contact Twin Harbors Medical Supply if you need a new payment link.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Twin Harbors Medical Supply &middot; twinharborsmedical.com
        </p>
      </div>
    </div>
  )
}
