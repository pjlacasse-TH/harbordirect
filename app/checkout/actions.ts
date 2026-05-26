'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Stripe from 'stripe'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return { error: 'STRIPE_SECRET_KEY is not configured on this server', stripe: null }
  return { error: null, stripe: new Stripe(key, { apiVersion: '2026-04-22.dahlia' }) }
}

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

// Returns { checkoutUrl } on success, { error } on failure — never throws,
// so the real error message reaches the client even in production.
export async function placeOrder(
  items: CartItem[],
  notes: string
): Promise<{ checkoutUrl?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const admin = createAdminClient()
    const emailLower = (user.email ?? '').toLowerCase()

    const { data: customer, error: custErr } = await admin
      .from('customers')
      .select('id, company_id')
      .or(`customer_email.ilike.${emailLower},portal_email.ilike.${emailLower}`)
      .maybeSingle()

    if (custErr) return { error: `Customer lookup failed: ${custErr.message}` }
    if (!customer) return { error: 'No customer record found for this account. Contact Twin Harbors to set up portal access.' }

    const { data: orderNumData, error: seqErr } = await admin
      .rpc('next_portal_order_number', { p_company_id: customer.company_id })
    if (seqErr) return { error: `Order number generation failed: ${seqErr.message}` }
    const orderNumber: string = orderNumData

    const subtotal = items.reduce((s, i) => s + i.line_total, 0)

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

    if (orderErr || !order) return { error: `Failed to create order: ${orderErr?.message ?? 'unknown'}` }

    const { error: itemsErr } = await admin
      .from('portal_order_items')
      .insert(items.map(i => ({
        order_id:     order.id,
        inventory_id: i.id,
        item_name:    i.item_name,
        sku:          i.sku,
        sell_mode:    i.mode,
        qty:          i.qty,
        unit_price:   i.unit_price,
        line_total:   i.line_total,
      })))

    if (itemsErr) return { error: `Failed to save order items: ${itemsErr.message}` }

    // Create Stripe Checkout Session
    const { stripe, error: stripeInitErr } = getStripe()
    if (stripeInitErr || !stripe) return { error: stripeInitErr ?? 'Stripe unavailable' }

    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: user.email ?? undefined,
        line_items: items.map(i => ({
          price_data: {
            currency: 'usd',
            product_data: {
              name: i.item_name,
              description: `SKU: ${i.sku} - ${i.mode}`,
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
    } catch (stripeErr: unknown) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
      return { error: `Stripe error: ${msg}` }
    }

    await admin.from('portal_orders').update({
      stripe_session_id: session.id,
    }).eq('id', order.id)

    if (!session.url) return { error: 'Stripe did not return a checkout URL' }
    return { checkoutUrl: session.url }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `Unexpected error: ${msg}` }
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const admin = createAdminClient()
  await admin
    .from('portal_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('status', 'pending_payment')
}
