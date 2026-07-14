import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function GET(req: NextRequest) {
  // אימות סיסמת cron
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // מצא נסיעות פעילות מעל 12 שעות
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()

    const { data: trips } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'active')
      .lt('start_time', twelveHoursAgo)

    if (!trips || trips.length === 0) {
      return NextResponse.json({ message: 'אין נסיעות פעילות ארוכות' })
    }

    // טען מנויים
    const { data: subs } = await supabase.from('push_subscriptions').select('*')
    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'אין מנויים' })
    }

    let sent = 0
    for (const trip of trips) {
      const hoursOpen = Math.floor((Date.now() - new Date(trip.start_time).getTime()) / (1000 * 60 * 60))
      const payload = JSON.stringify({
        title: '⚠️ נסיעה פתוחה',
        body: `נסיעה של ${trip.driver_name} פתוחה כבר ${hoursOpen} שעות — יש לסגור אותה`
      })

      await Promise.all(subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          sent++
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
          }
        }
      }))

      // שמור ביומן
      await supabase.from('notifications_log').insert({
        title: '⚠️ נסיעה פתוחה',
        body: `נסיעה של ${trip.driver_name} פתוחה כבר ${hoursOpen} שעות`,
        sent_to: 'כולם (אוטומטי)',
        sent_count: sent,
      })
    }

    return NextResponse.json({ success: true, trips: trips.length, sent })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
