import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import CheckoutClient, { type SavedAddress } from './CheckoutClient'
import NoAccess from '@/components/NoAccess'
import { getPortalAccount, getSite } from '@/lib/portal'

export default async function CheckoutPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [site, account] = await Promise.all([getSite(), getPortalAccount()])
  if (!account) return <NoAccess email={user.email ?? ''} brandName={site.brand_name} supportEmail={site.support_email} />

  // Saved ship-to addresses for this account (synced from Fishbowl). Terms portals only —
  // card checkout collects its address through Stripe.
  let addresses: SavedAddress[] = []
  if (site.payment_mode === 'terms') {
    const { data } = await createAdminClient()
      .from('medzah_account_addresses')
      .select('id, label, attn, address, city, state, zip, is_default')
      .eq('company_id', account.companyId)
      .ilike('account_name', account.customerName.replace(/[%_\\]/g, m => `\\${m}`))
      .order('is_default', { ascending: false })
    addresses = (data ?? []) as SavedAddress[]
  }

  return (
    <CheckoutClient
      email={user.email ?? ''}
      customerName={account.customerName}
      paymentMode={site.payment_mode}
      requirePo={site.require_po}
      addresses={addresses}
    />
  )
}
