import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'
import Link from 'next/link'
import PrintReceiptButton from '@/components/PrintReceiptButton'
import NoAccess from '@/components/NoAccess'
import { getPortalAccount, getSite } from '@/lib/portal'

function money(n: number) {
  return '$' + Number(n).toFixed(2)
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function trackingUrl(carrier: string | null, number: string): string {
  const n = encodeURIComponent(number)
  switch ((carrier ?? '').toLowerCase()) {
    case 'fedex': return `https://www.fedex.com/fedextrack/?trknbr=${n}`
    case 'ups':   return `https://www.ups.com/track?tracknum=${n}`
    case 'usps':  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`
    default:      return `https://www.google.com/search?q=${n}+tracking`
  }
}

type StatusKey = 'pending_payment' | 'pending' | 'confirmed' | 'fulfilled' | 'cancelled'

function StatusBadge({ status }: { status: string }) {
  const map: Record<StatusKey, { label: string; cls: string }> = {
    pending_payment: {
      label: 'Awaiting Payment',
      cls: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    },
    pending: {
      label: 'Received',
      cls: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600',
    },
    confirmed: {
      label: 'Paid & Confirmed',
      cls: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    },
    fulfilled: {
      label: 'Shipped',
      cls: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    },
    cancelled: {
      label: 'Cancelled',
      cls: 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600',
    },
  }
  const cfg = map[status as StatusKey] ?? {
    label: status,
    cls: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

const PAID_STATUSES = new Set(['confirmed', 'fulfilled'])

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [site, account] = await Promise.all([getSite(), getPortalAccount()])
  if (!account) return <NoAccess email={user.email ?? ''} brandName={site.brand_name} supportEmail={site.support_email} />
  const admin = createAdminClient()

  type OrderItem = {
    id: string; item_name: string; sku: string
    sell_mode: string; uom: string | null; qty: number; unit_price: number; line_total: number
  }
  type Order = {
    id: string; order_number: string; status: string
    subtotal: number; notes: string | null; placed_at: string
    paid_at: string | null; carrier: string | null; tracking_number: string | null
    po_number: string | null; placed_by_email: string | null
    portal_order_items: OrderItem[]
  }

  // Every order on the customer's account, not just this buyer's — colleagues see each other's orders.
  const { data } = await admin
    .from('portal_orders')
    .select(`
      id, order_number, status, subtotal, notes, placed_at,
      paid_at, carrier, tracking_number, po_number, placed_by_email,
      portal_order_items(id, item_name, sku, sell_mode, uom, qty, unit_price, line_total)
    `)
    .eq('company_id', account.companyId)
    .eq('customer_id', account.customerId)
    .not('status', 'in', '(pending_payment,submitting)') // unpaid card sessions / half-written orders
    .order('placed_at', { ascending: false })
    .limit(200)
  const orders = (data as Order[]) ?? []
  const isTerms = site.payment_mode === 'terms'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header email={user.email ?? ''} />

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        <h2 className="text-xl sm:text-2xl font-bold text-[var(--brand)] dark:text-blue-200 mb-6">My Orders</h2>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 sm:p-16 text-center text-slate-400 dark:text-slate-500">
            <p className="mb-4">No orders placed yet.</p>
            <Link href="/catalog" className="text-sm text-[var(--brand)] dark:text-blue-400 font-semibold hover:underline">
              Browse the catalog →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Order header */}
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-base sm:text-lg font-bold text-[var(--brand)] dark:text-blue-200">{order.order_number}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {formatDate(order.placed_at)}
                      {order.po_number && <> &middot; PO {order.po_number}</>}
                      {order.placed_by_email && order.placed_by_email !== account.email && <> &middot; by {order.placed_by_email}</>}
                    </span>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <div className="font-bold text-[var(--brand)] dark:text-blue-200 text-base">{money(order.subtotal)}</div>
                    {order.paid_at && (
                      <div className="text-xs text-emerald-600 dark:text-emerald-400">
                        Paid {formatDate(order.paid_at)}
                      </div>
                    )}
                    {(isTerms || PAID_STATUSES.has(order.status)) && (
                      <PrintReceiptButton order={order} customerEmail={user.email ?? ''} />
                    )}
                  </div>
                </div>

                {/* Tracking banner — shown when shipped */}
                {order.tracking_number && (
                  <div className="px-4 sm:px-6 py-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900 flex items-center gap-3">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        {order.carrier && <span className="mr-1">{order.carrier}</span>}
                        Tracking:
                      </span>
                      <a
                        href={trackingUrl(order.carrier, order.tracking_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1.5 text-sm font-bold text-blue-700 dark:text-blue-400 underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-300 font-mono"
                      >
                        {order.tracking_number}
                      </a>
                    </div>
                    <a
                      href={trackingUrl(order.carrier, order.tracking_number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline whitespace-nowrap"
                    >
                      Track →
                    </a>
                  </div>
                )}

                {/* Line items */}
                <div className="py-2">
                  <ul className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
                    {order.portal_order_items.map(li => (
                      <li key={li.id} className="flex items-start justify-between px-4 py-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-200 text-sm leading-snug">{li.item_name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{li.sku}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">
                            {li.uom || li.sell_mode} · {li.qty} × {money(li.unit_price)}
                          </p>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap pt-0.5">{money(li.line_total)}</p>
                      </li>
                    ))}
                  </ul>

                  <table className="w-full text-sm hidden sm:table">
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {order.portal_order_items.map(li => (
                        <tr key={li.id}>
                          <td className="py-2.5 px-6 pr-4">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{li.item_name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{li.sku}</p>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full capitalize">{li.uom || li.sell_mode}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">×{li.qty}</td>
                          <td className="py-2.5 px-3 text-right text-slate-500 dark:text-slate-400">{money(li.unit_price)}</td>
                          <td className="py-2.5 pl-3 pr-6 text-right font-semibold text-slate-800 dark:text-slate-200">{money(li.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {order.notes && (
                  <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-semibold">Notes:</span> {order.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
