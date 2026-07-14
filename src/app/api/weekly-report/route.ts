import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cron job — כל יום ראשון בבוקר
export async function GET() {
  return POST(new NextRequest('http://localhost/api/weekly-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sections: ['trips', 'schedule', 'notifications'] })
  }))
}

export async function POST(req: NextRequest) {
  try {
    const { sections, dateFrom, dateTo } = await req.json()

    // חישוב תאריכי השבוע
    const now = new Date()
    const from = dateFrom ? new Date(dateFrom) : (() => {
      const d = new Date(now); d.setDate(d.getDate() - 7); return d
    })()
    const to = dateTo ? new Date(dateTo) : now

    const fromStr = from.toISOString()
    const toStr = to.toISOString()
    const fromLabel = from.toLocaleDateString('he-IL')
    const toLabel = to.toLocaleDateString('he-IL')

    // טען נתונים
    const [tripsRes, emailsRes, scheduleRes, notifRes, driversRes] = await Promise.all([
      sections.includes('trips')
        ? supabase.from('trips').select('*').gte('start_time', fromStr).lte('start_time', toStr).order('start_time')
        : Promise.resolve({ data: [] }),
      supabase.from('report_emails').select('*').eq('active', true),
      sections.includes('schedule')
        ? supabase.from('schedules').select('*').gte('week_start', from.toISOString().split('T')[0]).order('week_start').limit(2)
        : Promise.resolve({ data: [] }),
      sections.includes('notifications')
        ? supabase.from('notifications_log').select('*').gte('created_at', fromStr).lte('created_at', toStr).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      sections.includes('trips')
        ? supabase.from('drivers').select('*')
        : Promise.resolve({ data: [] }),
    ])

    const trips = tripsRes.data || []
    const emails = emailsRes.data || []
    const schedules = scheduleRes.data || []
    const notifs = notifRes.data || []

    if (emails.length === 0) {
      return NextResponse.json({ error: 'אין כתובות מייל מוגדרות' }, { status: 400 })
    }

    // חישוב סטטיסטיקות נסיעות
    const completedTrips = trips.filter((t: any) => t.status === 'completed' && t.end_km)
    const totalKm = completedTrips.reduce((s: number, t: any) => s + (t.end_km - t.start_km), 0)
    const byDriver: Record<string, { count: number; km: number }> = {}
    completedTrips.forEach((t: any) => {
      if (!byDriver[t.driver_name]) byDriver[t.driver_name] = { count: 0, km: 0 }
      byDriver[t.driver_name].count++
      byDriver[t.driver_name].km += t.end_km - t.start_km
    })

    // בניית תוכן HTML המייל
    let sectionsHtml = ''

    if (sections.includes('trips')) {
      const driverRows = Object.entries(byDriver)
        .sort((a, b) => b[1].km - a[1].km)
        .map(([name, d]) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${d.count}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${d.km.toLocaleString()}</td>
          </tr>`).join('')

      const tripRows = trips.slice(0, 20).map((t: any) => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${t.driver_name}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${new Date(t.start_time).toLocaleDateString('he-IL')}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${t.start_km?.toLocaleString()}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${t.end_km?.toLocaleString() ?? '—'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${t.end_km ? (t.end_km - t.start_km).toLocaleString() : '—'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${t.notes ?? ''}</td>
        </tr>`).join('')

      sectionsHtml += `
        <div style="margin-bottom:32px">
          <h2 style="font-size:16px;color:#c0392b;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #c0392b">🚗 סיכום נסיעות</h2>
          <div style="display:flex;gap:16px;margin-bottom:20px">
            <div style="flex:1;background:#fff5f5;border:1px solid #fcc;border-radius:8px;padding:14px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:#c0392b">${trips.length}</div>
              <div style="font-size:12px;color:#888;margin-top:4px">סה"כ נסיעות</div>
            </div>
            <div style="flex:1;background:#fff5f5;border:1px solid #fcc;border-radius:8px;padding:14px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:#c0392b">${totalKm.toLocaleString()}</div>
              <div style="font-size:12px;color:#888;margin-top:4px">סה"כ ק"מ</div>
            </div>
            <div style="flex:1;background:#fff5f5;border:1px solid #fcc;border-radius:8px;padding:14px;text-align:center">
              <div style="font-size:24px;font-weight:700;color:#c0392b">${Object.keys(byDriver).length}</div>
              <div style="font-size:12px;color:#888;margin-top:4px">נהגים</div>
            </div>
          </div>
          ${driverRows ? `
          <h3 style="font-size:14px;margin:0 0 10px">ק"מ לפי נהג</h3>
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <thead><tr style="background:#f8f8f8">
              <th style="padding:8px 12px;text-align:right;font-size:12px">נהג</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px">נסיעות</th>
              <th style="padding:8px 12px;text-align:center;font-size:12px">ק"מ</th>
            </tr></thead>
            <tbody>${driverRows}</tbody>
          </table>` : ''}
          ${tripRows ? `
          <h3 style="font-size:14px;margin:0 0 10px">פירוט נסיעות</h3>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f8f8f8">
              <th style="padding:6px 10px;text-align:right;font-size:11px">נהג</th>
              <th style="padding:6px 10px;text-align:right;font-size:11px">תאריך</th>
              <th style="padding:6px 10px;text-align:right;font-size:11px">ק"מ פתיחה</th>
              <th style="padding:6px 10px;text-align:right;font-size:11px">ק"מ סיום</th>
              <th style="padding:6px 10px;text-align:right;font-size:11px">סה"כ</th>
              <th style="padding:6px 10px;text-align:right;font-size:11px">מטרה</th>
            </tr></thead>
            <tbody>${tripRows}</tbody>
          </table>` : ''}
        </div>`
    }

    if (sections.includes('schedule') && schedules.length > 0) {
      const nextSchedule = schedules[0]
      const formatD = (d: string) => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}` }
      sectionsHtml += `
        <div style="margin-bottom:32px">
          <h2 style="font-size:16px;color:#c0392b;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #c0392b">📅 שבצ"ק השבוע הבא</h2>
          <div style="background:#fff5f5;border:1px solid #fcc;border-radius:8px;padding:16px">
            <div style="font-weight:700;margin-bottom:10px">${formatD(nextSchedule.week_start)} — ${formatD(nextSchedule.week_end)}</div>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              ${nextSchedule.commander ? `<tr><td style="padding:5px 0;color:#888;width:140px">מפקד חפ"ק</td><td style="padding:5px 0;font-weight:500">${nextSchedule.commander}</td></tr>` : ''}
              ${nextSchedule.driver ? `<tr><td style="padding:5px 0;color:#888">נהג</td><td style="padding:5px 0;font-weight:500">${nextSchedule.driver}</td></tr>` : ''}
              ${nextSchedule.security ? `<tr><td style="padding:5px 0;color:#888">ביטחון והקמה</td><td style="padding:5px 0">${nextSchedule.security}</td></tr>` : ''}
              ${nextSchedule.standby ? `<tr><td style="padding:5px 0;color:#888">כוננות</td><td style="padding:5px 0">${nextSchedule.standby}</td></tr>` : ''}
            </table>
          </div>
        </div>`
    }

    if (sections.includes('notifications') && notifs.length > 0) {
      const notifRows = notifs.map((n: any) => `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${n.title}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${n.body}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:12px;text-align:center">${n.sent_count}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #f5f5f5;font-size:12px">${new Date(n.created_at).toLocaleDateString('he-IL')}</td>
        </tr>`).join('')
      sectionsHtml += `
        <div style="margin-bottom:32px">
          <h2 style="font-size:16px;color:#c0392b;margin:0 0 16px;padding-bottom:8px;border-bottom:2px solid #c0392b">🔔 התראות שנשלחו</h2>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f8f8f8">
              <th style="padding:6px 10px;text-align:right;font-size:11px">כותרת</th>
              <th style="padding:6px 10px;text-align:right;font-size:11px">תוכן</th>
              <th style="padding:6px 10px;text-align:center;font-size:11px">נשלח ל</th>
              <th style="padding:6px 10px;text-align:right;font-size:11px">תאריך</th>
            </tr></thead>
            <tbody>${notifRows}</tbody>
          </table>
        </div>`
    }

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;direction:rtl">
  <div style="max-width:640px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#c0392b;padding:24px 28px">
      <div style="font-size:20px;font-weight:700;color:#fff">חפ"ק נציב כבאות והצלה</div>
      <div style="font-size:13px;color:rgba(255,255,255,.8);margin-top:4px">סיכום שבועי | ${fromLabel} — ${toLabel}</div>
    </div>
    <div style="padding:28px">
      ${sectionsHtml || '<p style="color:#888;text-align:center">אין נתונים לתקופה זו</p>'}
    </div>
    <div style="background:#f8f8f8;padding:14px 28px;text-align:center;font-size:11px;color:#aaa">
      דוח זה נוצר אוטומטית ע"י מערכת חפ"ק נציב כבאות · ${new Date().toLocaleDateString('he-IL')}
    </div>
  </div>
</body></html>`

    // שלח לכל המיילים דרך Brevo
    const toList = emails.map((e: any) => ({ email: e.email, name: e.name || e.email }))

    const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify({
        sender: { name: 'חפ"ק נציב כבאות', email: process.env.REPORT_FROM_EMAIL },
        to: toList,
        subject: `סיכום שבועי חפ"ק | ${fromLabel} — ${toLabel}`,
        htmlContent: html,
      })
    })

    if (!brevoRes.ok) {
      const err = await brevoRes.json()
      return NextResponse.json({ error: err.message || 'שגיאת Brevo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, sent: emails.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
