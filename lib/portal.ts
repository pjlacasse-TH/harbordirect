import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// One codebase, one Netlify site per company. Each site sets PORTAL_COMPANY_ID; the original
// HarborDirect site predates the variable, so an unset value means Twin Harbors.
const TWIN_HARBORS_ID = 'a74d9f39-0b5a-4467-a441-9e95dd08ad2b'
export const PORTAL_COMPANY_ID = process.env.PORTAL_COMPANY_ID || TWIN_HARBORS_ID

export type PaymentMode = 'stripe' | 'terms'
export type CatalogMode = 'all' | 'assigned_first' | 'assigned_only'

export interface PortalSite {
  company_id: string
  brand_name: string
  tagline: string | null
  primary_color: string
  primary_hover: string
  logo_url: string | null
  support_email: string | null
  support_phone: string | null
  payment_mode: PaymentMode
  catalog_mode: CatalogMode
  allow_backorder: boolean
  require_po: boolean
  site_url: string | null
  apply_url: string | null
  fishbowl_push: boolean
}

/** Browser-safe subset handed to client components. */
export type Brand = Pick<PortalSite,
  'brand_name' | 'tagline' | 'primary_color' | 'primary_hover' | 'logo_url' | 'support_email' | 'support_phone' | 'payment_mode' | 'apply_url'>

const FALLBACK: PortalSite = {
  company_id: PORTAL_COMPANY_ID,
  brand_name: 'HarborDirect',
  tagline: 'Twin Harbors Medical Supply',
  primary_color: '#0d2240',
  primary_hover: '#1a3a6a',
  logo_url: null,
  support_email: null,
  support_phone: null,
  payment_mode: 'stripe',
  catalog_mode: 'all',
  allow_backorder: false,
  require_po: false,
  site_url: null,
  apply_url: '/onboarding.html?co=twin-harbors',
  fishbowl_push: false,
}

export const getSite = cache(async (): Promise<PortalSite> => {
  const { data } = await createAdminClient()
    .from('portal_sites')
    .select('company_id, brand_name, tagline, primary_color, primary_hover, logo_url, support_email, support_phone, payment_mode, catalog_mode, allow_backorder, require_po, site_url, apply_url, fishbowl_push')
    .eq('company_id', PORTAL_COMPANY_ID)
    .maybeSingle()
  return (data as PortalSite) ?? FALLBACK
})

export function toBrand(s: PortalSite): Brand {
  return {
    brand_name: s.brand_name, tagline: s.tagline, primary_color: s.primary_color, primary_hover: s.primary_hover,
    logo_url: s.logo_url, support_email: s.support_email, support_phone: s.support_phone, payment_mode: s.payment_mode,
    apply_url: s.apply_url,
  }
}

export interface PortalAccount {
  userId: string
  email: string
  portalUserId: string
  customerId: string
  customerName: string
  companyId: string
}

/**
 * The signed-in user's account on THIS site's company, or null.
 *
 * A login maps to a customer only through portal_users, scoped to this site's company — so a
 * Twin Harbors login can never see Medzah's catalogue or orders, even with a valid session.
 * Staff invite by email before the person has an auth user, so the first sign-in links the row.
 */
export const getPortalAccount = cache(async (): Promise<PortalAccount | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const email = (user.email ?? '').toLowerCase()

  let { data: pu } = await admin
    .from('portal_users')
    .select('id, customer_id, user_id, is_active')
    .eq('company_id', PORTAL_COMPANY_ID)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!pu && email) {
    // First sign-in after an invite: claim the row by email, but only an unclaimed one.
    const { data: byEmail } = await admin
      .from('portal_users')
      .select('id, customer_id, user_id, is_active')
      .eq('company_id', PORTAL_COMPANY_ID)
      .ilike('email', email.replace(/[%_\\]/g, m => `\\${m}`))
      .is('user_id', null)
      .maybeSingle()
    if (byEmail) {
      await admin.from('portal_users').update({ user_id: user.id }).eq('id', byEmail.id)
      pu = { ...byEmail, user_id: user.id }
    }
  }

  if (!pu || !pu.is_active) return null

  const { data: cust } = await admin
    .from('customers')
    .select('id, customer_name, company_id')
    .eq('id', pu.customer_id)
    .eq('company_id', PORTAL_COMPANY_ID)
    .maybeSingle()
  if (!cust) return null

  // Cheap audit trail for staff ("has this buyer ever logged in?"). Not awaited on purpose.
  void admin.from('portal_users').update({ last_login_at: new Date().toISOString() }).eq('id', pu.id)

  return {
    userId: user.id,
    email,
    portalUserId: pu.id,
    customerId: cust.id,
    customerName: cust.customer_name,
    companyId: cust.company_id,
  }
})

export interface CatalogItem {
  inventory_id: string
  item_name: string
  sku: string
  description: string | null
  sell_mode: string | null
  sell_uom: string | null
  qty_on_hand: number | null
  low_stock_alert: number | null
  image_url: string | null
  variant_group: string | null
  variant_label: string | null
  list_each: number | null
  list_case: number | null
  price_each: number | null
  price_case: number | null
  price_source: 'contract' | 'group_item' | 'group' | 'list'
  assigned: boolean
  assigned_sort: number | null
  assigned_section: string | null
}

/** The customer's priced catalogue. The ONLY source of prices — checkout re-reads it too. */
export async function loadCatalog(account: PortalAccount, mode: CatalogMode): Promise<CatalogItem[]> {
  const { data, error } = await createAdminClient()
    .rpc('portal_catalog', { p_company_id: account.companyId, p_customer_id: account.customerId })
  if (error) throw new Error(`Catalog failed: ${error.message}`)
  const rows = ((data ?? []) as CatalogItem[]).map(r => ({
    ...r,
    qty_on_hand: r.qty_on_hand == null ? null : Number(r.qty_on_hand),
    low_stock_alert: r.low_stock_alert == null ? null : Number(r.low_stock_alert),
    list_each: r.list_each == null ? null : Number(r.list_each),
    list_case: r.list_case == null ? null : Number(r.list_case),
    price_each: r.price_each == null ? null : Number(r.price_each),
    price_case: r.price_case == null ? null : Number(r.price_case),
  }))
  const filtered = mode === 'assigned_only' ? rows.filter(r => r.assigned) : rows
  return filtered.sort((a, b) => {
    if (mode !== 'all' && a.assigned !== b.assigned) return a.assigned ? -1 : 1
    if (a.assigned && b.assigned) return (a.assigned_sort ?? 0) - (b.assigned_sort ?? 0) || a.item_name.localeCompare(b.item_name)
    return a.item_name.localeCompare(b.item_name)
  })
}
