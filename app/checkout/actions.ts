'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

export type CartItem = {
  id: string
  item_name: string
  sku: string
  mode: 'each' | 'case'
  qty: number
  unit_price: number
  line_total: number
}

export async function placeOrder(items: CartItem[], notes: string): Promise<{ orderId: string; orderNumber: string }> {
  // Verify auth with the user's session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Use service role for all DB writes — runs server-side only, bypasses RLS
  const admin = createAdminClient()
  const emailLower = (user.email ?? '').toLowerCase()

  const { data: customer } = await admin
    .from('customers')
    .select('id, company_id')
    .or(`customer_email.ilike.${emailLower},portal_email.ilike.${emailLower}`)
    .maybeSingle()

  if (!customer) throw new Error('Customer record not found')

  const { data: orderNumData, error: seqErr } = await admin
    .rpc('next_portal_order_number', { p_company_id: customer.company_id })
  if (seqErr) throw new Error('Failed to generate order number')

  const orderNumber: string = orderNumData
  const subtotal = items.reduce((s, i) => s + i.line_total, 0)

  const { data: order, error: orderErr } = await admin
    .from('portal_orders')
    .insert({
      company_id: customer.company_id,
      customer_id: customer.id,
      order_number: orderNumber,
      status: 'pending',
      subtotal,
      notes: notes || null,
    })
    .select('id')
    .single()

  if (orderErr || !order) throw new Error('Failed to create order')

  const lineItems = items.map(i => ({
    order_id: order.id,
    inventory_id: i.id,
    item_name: i.item_name,
    sku: i.sku,
    sell_mode: i.mode,
    qty: i.qty,
    unit_price: i.unit_price,
    line_total: i.line_total,
  }))

  const { error: itemsErr } = await admin
    .from('portal_order_items')
    .insert(lineItems)

  if (itemsErr) throw new Error('Failed to save order items')

  return { orderId: order.id, orderNumber }
}
