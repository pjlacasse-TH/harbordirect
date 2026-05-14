import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UpdatePasswordClient from './UpdatePasswordClient'

export default async function UpdatePasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <UpdatePasswordClient email={user.email ?? ''} />
}
