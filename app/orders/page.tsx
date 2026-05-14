import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

function money(n: number) {
  return '$' + Number(n).toFixed(2)
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
    fulfilled: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  }
  return map[status] ?? 'bg-slate-100 text-slate-500 border-slate-200'
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

  const emailLower = (user.email ?? '').toLowerCase()
  const { data: customer } = await supabase
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
    const { data } = await supabase
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
    <div className="min-h-screen bg-[#f0f4f8]">
      <header className="bg-[#0d2240] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">HarborDirect</h1>
          <p className="text-xs text-blue-200">{user.email}</p>
        </div>
        <Link
          href="/catalog"
          className="text-sm text-blue-200 hover:text-white transition-colors"
        >
          ← Back to Catalog
        </Link>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-[#0d2240] mb-6">My Orders</h2>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center text-gray-400">
            <p className="mb-4">No orders placed yet.</p>
            <Link
              href="/catalog"
              className="text-sm text-[#0d2240] font-semibold hover:underline"
            >
              Browse the catalog →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Order header */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-[#0d2240]">{order.order_number}</span>
                    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border capitalize ${statusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{formatDate(order.placed_at)}</span>
                    <span className="font-bold text-[#0d2240] text-base">{money(order.subtotal)}</span>
                  </div>
                </div>

                {/* Line items */}
                <div className="px-6 py-3">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {order.portal_order_items.map(li => (
                        <tr key={li.id}>
                          <td className="py-2.5 pr-4">
                            <p className="font-medium text-gray-800">{li.item_name}</p>
                            <p className="text-xs text-gray-400">{li.sku}</p>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                              {li.sell_mode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-gray-600">×{li.qty}</td>
                          <td className="py-2.5 px-3 text-right text-gray-500">{money(li.unit_price)}</td>
                          <td className="py-2.5 pl-3 text-right font-semibold text-gray-800">{money(li.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {order.notes && (
                  <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-xs text-gray-500">
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
