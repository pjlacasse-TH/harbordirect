import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CatalogClient from './CatalogClient'

export default async function CatalogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch portal-available inventory
  const { data: items, error: itemsError } = await supabase
    .from('inventory')
    .select('id, item_name, sku, description, sell_price, sell_price_case, sell_mode, sell_uom, qty_on_hand, low_stock_alert, image_url, variant_group, variant_label')
    .eq('available_on_portal', true)
    .order('item_name')

  // Match auth user to customer record — case-insensitive, checks both email fields
  const emailLower = (user.email ?? '').toLowerCase()
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .or(`customer_email.ilike.${emailLower},portal_email.ilike.${emailLower}`)
    .maybeSingle()

  // Load contracted prices for this customer
  const contractedPrices: Record<string, { price: number | null; price_case: number | null }> = {}
  if (customer?.id) {
    const { data: prices } = await supabase
      .from('customer_prices')
      .select('inventory_id, price, price_case')
      .eq('customer_id', customer.id)

    for (const p of prices ?? []) {
      contractedPrices[p.inventory_id] = { price: p.price, price_case: p.price_case }
    }
  }

  return (
    <CatalogClient
      email={user.email ?? ''}
      items={items ?? []}
      contractedPrices={contractedPrices}
    />
  )
}
