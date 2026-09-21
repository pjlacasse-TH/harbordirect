'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getPortalAccount, getSite, loadCatalog } from '@/lib/portal'
import Stripe from 'stripe'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return { error: 'STRIPE_SECRET_KEY is not configured on this server', stripe: null }
  return { error: null, stripe: new Stripe(key, { apiVersion: '2026-04-22.dahlia' }) }
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://harbordirect.netlify.app'

/** What the review screen shows. Prices here are display-only — placeOrder re-prices every line. */
export type CartItem = {
  id: string
  item_name: string
  sku: string
  uom?: string
  mode: 'each' | 'case'
  qty: number
  unit_price: number
  line_total: number
}

export type ShipToInput =
  | { kind: 'default' }
  | { kind: 'saved'; address_id: string }
  | { kind: 'new'; name: string; address: string; city: string; state: string; zip: string }

export type PlaceOrderInput = {
  items: Array<{ id: string; mode: 'each' | 'case'; qty: number }>
  notes: string
  po_number?: string
  ship_to?: ShipToInput
}

const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n)

// Returns { checkoutUrl } (card) or { orderNumber } (terms) on success, { error } on failure —
// never throws, so the real message reaches the client in production.
export async function placeOrder(
  input: PlaceOrderInput,
): Promise<{ checkoutUrl?: string; orderNumber?: string; error?: string }> {
  try {
    const [site, account] = await Promise.all([getSite(), getPortalAccount()])
    if (!account) return { error: 'Your login is not linked to a customer account on this portal.' }

    const lines = (input.items ?? []).filter(l => l && l.id && Number(l.qty) > 0)
    if (!lines.length) return { error: 'Your cart is empty.' }
    if (lines.length > 200) return { error: 'Too many lines for one order — please split it.' }

    const poNumber = clip(input.po_number, 60) || null
    if (site.require_po && !poNumber) return { error: 'A PO number is required.' }

    // ── Price every line from the database, for THIS customer ──
    const catalog = await loadCatalog(account, 'all')
    const byId = new Map(catalog.map(c => [c.inventory_id, c]))
    const priced: Array<{ inventory_id: string; item_name: string; sku: string; sell_mode: 'each' | 'case'; uom: string; qty: number; unit_price: number; line_total: number }> = []
    for (const l of lines) {
      const item = byId.get(l.id)
      if (!item) return { error: 'An item in your cart is no longer available. Please review your cart.' }
      const mode: 'each' | 'case' = l.mode === 'case' ? 'case' : 'each'
      if (mode === 'case' && item.sell_mode !== 'case' && item.sell_mode !== 'both') {
        return { error: `${item.item_name} is not sold by the case.` }
      }
      const price = mode === 'each' ? item.price_each : item.price_case
      if (price == null || price <= 0) return { error: `${item.item_name} has no price — please contact us to order it.` }
      const qty = Math.floor(Number(l.qty))
      if (!Number.isFinite(qty) || qty < 1 || qty > 100000) return { error: `Invalid quantity for ${item.item_name}.` }
      if (!site.allow_backorder && (item.qty_on_hand ?? 0) <= 0) return { error: `${item.item_name} is out of stock.` }
      priced.push({
        inventory_id: item.inventory_id, item_name: item.item_name, sku: item.sku, sell_mode: mode,
        uom: mode === 'case' ? 'case' : (item.sell_uom || 'each'),
        qty, unit_price: price, line_total: Math.round(qty * price * 100) / 100,
      })
    }
    const subtotal = Math.round(priced.reduce((s, i) => s + i.line_total, 0) * 100) / 100

    const admin = createAdminClient()

    // ── Ship-to ──
    let shipTo: Record<string, string> | null = null
    let shipToAddressId: string | null = null
    const st = input.ship_to
    if (st?.kind === 'saved') {
      const { data: a } = await admin.from('medzah_account_addresses')
        .select('id, attn, address, city, state, zip, account_name')
        .eq('id', st.address_id).eq('company_id', account.companyId).maybeSingle()
      if (!a || (a.account_name ?? '').toLowerCase() !== account.customerName.toLowerCase()) {
        return { error: 'That ship-to address is not on your account.' }
      }
      shipToAddressId = a.id
      shipTo = { name: a.attn || account.customerName, address: a.address ?? '', city: a.city ?? '', state: a.state ?? '', zip: a.zip ?? '' }
    } else if (st?.kind === 'new') {
      shipTo = { name: clip(st.name, 80) || account.customerName, address: clip(st.address, 200), city: clip(st.city, 60), state: clip(st.state, 30), zip: clip(st.zip, 15) }
      if (!shipTo.address || !shipTo.city || !shipTo.state || !shipTo.zip) return { error: 'Please complete the ship-to address.' }
    }

    // ── Create the order ──
    const { data: orderNumber, error: seqErr } = await admin.rpc('next_portal_order_number', { p_company_id: account.companyId })
    if (seqErr) return { error: `Order number generation failed: ${seqErr.message}` }

    const isTerms = site.payment_mode === 'terms'
    // Terms orders start as 'submitting' and flip to 'pending' once every line is saved. That flip is
    // what fires the background Fishbowl push, so it can never see a half-written order.
    const { data: order, error: orderErr } = await admin
      .from('portal_orders')
      .insert({
        company_id: account.companyId,
        customer_id: account.customerId,
        order_number: orderNumber as string,
        status: isTerms ? 'submitting' : 'pending_payment',
        subtotal,
        notes: clip(input.notes, 2000) || null,
        po_number: poNumber,
        ship_to: shipTo,
        ship_to_address_id: shipToAddressId,
        placed_by_user_id: account.userId,
        placed_by_email: account.email,
      })
      .select('id')
      .single()
    if (orderErr || !order) return { error: `Failed to create order: ${orderErr?.message ?? 'unknown'}` }

    const { error: itemsErr } = await admin
      .from('portal_order_items')
      .insert(priced.map(i => ({ order_id: order.id, ...i })))
    if (itemsErr) {
      await admin.from('portal_orders').delete().eq('id', order.id)
      return { error: `Failed to save order items: ${itemsErr.message}` }
    }

    if (isTerms) {
      const { error: submitErr } = await admin.from('portal_orders')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', order.id)
      if (submitErr) return { error: `Order saved but could not be submitted: ${submitErr.message}` }
      return { orderNumber: orderNumber as string }
    }

    // ── Card payment (Stripe Checkout) ──
    const { stripe, error: stripeInitErr } = getStripe()
    if (stripeInitErr || !stripe) return { error: stripeInitErr ?? 'Stripe unavailable' }

    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: account.email || undefined,
        line_items: priced.map(i => ({
          price_data: {
            currency: 'usd',
            product_data: { name: i.item_name, description: `SKU: ${i.sku} - ${i.sell_mode}` },
            unit_amount: Math.round(i.unit_price * 100),
          },
          quantity: i.qty,
        })),
        metadata: { type: 'portal_order', order_id: order.id, order_number: orderNumber as string },
        success_url: `${BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order=${orderNumber}`,
        cancel_url: `${BASE_URL}/checkout/cancel?order_id=${order.id}`,
      })
    } catch (stripeErr: unknown) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
      return { error: `Stripe error: ${msg}` }
    }

    await admin.from('portal_orders').update({ stripe_session_id: session.id }).eq('id', order.id)
    if (!session.url) return { error: 'Stripe did not return a checkout URL' }
    return { checkoutUrl: session.url }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `Unexpected error: ${msg}` }
  }
}

/** Abandon an unpaid card checkout. Only the signed-in customer's own order, and only if unpaid. */
export async function cancelOrder(orderId: string): Promise<void> {
  const account = await getPortalAccount()
  if (!account) return
  await createAdminClient()
    .from('portal_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .eq('customer_id', account.customerId)
    .eq('status', 'pending_payment')
}
