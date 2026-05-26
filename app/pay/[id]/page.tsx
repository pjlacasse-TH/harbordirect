import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import PayClient from './PayClient'

type InvoiceItem = {
  id: string
  item_type: string
  description: string
  quantity: number
  rate: number
  total: number
  sort_order: number
}

type Invoice = {
  id: string
  invoice_number: string
  status: string
  invoice_date: string
  due_date: string | null
  customer_name: string
  customer_email: string
  from_name: string
  from_email: string
  subtotal: number
  tax_rate: number
  total: number
  paid_at: string | null
  payment_method: string | null
  invoice_items: InvoiceItem[]
}

export default async function PayPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()

  // Load invoice by UUID — the UUID itself is the auth token (unguessable)
  const { data: invoice } = await admin
    .from('invoices')
    .select(`
      id, invoice_number, status, invoice_date, due_date,
      customer_name, customer_email, from_name, from_email,
      subtotal, tax_rate, total, paid_at, payment_method,
      invoice_items(id, item_type, description, quantity, rate, total, sort_order)
    `)
    .eq('id', id)
    .single()

  // Soft auth check — no redirect, just note if they're logged in
  let userEmail: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userEmail = user?.email ?? null
  } catch { /* not logged in — that's fine */ }

  return (
    <PayClient
      invoice={invoice as Invoice | null}
      invoiceId={id}
      userEmail={userEmail}
    />
  )
}
