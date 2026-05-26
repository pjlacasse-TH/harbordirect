'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return { error: 'Stripe is not configured on this server', stripe: null }
  return { error: null, stripe: new Stripe(key, { apiVersion: '2026-04-22.dahlia' }) }
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://harbordirect.netlify.app'

export async function createInvoiceCheckout(
  invoiceId: string
): Promise<{ checkoutUrl?: string; error?: string }> {
  try {
    const admin = createAdminClient()
    const { data: invoice, error: invErr } = await admin
      .from('invoices')
      .select('id, invoice_number, total, status, customer_email, customer_name')
      .eq('id', invoiceId)
      .single()

    if (invErr || !invoice) return { error: 'Invoice not found.' }
    if (invoice.status === 'Paid') return { error: 'This invoice has already been paid.' }
    if (!invoice.total || invoice.total <= 0) return { error: 'This invoice has no balance due.' }

    const { stripe, error: stripeErr } = getStripe()
    if (stripeErr || !stripe) return { error: stripeErr ?? 'Stripe unavailable' }

    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        customer_email: invoice.customer_email ?? undefined,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: 'Payment to Twin Harbors Medical Supply',
            },
            unit_amount: Math.round(invoice.total * 100),
          },
          quantity: 1,
        }],
        metadata: {
          type: 'invoice_payment',
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
        },
        success_url: `${BASE_URL}/invoice-paid?inv=${encodeURIComponent(invoice.invoice_number)}`,
        cancel_url:  `${BASE_URL}/pay/${invoice.id}`,
      })
    } catch (stripeErr: unknown) {
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr)
      return { error: `Stripe error: ${msg}` }
    }

    if (!session.url) return { error: 'Stripe did not return a checkout URL.' }
    return { checkoutUrl: session.url }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { error: `Unexpected error: ${msg}` }
  }
}
