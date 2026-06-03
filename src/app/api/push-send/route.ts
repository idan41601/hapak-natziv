import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { title, body, targetEndpoints } = await req.json()

    // טען את כל המנויים או מנויים ספציפיים
    let query = supabase.from('push_subscriptions').select('*')
    if (targetEndpoints && targetEndpoints.length > 0) {
      query = query.in('endpoint', targetEndpoints)
    }
    const { data: subscriptions } = await query

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: false, error: 'אין מנויים' })
    }

    const payload = JSON.stringify({ title, body })
    let sent = 0
    const failed: string[] = []

    await Promise.all(subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        sent++
      } catch (err: any) {
        // מנוי פג תוקף — מחק אותו
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
        failed.push(sub.user_label)
      }
    }))

    // שמור ביומן
    await supabase.from('notifications_log').insert({
      title,
      body,
      sent_to: targetEndpoints?.length > 0 ? `נבחרים (${sent})` : 'כולם',
      sent_count: sent,
    })

    return NextResponse.json({ success: true, sent, failed })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
