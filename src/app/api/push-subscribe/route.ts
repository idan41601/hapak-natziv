import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { subscription, userLabel } = await req.json()
    const { endpoint, keys } = subscription

    await supabase.from('push_subscriptions').upsert({
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_label: userLabel || 'משתמש',
    }, { onConflict: 'endpoint' })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json()
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}
