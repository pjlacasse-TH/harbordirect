import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CatalogClient from './CatalogClient'
import NoAccess from '@/components/NoAccess'
import { getPortalAccount, getSite, loadCatalog } from '@/lib/portal'

export default async function CatalogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [site, account] = await Promise.all([getSite(), getPortalAccount()])
  if (!account) return <NoAccess email={user.email ?? ''} brandName={site.brand_name} supportEmail={site.support_email} />

  // Prices are resolved in the database for THIS customer (contract > group > list) and are the
  // same numbers checkout will charge — the browser never supplies a price.
  const items = await loadCatalog(account, site.catalog_mode)

  return (
    <CatalogClient
      email={user.email ?? ''}
      customerName={account.customerName}
      items={items}
      catalogMode={site.catalog_mode}
      allowBackorder={site.allow_backorder}
    />
  )
}
