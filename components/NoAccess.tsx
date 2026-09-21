import Header from './Header'

/** Signed in, but this login is not linked to a customer account on THIS portal. */
export default function NoAccess({ email, brandName, supportEmail }: { email: string; brandName: string; supportEmail: string | null }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header email={email} />
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 sm:p-10 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-[var(--brand)] dark:text-blue-200 mb-3">Account not set up</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            <span className="font-medium text-slate-700 dark:text-slate-300">{email}</span> is not linked to a customer
            account on {brandName} yet.
            {supportEmail
              ? <> Contact <a className="text-[var(--brand)] dark:text-blue-400 underline" href={`mailto:${supportEmail}`}>{supportEmail}</a> to get access.</>
              : <> Contact your account representative to get access.</>}
          </p>
        </div>
      </div>
    </div>
  )
}
