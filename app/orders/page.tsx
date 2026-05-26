import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Header from '@/components/Header'

function money(n: number) {
  return '$' + Number(n).toFixed(2)
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    confirmed: 'bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    fulfilled: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    cancelled: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600',
  }
  return map[status] ?? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const emailLower = (user.email ?? '').toLowerCase()
  const { data: customer } = await admin
    .from('customers')
    .select('id')
    .or(`customer_email.ilike.${emailLower},portal_email.ilike.${emailLower}`)
    .maybeSingle()

  type OrderItem = {
    id: string
    item_name: string
    sku: string
    sell_mode: string
    qty: number
    unit_price: number
    line_total: number
  }

  type Order = {
    id: string
    order_number: string
    status: string
    subtotal: number
    notes: string | null
    placed_at: string
    portal_order_items: OrderItem[]
  }

  let orders: Order[] = []
  if (customer?.id) {
    const { data } = await admin
      .from('portal_orders')
      .select(`
        id, order_number, status, subtotal, notes, placed_at,
        portal_order_items(id, item_name, sku, sell_mode, qty, unit_price, line_total)
      `)
      .eq('customer_id', customer.id)
      .order('placed_at', { ascending: false })
    orders = (data as Order[]) ?? []
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header email={user.email ?? ''} />

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1">
        <h2 className="text-xl sm:text-2xl font-bold text-[#0d2240] dark:text-blue-200 mb-6">My Orders</h2>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-12 sm:p-16 text-center text-slate-400 dark:text-slate-500">
            <p className="mb-4">No orders placed yet.</p>
            <a
              href="/catalog"
              className="text-sm text-[#0d2240] dark:text-blue-400 font-semibold hover:underline"
            >
              Browse the catalog →
            </a>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Order header */}
                <div className="px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-base sm:text-lg font-bold text-[#0d2240] dark:text-blue-200">{order.order_number}</span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${statusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <span>{formatDate(order.placed_at)}</span>
                    <span className="font-bold text-[#0d2240] dark:text-blue-200 text-base">{money(order.subtotal)}</span>
                  </div>
                </div>

                {/* Line items */}
                <div className="py-2">
                  {/* Mobile card list */}
                  <ul className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
                    {order.portal_order_items.map(li => (
                      <li key={li.id} className="flex items-start justify-between px-4 py-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 dark:text-slate-200 text-sm leading-snug">{li.item_name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{li.sku}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">
                            {li.sell_mode} · {li.qty} × {money(li.unit_price)}
                          </p>
                        </div>
                        <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm whitespace-nowrap pt-0.5">{money(li.line_total)}</p>
                      </li>
                    ))}
                  </ul>

                  {/* Desktop table */}
                  <table className="w-full text-sm hidden sm:table">
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                      {order.portal_order_items.map(li => (
                        <tr key={li.id}>
                          <td className="py-2.5 px-6 pr-4">
                            <p className="font-medium text-slate-800 dark:text-slate-200">{li.item_name}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{li.sku}</p>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full capitalize">
                              {li.sell_mode}
                            </span>
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
