import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const formData = await request.formData()
  const nickname = formData.get('nickname')
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await supabase.from('profiles').upsert({ id: user.id, nickname })
  }

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
