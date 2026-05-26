'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://harbordirect.netlify.app'

export type CartItem = {
  id: string
  item_name: string
  sku: string
  mode: 'each' | 'case'
  qty: number
  unit_price: number
  line_total: number
}

export async function placeOrder(
  items: CartItem[],
  notes: string
): Promise<{ checkoutUrl: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const emailLower = (user.email ?? '').toLowerCase()

  const { data: customer } = await admin
    .from('customers')
    .select('id, company_id')
    .or(`customer_email.ilike.${emailLower},portal_email.ilike.${emailLower}`)
    .maybeSingle()

  if (!customer) throw new Error('Customer record not found')

  // Generate order number
  const { data: orderNumData, error: seqErr } = await admin
    .rpc('next_portal_order_number', { p_company_id: customer.company_id })
  if (seqErr) throw new Error('Failed to generate order number')
  const orderNumber: string = orderNumData

  const subtotal = items.reduce((s, i) => s + i.line_total, 0)

  // Insert order with pending_payment status
  const { data: order, error: orderErr } = await admin
    .from('portal_orders')
    .insert({
      company_id: customer.company_id,
      customer_id: customer.id,
      order_number: orderNumber,
      status: 'pending_payment',
      subtotal,
      notes: notes || null,
    })
    .select('id')
    .single()

  if (orderErr || !order) throw new Error('Failed to create order')

  // Insert line items
  const { error: itemsErr } = await admin
    .from('portal_order_items')
    .insert(items.map(i => ({
      order_id:    order.id,
      inventory_id: i.id,
      item_name:   i.item_name,
      sku:         i.sku,
      sell_mode:   i.mode,
      qty:         i.qty,
      unit_price:  i.unit_price,
      line_total:  i.line_total,
    })))

  if (itemsErr) throw new Error('Failed to save order items')

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    customer_email: user.email ?? undefined,
    line_items: items.map(i => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: i.item_name,
          description: `SKU: ${i.sku} — ${i.mode}`,
        },
        unit_amount: Math.round(i.unit_price * 100),
      },
      quantity: i.qty,
    })),
    metadata: {
      type:         'portal_order',
      order_id:     order.id,
      order_number: orderNumber,
    },
    success_url: `${BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order=${orderNumber}`,
    cancel_url:  `${BASE_URL}/checkout/cancel?order_id=${order.id}`,
  })

  // Store session ID on the order
  await admin.from('portal_orders').update({
    stripe_session_id: session.id,
  }).eq('id', order.id)

  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return { checkoutUrl: session.url }
}

// Called from success page to cancel an unpaid order
export async function cancelOrder(orderId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const admin = createAdminClient()
  await admin
    .from('portal_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'pending_payment') // only cancel if not yet paid
}
