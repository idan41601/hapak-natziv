'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = 'chapak2026'

interface Driver { id: string; name: string; rank: string; active: boolean; pin: string | null }
interface SafetyItem { id: string; category: string; text: string; note: string; order_index: number; active: boolean }
interface SopStep { id: string; sop_type: string; title: string; description: string; order_index: number; extra_alert: string | null }
interface SopType { id: string; name: string }
interface Trip { id: string; driver_name: string; start_km: number; end_km: number | null; start_time: string; end_time: string | null; notes: string | null; status: string }
interface VehicleStat { current_km: number; next_service_km: number }
interface NotifTemplate { id: string; title: string; body: string; order_index: number }
interface NotifLog { id: string; title: string; body: string; sent_to: string; sent_count: number; created_at: string }
interface PushSub { id: string; endpoint: string; user_label: string; created_at: string }
interface ReportEmail { id: string; email: string; name: string; active: boolean }
interface Props { onTripClosed?: () => void }

type AdminTab = 'drivers' | 'safety' | 'sop' | 'journal' | 'vehicle' | 'stats' | 'notifications' | 'reports'

export default function AdminTab({ onTripClosed }: Props = {}) {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState(false)
  const [tab, setTab] = useState<AdminTab>('drivers')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [safetyItems, setSafetyItems] = useState<SafetyItem[]>([])
  const [sopSteps, setSopSteps] = useState<SopStep[]>([])
  const [sopTypes, setSopTypes] = useState<SopType[]>([])
  const [sopType, setSopType] = useState<'exterior' | 'interior' | 'mast' | 'exterior2'>('exterior')
  const [editingSopTypeName, setEditingSopTypeName] = useState<string | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [allTrips, setAllTrips] = useState<Trip[]>([])
  const [vehicleStat, setVehicleStat] = useState<VehicleStat | null>(null)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [editingSafety, setEditingSafety] = useState<SafetyItem | null>(null)
  const [editingSop, setEditingSop] = useState<SopStep | null>(null)
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [showAddSafety, setShowAddSafety] = useState(false)
  const [showAddSop, setShowAddSop] = useState(false)
  const [newDriver, setNewDriver] = useState({ name: '', rank: '' })
  const [newSafety, setNewSafety] = useState({ category: 'כללי', text: '', note: '' })
  const [newSop, setNewSop] = useState({ title: '', description: '', extra_alert: '' })
  const [newKm, setNewKm] = useState('')
  const [closingTripId, setClosingTripId] = useState<string | null>(null)
  const [closingTripKm, setClosingTripKm] = useState('')
  const [closingTripName, setClosingTripName] = useState('')
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [editTripFields, setEditTripFields] = useState({ start_km: '', end_km: '', notes: '', destination: '' })
  const [toast, setToast] = useState('')
  // journal filters
  const [journalSearch, setJournalSearch] = useState('')
  const [journalDriver, setJournalDriver] = useState('all')
  // driver history
  const [historyDriver, setHistoryDriver] = useState<Driver | null>(null)
  const [historyTrips, setHistoryTrips] = useState<Trip[]>([])
  // notifications
  const [notifTemplates, setNotifTemplates] = useState<NotifTemplate[]>([])
  const [notifLogs, setNotifLogs] = useState<NotifLog[]>([])
  const [pushSubs, setPushSubs] = useState<PushSub[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isCustomNotif, setIsCustomNotif] = useState(false)
  const [customNotifTitle, setCustomNotifTitle] = useState('')
  const [customNotifBody, setCustomNotifBody] = useState('')
  const [targetAll, setTargetAll] = useState(true)
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set())
  const [editingTemplate, setEditingTemplate] = useState<NotifTemplate | null>(null)
  const [showAddTemplate, setShowAddTemplate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ title: '', body: '' })
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ sent: number } | null>(null)
  const [showNotifLog, setShowNotifLog] = useState(false)
  // reports
  const [reportEmails, setReportEmails] = useState<ReportEmail[]>([])
  const [newReportEmail, setNewReportEmail] = useState({ email: '', name: '' })
  const [showAddEmail, setShowAddEmail] = useState(false)
  const [reportSections, setReportSections] = useState<string[]>(['trips', 'schedule', 'notifications'])
  const [reportDateFrom, setReportDateFrom] = useState('')
  const [reportDateTo, setReportDateTo] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportResult, setReportResult] = useState<string | null>(null)

  useEffect(() => { if (authed) loadAll() }, [authed, tab, sopType])

  const loadAll = useCallback(async () => {
    const [d, s, sop, t, v, all, st, nt, nl, ps] = await Promise.all([
      supabase.from('drivers').select('*').order('name'),
      supabase.from('safety_items').select('*').order('order_index'),
      supabase.from('sop_steps').select('*').eq('sop_type', sopType).order('order_index'),
      supabase.from('trips').select('*').order('start_time', { ascending: false }).limit(100),
      supabase.from('vehicle_stats').select('*').single(),
      supabase.from('trips').select('*').order('start_time', { ascending: false }),
      supabase.from('sop_types').select('*'),
      supabase.from('notification_templates').select('*').order('order_index'),
      supabase.from('notifications_log').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('push_subscriptions').select('*').order('created_at', { ascending: false }),
    ])
    if (d.data) setDrivers(d.data)
    if (s.data) setSafetyItems(s.data)
    if (sop.data) setSopSteps(sop.data)
    if (t.data) setTrips(t.data)
    if (v.data) setVehicleStat(v.data)
    if (all.data) setAllTrips(all.data)
    if (st.data) setSopTypes(st.data)
    if (nt.data) setNotifTemplates(nt.data)
    if (nl.data) setNotifLogs(nl.data)
    if (ps.data) setPushSubs(ps.data)
    const re = await supabase.from('report_emails').select('*').order('created_at')
    if (re.data) setReportEmails(re.data)
  }, [sopType])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, width: '100%', direction: 'rtl', ...extra
  })

  async function addDriver() {
    if (!newDriver.name || !newDriver.rank) return
    await supabase.from('drivers').insert({ name: newDriver.name, rank: newDriver.rank })
    setNewDriver({ name: '', rank: '' }); setShowAddDriver(false); loadAll(); showToast('נהג נוסף ✓')
  }

  async function toggleDriver(d: Driver) {
    await supabase.from('drivers').update({ active: !d.active }).eq('id', d.id)
    loadAll(); showToast(d.active ? 'נהג הושבת' : 'נהג הופעל')
  }

  async function deleteDriver(id: string) {
    if (!confirm('למחוק נהג זה?')) return
    await supabase.from('drivers').delete().eq('id', id)
    loadAll(); showToast('נהג נמחק')
  }

  async function deleteTrip(id: string) {
    if (!confirm('למחוק נסיעה זו לצמיתות?')) return
    await supabase.from('trips').delete().eq('id', id)
    loadAll(); showToast('נסיעה נמחקה')
  }

  async function saveDriver() {
    if (!editingDriver) return
    await supabase.from('drivers').update({ name: editingDriver.name, rank: editingDriver.rank, pin: editingDriver.pin || null }).eq('id', editingDriver.id)
    setEditingDriver(null); loadAll(); showToast('נהג עודכן ✓')
  }

  async function addSafety() {
    if (!newSafety.text) return
    const max = Math.max(...safetyItems.map(i => i.order_index), 0)
    await supabase.from('safety_items').insert({ ...newSafety, order_index: max + 1 })
    setNewSafety({ category: 'כללי', text: '', note: '' }); setShowAddSafety(false); loadAll(); showToast('הנחייה נוספה ✓')
  }

  async function saveSafety() {
    if (!editingSafety) return
    await supabase.from('safety_items').update({ text: editingSafety.text, category: editingSafety.category, note: editingSafety.note }).eq('id', editingSafety.id)
    setEditingSafety(null); loadAll(); showToast('הנחייה עודכנה ✓')
  }

  async function deleteSafety(id: string) {
    if (!confirm('למחוק?')) return
    await supabase.from('safety_items').delete().eq('id', id)
    loadAll(); showToast('נמחק')
  }

  async function addSop() {
    if (!newSop.title) return
    const max = Math.max(...sopSteps.map(s => s.order_index), 0)
    await supabase.from('sop_steps').insert({ ...newSop, extra_alert: newSop.extra_alert || null, sop_type: sopType, order_index: max + 1 })
    setNewSop({ title: '', description: '', extra_alert: '' }); setShowAddSop(false); loadAll(); showToast('שלב נוסף ✓')
  }

  async function saveSop() {
    if (!editingSop) return
    await supabase.from('sop_steps').update({ title: editingSop.title, description: editingSop.description, extra_alert: editingSop.extra_alert || null }).eq('id', editingSop.id)
    setEditingSop(null); loadAll(); showToast('שלב עודכן ✓')
  }

  async function deleteSop(id: string) {
    if (!confirm('למחוק?')) return
    await supabase.from('sop_steps').delete().eq('id', id)
    loadAll(); showToast('נמחק')
  }

  async function moveSop(step: SopStep, dir: 'up' | 'down') {
    const idx = sopSteps.findIndex(s => s.id === step.id)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sopSteps.length) return
    const swap = sopSteps[swapIdx]
    await Promise.all([
      supabase.from('sop_steps').update({ order_index: swap.order_index }).eq('id', step.id),
      supabase.from('sop_steps').update({ order_index: step.order_index }).eq('id', swap.id),
    ])
    loadAll()
  }

  async function saveKm() {
    if (!newKm) return
    await supabase.from('vehicle_stats').update({ current_km: parseInt(newKm), updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
    setNewKm(''); loadAll(); showToast('ק"מ עודכן ✓')
  }

  // ייצוא Excel
  function exportExcel(tripsToExport: Trip[]) {
    const rows = [
      ['נהג', 'תאריך', 'שעת התחלה', 'שעת סיום', 'ק"מ פתיחה', 'ק"מ סיום', 'סה"כ ק"מ', 'מטרה', 'סטטוס'],
      ...tripsToExport.map(t => [
        t.driver_name,
        new Date(t.start_time).toLocaleDateString('he-IL'),
        new Date(t.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        t.end_time ? new Date(t.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '',
        t.start_km,
        t.end_km ?? '',
        t.end_km ? t.end_km - t.start_km : '',
        t.notes ?? '',
        t.status === 'active' ? 'פעיל' : 'הושלם',
      ])
    ]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `יומן_נסיעות_${new Date().toLocaleDateString('he-IL').replace(/\//g, '-')}.csv`
    a.click(); URL.revokeObjectURL(url)
    showToast('Excel יוצא ✓')
  }

  // ייצוא PDF
  function exportPDF(tripsToExport: Trip[]) {
    const rows = tripsToExport.map(t => `
      <tr>
        <td>${t.driver_name}</td>
        <td>${new Date(t.start_time).toLocaleDateString('he-IL')}</td>
        <td>${new Date(t.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${t.end_time ? new Date(t.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
        <td>${t.start_km.toLocaleString()}</td>
        <td>${t.end_km?.toLocaleString() ?? '—'}</td>
        <td>${t.end_km ? (t.end_km - t.start_km).toLocaleString() : '—'}</td>
        <td>${t.notes ?? ''}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
      <title>יומן נסיעות</title>
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        p { color: #666; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #c0392b; color: white; padding: 8px 6px; text-align: right; }
        td { padding: 7px 6px; border-bottom: 1px solid #eee; }
        tr:nth-child(even) td { background: #fafafa; }
      </style></head><body>
      <h1>יומן נסיעות — חפ"ק נציב כבאות</h1>
      <p>הופק בתאריך ${new Date().toLocaleDateString('he-IL')} | סה"כ ${tripsToExport.length} נסיעות</p>
      <table><thead><tr>
        <th>נהג</th><th>תאריך</th><th>התחלה</th><th>סיום</th>
        <th>ק"מ פתיחה</th><th>ק"מ סיום</th><th>סה"כ ק"מ</th><th>מטרה</th>
      </tr></thead><tbody>${rows}</tbody></table>
      </body></html>`
    const w = window.open('', '_blank')!
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 400)
    showToast('PDF נפתח להדפסה ✓')
  }

  async function sendReport() {
    setReportSending(true); setReportResult(null)
    try {
      const res = await fetch('/api/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: reportSections,
          dateFrom: reportDateFrom || undefined,
          dateTo: reportDateTo || undefined,
        })
      })
      const data = await res.json()
      if (data.error) { setReportResult(`שגיאה: ${data.error}`); showToast('שגיאה בשליחה') }
      else { setReportResult(`✓ נשלח ל-${data.sent} כתובות`); showToast(`דוח נשלח ✓`) }
    } catch { setReportResult('שגיאה בשליחה') }
    setReportSending(false)
  }

  async function addReportEmail() {
    if (!newReportEmail.email) return
    await supabase.from('report_emails').insert(newReportEmail)
    setNewReportEmail({ email: '', name: '' }); setShowAddEmail(false); loadAll(); showToast('מייל נוסף ✓')
  }

  async function deleteReportEmail(id: string) {
    await supabase.from('report_emails').delete().eq('id', id)
    loadAll(); showToast('נמחק')
  }

  function toggleSection(s: string) {
    setReportSections(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  // פונקציות התראות
  async function sendNotification() {
    const title = isCustomNotif ? customNotifTitle : notifTemplates.find(t => t.id === selectedTemplate)?.title
    const body = isCustomNotif ? customNotifBody : notifTemplates.find(t => t.id === selectedTemplate)?.body
    if (!title || !body) { showToast('בחר הודעה'); return }
    setSending(true); setSendResult(null)
    const targetEndpoints = targetAll ? [] : pushSubs.filter(s => selectedSubs.has(s.id)).map(s => s.endpoint)
    try {
      const res = await fetch('/api/push-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, targetEndpoints }),
      })
      const data = await res.json()
      setSendResult({ sent: data.sent || 0 })
      loadAll(); showToast(`נשלח ל-${data.sent} מכשירים ✓`)
    } catch { showToast('שגיאה בשליחה') }
    setSending(false)
  }

  async function saveTemplate() {
    if (!editingTemplate) return
    await supabase.from('notification_templates').update({ title: editingTemplate.title, body: editingTemplate.body }).eq('id', editingTemplate.id)
    setEditingTemplate(null); loadAll(); showToast('תבנית עודכנה ✓')
  }

  async function addTemplate() {
    if (!newTemplate.title || !newTemplate.body) return
    const max = Math.max(...notifTemplates.map(t => t.order_index), 0)
    await supabase.from('notification_templates').insert({ ...newTemplate, order_index: max + 1 })
    setNewTemplate({ title: '', body: '' }); setShowAddTemplate(false); loadAll(); showToast('תבנית נוספה ✓')
  }

  async function deleteTemplate(id: string) {
    if (!confirm('למחוק תבנית זו?')) return
    await supabase.from('notification_templates').delete().eq('id', id)
    loadAll(); showToast('נמחק')
  }

  async function deletePushSub(id: string) {
    if (!confirm('למחוק מנוי זה?')) return
    await supabase.from('push_subscriptions').delete().eq('id', id)
    loadAll(); showToast('מנוי נמחק')
  }

  // סטטיסטיקות
  function calcStats(tripList: Trip[]) {
    const done = tripList.filter(t => t.status === 'completed' && t.end_km)
    const totalKm = done.reduce((s, t) => s + (t.end_km! - t.start_km), 0)
    const byDriver: Record<string, { count: number; km: number }> = {}
    done.forEach(t => {
      if (!byDriver[t.driver_name]) byDriver[t.driver_name] = { count: 0, km: 0 }
      byDriver[t.driver_name].count++
      byDriver[t.driver_name].km += t.end_km! - t.start_km
    })
    const topDriver = Object.entries(byDriver).sort((a, b) => b[1].km - a[1].km)[0]
    return { totalKm, totalTrips: tripList.length, doneTrips: done.length, topDriver, byDriver }
  }

  // פילטור יומן
  const filteredTrips = trips.filter(t => {
    const matchSearch = !journalSearch ||
      t.driver_name.includes(journalSearch) ||
      (t.notes ?? '').includes(journalSearch)
    const matchDriver = journalDriver === 'all' || t.driver_name === journalDriver
    return matchSearch && matchDriver
  })

  const pad: React.CSSProperties = { padding: 14 }
  const card: React.CSSProperties = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }

  if (!authed) return (
    <div style={pad}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>כניסת מנהל</div>
      <div style={card}>
        <div style={{ fontSize: 15, fontWeight: 600, textAlign: 'center', marginBottom: 20 }}>🔒 כניסת אדמין</div>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>סיסמה</label>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (pw === ADMIN_PASSWORD ? (setAuthed(true), setPwErr(false)) : setPwErr(true))}
          placeholder="הכנס סיסמה" style={{ ...inp(), marginBottom: 14 }} />
        {pwErr && <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', marginBottom: 8 }}>סיסמה שגויה</div>}
        <button onClick={() => pw === ADMIN_PASSWORD ? (setAuthed(true), setPwErr(false)) : setPwErr(true)}
          style={{ width: '100%', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 0', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          כניסה
        </button>
      </div>
    </div>
  )

  // מסך היסטוריה לפי נהג
  if (historyDriver) {
    const driverTrips = allTrips.filter(t => t.driver_name === historyDriver.name && t.status === 'completed' && t.end_km)
    const totalKm = driverTrips.reduce((s, t) => s + (t.end_km! - t.start_km), 0)
    return (
      <div style={pad}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={() => setHistoryDriver(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>›</button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{historyDriver.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{historyDriver.rank}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{driverTrips.length}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>נסיעות</div>
          </div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--red)' }}>{totalKm.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>סה"כ ק"מ</div>
          </div>
        </div>
        {driverTrips.length === 0 && <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 30 }}>אין נסיעות עדיין</div>}
        {driverTrips.map(trip => (
          <div key={trip.id} style={card}>
            <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <span>📅 {new Date(trip.start_time).toLocaleDateString('he-IL')}</span>
              <span>🕐 {new Date(trip.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span>📍 {trip.start_km.toLocaleString()} ← {trip.end_km!.toLocaleString()} ק"מ</span>
              <span>🛣️ {(trip.end_km! - trip.start_km).toLocaleString()} ק"מ</span>
            </div>
            {trip.notes && <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 6 }}>{trip.notes}</div>}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={() => exportExcel(driverTrips)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '11px 0', fontSize: 12, cursor: 'pointer' }}>📊 Excel</button>
          <button onClick={() => exportPDF(driverTrips)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '11px 0', fontSize: 12, cursor: 'pointer' }}>🖨️ PDF</button>
        </div>
      </div>
    )
  }

  return (
    <div style={pad}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#1a1a18', color: '#fff', padding: '10px 18px', borderRadius: 20, fontSize: 13, zIndex: 200, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>ניהול מערכת</div>
        <button onClick={() => setAuthed(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>יציאה</button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 14, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[['drivers', '👤', 'נהגים'], ['safety', '✅', 'בטיחות'], ['sop', '📋', 'סד"פים'], ['journal', '📒', 'יומן'], ['stats', '📊', 'סטטיסטיקות'], ['notifications', '🔔', 'התראות'], ['reports', '📧', 'דוחות'], ['vehicle', '🚗', 'רכב']].map(([val, icon, label]) => (
          <button key={val} onClick={() => setTab(val as AdminTab)}
            style={{ flexShrink: 0, background: tab === val ? 'var(--red)' : 'var(--bg)', border: `1px solid ${tab === val ? 'var(--red)' : 'var(--border)'}`, color: tab === val ? '#fff' : 'var(--muted)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* DRIVERS */}
      {tab === 'drivers' && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>👤 נהגים מורשים</div>
            <button onClick={() => setShowAddDriver(!showAddDriver)} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ הוסף</button>
          </div>
          {showAddDriver && (
            <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <input value={newDriver.name} onChange={e => setNewDriver(p => ({ ...p, name: e.target.value }))} placeholder="שם מלא" style={{ ...inp(), marginBottom: 8 }} />
              <input value={newDriver.rank} onChange={e => setNewDriver(p => ({ ...p, rank: e.target.value }))} placeholder="דרגה" style={{ ...inp(), marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addDriver} style={{ flex: 1, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>הוסף</button>
                <button onClick={() => setShowAddDriver(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
              </div>
            </div>
          )}
          {drivers.map((d, i) => (
            <div key={d.id}>
              {editingDriver?.id === d.id ? (
                <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <input value={editingDriver.name} onChange={e => setEditingDriver(p => p ? { ...p, name: e.target.value } : p)} style={{ ...inp(), marginBottom: 8 }} />
                  <input value={editingDriver.rank} onChange={e => setEditingDriver(p => p ? { ...p, rank: e.target.value } : p)} style={{ ...inp(), marginBottom: 8 }} />
                  <input value={editingDriver.pin || ''} onChange={e => setEditingDriver(p => p ? { ...p, pin: e.target.value } : p)} placeholder="PIN (4 ספרות)" maxLength={4} style={{ ...inp(), marginBottom: 8, direction: 'ltr', textAlign: 'center', letterSpacing: 6, fontWeight: 600 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveDriver} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>שמור</button>
                    <button onClick={() => setEditingDriver(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < drivers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { setHistoryDriver(d) }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{d.rank}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span onClick={() => toggleDriver(d)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 500, cursor: 'pointer', background: d.active ? 'var(--green-bg)' : 'var(--bg3)', color: d.active ? 'var(--green)' : 'var(--muted)', border: `1px solid ${d.active ? 'var(--green-border)' : 'var(--border)'}` }}>
                      {d.active ? 'פעיל' : 'מושבת'}
                    </span>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 500, background: d.pin ? 'var(--amber-bg)' : 'var(--bg3)', color: d.pin ? 'var(--amber)' : 'var(--muted)', border: `1px solid ${d.pin ? 'var(--amber-border)' : 'var(--border)'}` }}>
                      {d.pin ? '🔑 PIN' : 'אין PIN'}
                    </span>
                    <button onClick={() => setEditingDriver(d)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 7px', fontSize: 13, cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => deleteDriver(d.id)} style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 6, padding: '4px 7px', fontSize: 13, cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* SAFETY */}
      {tab === 'safety' && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>✅ הנחיות בטיחות</div>
            <button onClick={() => setShowAddSafety(!showAddSafety)} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ הוסף</button>
          </div>
          {showAddSafety && (
            <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <input value={newSafety.category} onChange={e => setNewSafety(p => ({ ...p, category: e.target.value }))} placeholder="קטגוריה" style={{ ...inp(), marginBottom: 8 }} />
              <textarea value={newSafety.text} onChange={e => setNewSafety(p => ({ ...p, text: e.target.value }))} placeholder="טקסט ההנחייה" rows={2} style={{ ...inp({ resize: 'none' }), marginBottom: 8 }} />
              <input value={newSafety.note} onChange={e => setNewSafety(p => ({ ...p, note: e.target.value }))} placeholder="הערה (אופציונלי)" style={{ ...inp(), marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={addSafety} style={{ flex: 1, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>הוסף</button>
                <button onClick={() => setShowAddSafety(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
              </div>
            </div>
          )}
          {safetyItems.map((item, i) => (
            <div key={item.id}>
              {editingSafety?.id === item.id ? (
                <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  <input value={editingSafety.category} onChange={e => setEditingSafety(p => p ? { ...p, category: e.target.value } : p)} placeholder="קטגוריה" style={{ ...inp(), marginBottom: 8 }} />
                  <textarea value={editingSafety.text} onChange={e => setEditingSafety(p => p ? { ...p, text: e.target.value } : p)} rows={2} style={{ ...inp({ resize: 'none' }), marginBottom: 8 }} />
                  <input value={editingSafety.note} onChange={e => setEditingSafety(p => p ? { ...p, note: e.target.value } : p)} placeholder="הערה" style={{ ...inp(), marginBottom: 8 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={saveSafety} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>שמור</button>
                    <button onClick={() => setEditingSafety(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < safetyItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ flex: 1 }}>
                    {item.category && <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 500, marginBottom: 2 }}>{item.category}</div>}
                    <div style={{ fontSize: 13 }}>{item.text}</div>
                    {item.note && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.note}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginRight: 8 }}>
                    <button onClick={() => setEditingSafety(item)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 7px', fontSize: 13, cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => deleteSafety(item.id)} style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 6, padding: '4px 7px', fontSize: 13, cursor: 'pointer' }}>🗑</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'sop' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {([['exterior', 'חוץ'], ['interior', 'פנים'], ['mast', 'תורן'], ['exterior2', 'השלמת חוץ']] as [typeof sopType, string][]).map(([val, label]) => (
              <button key={val} onClick={() => setSopType(val)}
                style={{ flex: 1, background: sopType === val ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${sopType === val ? 'var(--red)' : 'var(--border)'}`, color: sopType === val ? '#fff' : 'var(--muted)', borderRadius: 7, padding: '7px 0', fontSize: 12, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
          {/* עריכת שם הסד"פ */}
          {editingSopTypeName !== null ? (
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8, padding: 10, marginBottom: 10, display: 'flex', gap: 8 }}>
              <input value={editingSopTypeName} onChange={e => setEditingSopTypeName(e.target.value)}
                style={{ flex: 1, background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 7, padding: '8px 10px', fontSize: 13, direction: 'rtl' }} />
              <button onClick={async () => {
                await supabase.from('sop_types').update({ name: editingSopTypeName }).eq('id', sopType)
                setEditingSopTypeName(null); loadAll(); showToast('שם עודכן ✓')
              }} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>שמור</button>
              <button onClick={() => setEditingSopTypeName(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 10px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                שם: <strong style={{ color: 'var(--text)' }}>{sopTypes.find(t => t.id === sopType)?.name ?? sopType}</strong>
              </div>
              <button onClick={() => setEditingSopTypeName(sopTypes.find(t => t.id === sopType)?.name ?? '')}
                style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>✏️ שנה שם</button>
            </div>
          )}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>📋 שלבי הסד&quot;פ</div>
              <button onClick={() => setShowAddSop(!showAddSop)} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ הוסף</button>
            </div>
            {showAddSop && (
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <input value={newSop.title} onChange={e => setNewSop(p => ({ ...p, title: e.target.value }))} placeholder="כותרת השלב" style={{ ...inp(), marginBottom: 8 }} />
                <textarea value={newSop.description} onChange={e => setNewSop(p => ({ ...p, description: e.target.value }))} placeholder="תיאור" rows={2} style={{ ...inp({ resize: 'none' }), marginBottom: 8 }} />
                <input value={newSop.extra_alert} onChange={e => setNewSop(p => ({ ...p, extra_alert: e.target.value }))} placeholder="⚠️ התראה לפני שלב זה (אופציונלי)" style={{ ...inp(), marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addSop} style={{ flex: 1, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>הוסף</button>
                  <button onClick={() => setShowAddSop(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
                </div>
              </div>
            )}
            {sopSteps.map((step, i) => (
              <div key={step.id}>
                {editingSop?.id === step.id ? (
                  <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: 12, marginBottom: 8 }}>
                    <input value={editingSop.title} onChange={e => setEditingSop(p => p ? { ...p, title: e.target.value } : p)} style={{ ...inp(), marginBottom: 8 }} />
                    <textarea value={editingSop.description} onChange={e => setEditingSop(p => p ? { ...p, description: e.target.value } : p)} rows={3} style={{ ...inp({ resize: 'none' }), marginBottom: 8 }} />
                    <input value={editingSop.extra_alert || ''} onChange={e => setEditingSop(p => p ? { ...p, extra_alert: e.target.value } : p)} placeholder="⚠️ התראה לפני שלב זה (אופציונלי)" style={{ ...inp(), marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={saveSop} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>שמור</button>
                      <button onClick={() => setEditingSop(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 0', borderBottom: i < sopSteps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{step.title}</div>
                      {step.description && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{step.description}</div>}
                      {step.extra_alert && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4, fontWeight: 500 }}>⚠️ {step.extra_alert}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                      {i > 0 && <button onClick={() => moveSop(step, 'up')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 5, padding: '3px 6px', fontSize: 11, cursor: 'pointer' }}>↑</button>}
                      {i < sopSteps.length - 1 && <button onClick={() => moveSop(step, 'down')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 5, padding: '3px 6px', fontSize: 11, cursor: 'pointer' }}>↓</button>}
                      <button onClick={() => setEditingSop(step)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 5, padding: '3px 6px', fontSize: 12, cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => deleteSop(step.id)} style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 5, padding: '3px 6px', fontSize: 12, cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JOURNAL */}
      {tab === 'journal' && (
        <div>
          {/* חיפוש + פילטר */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={journalSearch}
              onChange={e => setJournalSearch(e.target.value)}
              placeholder="🔍 חיפוש..."
              style={{ ...inp({ flex: 1, marginBottom: 0 }) }}
            />
            <select
              value={journalDriver}
              onChange={e => setJournalDriver(e.target.value)}
              style={{ ...inp({ width: 'auto', flex: 1, marginBottom: 0 }) }}
            >
              <option value="all">כל הנהגים</option>
              {drivers.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          {/* ייצוא */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => exportExcel(filteredTrips)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '9px 0', fontSize: 12, cursor: 'pointer' }}>📊 ייצוא Excel</button>
            <button onClick={() => exportPDF(filteredTrips)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '9px 0', fontSize: 12, cursor: 'pointer' }}>🖨️ ייצוא PDF</button>
          </div>
          {filteredTrips.length === 0 && <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 30 }}>אין נסיעות</div>}
          {filteredTrips.map(trip => (
            <div key={trip.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{trip.driver_name}</div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500, background: trip.status === 'active' ? 'var(--amber-bg)' : 'var(--green-bg)', color: trip.status === 'active' ? 'var(--amber)' : 'var(--green)', border: `1px solid ${trip.status === 'active' ? 'var(--amber-border)' : 'var(--green-border)'}` }}>
                  {trip.status === 'active' ? 'פעיל' : 'הושלם'}
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>📅 {new Date(trip.start_time).toLocaleDateString('he-IL')}</span>
                <span>🕐 {new Date(trip.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>📍 {trip.start_km?.toLocaleString()}{trip.end_km ? ` ← ${trip.end_km.toLocaleString()} ק"מ` : ' ק"מ'}</span>
                {trip.end_km && <span>🛣️ {(trip.end_km - trip.start_km).toLocaleString()} ק&quot;מ</span>}
              </div>
              {trip.notes && <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', lineHeight: 1.5 }}>{trip.notes}</div>}
              {trip.status !== 'active' && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditingTrip(trip); setEditTripFields({ start_km: String(trip.start_km || ''), end_km: String(trip.end_km || ''), notes: trip.notes || '', destination: '' }) }}
                      style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      ✏️ ערוך נסיעה
                    </button>
                    <button onClick={() => deleteTrip(trip.id)}
                      style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 8, padding: '9px 12px', fontSize: 13, cursor: 'pointer' }}>
                      🗑
                    </button>
                  </div>
                </div>
              )}
              {trip.status === 'active' && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setClosingTripId(trip.id); setClosingTripName(trip.driver_name); setClosingTripKm('') }}
                      style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      🔴 סגור ידנית
                    </button>
                    <button onClick={() => { setEditingTrip(trip); setEditTripFields({ start_km: String(trip.start_km || ''), end_km: String(trip.end_km || ''), notes: trip.notes || '', destination: '' }) }}
                      style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      ✏️ ערוך
                    </button>
                    <button onClick={() => deleteTrip(trip.id)}
                      style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 8, padding: '9px 12px', fontSize: 13, cursor: 'pointer' }}>
                      🗑
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* STATS */}
      {tab === 'stats' && (() => {
        const s = calcStats(allTrips)
        const driverList = Object.entries(s.byDriver).sort((a, b) => b[1].km - a[1].km)
        return (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--red)' }}>{s.totalTrips}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>סה"כ נסיעות</div>
              </div>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--red)' }}>{s.totalKm.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>סה"כ ק"מ</div>
              </div>
            </div>
            {s.topDriver && (
              <div style={{ ...card, background: 'var(--red-bg)', border: '1px solid var(--red-border)', marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>🏆 נהג מוביל</div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{s.topDriver[0]}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{s.topDriver[1].count} נסיעות · {s.topDriver[1].km.toLocaleString()} ק"מ</div>
              </div>
            )}
            <div style={card}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📊 ק"מ לפי נהג</div>
              {driverList.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: 16 }}>אין נתונים עדיין</div>}
              {driverList.map(([name, data], i) => {
                const maxKm = driverList[0]?.[1].km || 1
                return (
                  <div key={name} style={{ marginBottom: i < driverList.length - 1 ? 14 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{data.count} נסיעות · {data.km.toLocaleString()} ק"מ</div>
                    </div>
                    <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 7, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--red)', borderRadius: 4, width: `${(data.km / maxKm) * 100}%`, transition: 'width .4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => exportExcel(allTrips)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '11px 0', fontSize: 12, cursor: 'pointer' }}>📊 ייצוא Excel</button>
              <button onClick={() => exportPDF(allTrips)} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '11px 0', fontSize: 12, cursor: 'pointer' }}>🖨️ ייצוא PDF</button>
            </div>
          </div>
        )
      })()}

      {/* NOTIFICATIONS */}
      {tab === 'notifications' && (
        <div>
          {/* מנויים */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
              📱 מנויים פעילים
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)', marginRight: 8 }}>{pushSubs.length} מכשירים</span>
            </div>
            {pushSubs.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>אין מנויים עדיין</div>
            ) : pushSubs.map(sub => (
              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                {!targetAll && (
                  <input type="checkbox" checked={selectedSubs.has(sub.id)}
                    onChange={e => { const n = new Set(selectedSubs); e.target.checked ? n.add(sub.id) : n.delete(sub.id); setSelectedSubs(n) }}
                    style={{ width: 16, height: 16, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, fontSize: 13 }}>{sub.user_label}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{new Date(sub.created_at).toLocaleDateString('he-IL')}</div>
                <button onClick={() => deletePushSub(sub.id)}
                  style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 6, padding: '3px 7px', fontSize: 12, cursor: 'pointer' }}>🗑</button>
              </div>
            ))}
          </div>

          {/* נמענים */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>👥 למי לשלוח</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setTargetAll(true); setSelectedSubs(new Set()) }}
                style={{ flex: 1, background: targetAll ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${targetAll ? 'var(--red)' : 'var(--border)'}`, color: targetAll ? '#fff' : 'var(--muted)', borderRadius: 8, padding: '9px 0', fontSize: 12, cursor: 'pointer' }}>
                🌐 לכולם ({pushSubs.length})
              </button>
              <button onClick={() => setTargetAll(false)}
                style={{ flex: 1, background: !targetAll ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${!targetAll ? 'var(--red)' : 'var(--border)'}`, color: !targetAll ? '#fff' : 'var(--muted)', borderRadius: 8, padding: '9px 0', fontSize: 12, cursor: 'pointer' }}>
                ✋ נבחרים {!targetAll && selectedSubs.size > 0 ? `(${selectedSubs.size})` : ''}
              </button>
            </div>
          </div>

          {/* תבניות הודעות */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>💬 תוכן ההתראה</div>
              <button onClick={() => setShowAddTemplate(!showAddTemplate)}
                style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>+ תבנית</button>
            </div>

            {/* טאבים */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <button onClick={() => setIsCustomNotif(false)}
                style={{ flex: 1, background: !isCustomNotif ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${!isCustomNotif ? 'var(--red)' : 'var(--border)'}`, color: !isCustomNotif ? '#fff' : 'var(--muted)', borderRadius: 7, padding: '7px 0', fontSize: 12, cursor: 'pointer' }}>
                תבניות
              </button>
              <button onClick={() => setIsCustomNotif(true)}
                style={{ flex: 1, background: isCustomNotif ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${isCustomNotif ? 'var(--red)' : 'var(--border)'}`, color: isCustomNotif ? '#fff' : 'var(--muted)', borderRadius: 7, padding: '7px 0', fontSize: 12, cursor: 'pointer' }}>
                חופשי
              </button>
            </div>

            {/* הוספת תבנית */}
            {showAddTemplate && (
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <input value={newTemplate.title} onChange={e => setNewTemplate(p => ({ ...p, title: e.target.value }))}
                  placeholder="כותרת (לדוגמה: 🚨 כינוס)" style={{ ...inp(), marginBottom: 8 }} />
                <textarea value={newTemplate.body} onChange={e => setNewTemplate(p => ({ ...p, body: e.target.value }))}
                  placeholder="תוכן ההתראה..." rows={2} style={{ ...inp({ resize: 'none' }), marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addTemplate} style={{ flex: 1, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>הוסף</button>
                  <button onClick={() => setShowAddTemplate(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
                </div>
              </div>
            )}

            {!isCustomNotif ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {notifTemplates.map(t => (
                  <div key={t.id}>
                    {editingTemplate?.id === t.id ? (
                      <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: 10 }}>
                        <input value={editingTemplate.title} onChange={e => setEditingTemplate(p => p ? { ...p, title: e.target.value } : p)}
                          style={{ ...inp(), marginBottom: 8 }} />
                        <textarea value={editingTemplate.body} onChange={e => setEditingTemplate(p => p ? { ...p, body: e.target.value } : p)}
                          rows={2} style={{ ...inp({ resize: 'none' }), marginBottom: 8 }} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={saveTemplate} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 0', fontSize: 12, cursor: 'pointer' }}>שמור</button>
                          <button onClick={() => setEditingTemplate(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '7px 10px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => !editingTemplate && setSelectedTemplate(t.id)}
                        style={{ padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${selectedTemplate === t.id ? 'var(--red)' : 'var(--border)'}`, background: selectedTemplate === t.id ? 'var(--red-bg)' : 'var(--bg2)', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: selectedTemplate === t.id ? 'var(--red)' : 'var(--text)' }}>{t.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{t.body}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginRight: 8 }}>
                            <button onClick={e => { e.stopPropagation(); setEditingTemplate(t) }}
                              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 5, padding: '3px 6px', fontSize: 11, cursor: 'pointer' }}>✏️</button>
                            <button onClick={e => { e.stopPropagation(); deleteTemplate(t.id) }}
                              style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 5, padding: '3px 6px', fontSize: 11, cursor: 'pointer' }}>🗑</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <input value={customNotifTitle} onChange={e => setCustomNotifTitle(e.target.value)}
                  placeholder="כותרת" style={{ ...inp(), marginBottom: 8 }} />
                <textarea value={customNotifBody} onChange={e => setCustomNotifBody(e.target.value)}
                  placeholder="תוכן ההתראה..." rows={3} style={{ ...inp({ resize: 'none' }) }} />
              </div>
            )}
          </div>

          {/* תצוגה מקדימה */}
          {(() => {
            const t = isCustomNotif ? customNotifTitle : notifTemplates.find(t => t.id === selectedTemplate)?.title
            const b = isCustomNotif ? customNotifBody : notifTemplates.find(t => t.id === selectedTemplate)?.body
            return t && b ? (
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>תצוגה מקדימה</div>
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{b}</div>
                </div>
              </div>
            ) : null
          })()}

          {/* כפתור שליחה */}
          <button onClick={sendNotification} disabled={sending}
            style={{ width: '100%', background: sending ? 'var(--bg3)' : 'var(--red)', color: sending ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 14, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
            {sending ? '⏳ שולח...' : `🔔 שלח התראה${targetAll ? ` לכולם (${pushSubs.length})` : selectedSubs.size > 0 ? ` ל-${selectedSubs.size} נבחרים` : ''}`}
          </button>

          {sendResult && (
            <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>✓ נשלח ל-{sendResult.sent} מכשירים</div>
            </div>
          )}

          {/* יומן */}
          <button onClick={() => setShowNotifLog(!showNotifLog)}
            style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)', borderRadius: 10, padding: '11px 0', fontSize: 12, cursor: 'pointer', marginBottom: showNotifLog ? 10 : 0 }}>
            {showNotifLog ? '▲' : '▼'} יומן התראות ({notifLogs.length})
          </button>
          {showNotifLog && notifLogs.map(log => (
            <div key={log.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{log.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(log.created_at).toLocaleDateString('he-IL')}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>{log.body}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>נשלח ל: {log.sent_to} · {log.sent_count} מכשירים</div>
            </div>
          ))}
        </div>
      )}

      {/* REPORTS */}
      {tab === 'reports' && (
        <div>
          {/* רשימת מיילים */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>📧 רשימת נמענים</div>
              <button onClick={() => setShowAddEmail(!showAddEmail)}
                style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>+ הוסף</button>
            </div>
            {showAddEmail && (
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <input value={newReportEmail.name} onChange={e => setNewReportEmail(p => ({ ...p, name: e.target.value }))}
                  placeholder="שם (אופציונלי)" style={{ ...inp(), marginBottom: 6 }} />
                <input value={newReportEmail.email} onChange={e => setNewReportEmail(p => ({ ...p, email: e.target.value }))}
                  placeholder="כתובת מייל" type="email" style={{ ...inp({ direction: 'ltr' }), marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={addReportEmail} style={{ flex: 1, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>הוסף</button>
                  <button onClick={() => setShowAddEmail(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
                </div>
              </div>
            )}
            {reportEmails.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '10px 0' }}>אין נמענים עדיין</div>
            ) : reportEmails.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{e.name || e.email}</div>
                  {e.name && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.email}</div>}
                </div>
                <button onClick={() => deleteReportEmail(e.id)}
                  style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 6, padding: '3px 7px', fontSize: 12, cursor: 'pointer' }}>🗑</button>
              </div>
            ))}
          </div>

          {/* בחירת תוכן */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>📋 תוכן הדוח</div>
            {[
              { id: 'trips', label: '🚗 נסיעות השבוע', desc: 'כמות, ק"מ, נהגים' },
              { id: 'schedule', label: '📅 שבצ"ק השבוע הבא', desc: 'מפקד, נהג, כוננות' },
              { id: 'notifications', label: '🔔 התראות שנשלחו', desc: 'כל ההתראות בתקופה' },
            ].map(s => (
              <div key={s.id} onClick={() => toggleSection(s.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${reportSections.includes(s.id) ? 'var(--red)' : 'var(--border)'}`, background: reportSections.includes(s.id) ? 'var(--red-bg)' : 'var(--bg2)', cursor: 'pointer', marginBottom: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${reportSections.includes(s.id) ? 'var(--red)' : 'var(--border2)'}`, background: reportSections.includes(s.id) ? 'var(--red)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {reportSections.includes(s.id) && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* בחירת תקופה */}
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>📆 תקופה</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>ריק = שבוע אחרון אוטומטית</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>מתאריך</div>
                <input type="date" value={reportDateFrom} onChange={e => setReportDateFrom(e.target.value)}
                  style={{ ...inp({ direction: 'ltr' }) }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>עד תאריך</div>
                <input type="date" value={reportDateTo} onChange={e => setReportDateTo(e.target.value)}
                  style={{ ...inp({ direction: 'ltr' }) }} />
              </div>
            </div>
          </div>

          {/* שליחה */}
          <button onClick={sendReport} disabled={reportSending || reportEmails.length === 0 || reportSections.length === 0}
            style={{ width: '100%', background: reportSending ? 'var(--bg3)' : 'var(--red)', color: reportSending ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 14, fontWeight: 600, cursor: reportSending ? 'not-allowed' : 'pointer', marginBottom: 10 }}>
            {reportSending ? '⏳ שולח...' : `📧 שלח דוח ל-${reportEmails.length} נמענים`}
          </button>

          {reportResult && (
            <div style={{ background: reportResult.startsWith('שגיאה') ? 'var(--red-bg)' : 'var(--green-bg)', border: `1px solid ${reportResult.startsWith('שגיאה') ? 'var(--red-border)' : 'var(--green-border)'}`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: reportResult.startsWith('שגיאה') ? 'var(--red)' : 'var(--green)' }}>{reportResult}</div>
            </div>
          )}

          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginTop: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.7 }}>
              🕐 <strong>שליחה אוטומטית:</strong> כל יום ראשון בבוקר נשלח דוח אוטומטי עם נתוני השבוע שחלף לכל הנמענים ברשימה.
            </div>
          </div>
        </div>
      )}

      {/* VEHICLE */}
      {tab === 'vehicle' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600 }}>{vehicleStat?.current_km.toLocaleString() ?? '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>ק&quot;מ נוכחי</div>
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--amber)' }}>
                {vehicleStat ? (vehicleStat.next_service_km - vehicleStat.current_km).toLocaleString() : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>ק&quot;מ לטיפול</div>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>עדכון ק&quot;מ</div>
            <input type="number" value={newKm} onChange={e => setNewKm(e.target.value)}
              placeholder={String(vehicleStat?.current_km ?? '')}
              style={{ ...inp({ direction: 'ltr', textAlign: 'right' }), marginBottom: 10 }} />
            <button onClick={saveKm} disabled={!newKm}
              style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '11px 0', fontSize: 13, cursor: 'pointer' }}>
              💾 שמור
            </button>
          </div>
        </div>
      )}

      {/* MODAL - עריכת נסיעה */}
      {editingTrip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', padding: '20px 18px 30px', width: '100%', maxWidth: 390 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>✏️ עריכת נסיעה</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{editingTrip?.driver_name}</div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>ק"מ פתיחה</label>
            <input type="number" value={editTripFields.start_km} onChange={e => setEditTripFields(p => ({ ...p, start_km: e.target.value }))}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '10px 13px', width: '100%', fontSize: 14, marginBottom: 10, direction: 'ltr', textAlign: 'right' }} />
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>ק"מ סיום</label>
            <input type="number" value={editTripFields.end_km} onChange={e => setEditTripFields(p => ({ ...p, end_km: e.target.value }))}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '10px 13px', width: '100%', fontSize: 14, marginBottom: 10, direction: 'ltr', textAlign: 'right' }} />
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>מטרת נסיעה</label>
            <input type="text" value={editTripFields.notes} onChange={e => setEditTripFields(p => ({ ...p, notes: e.target.value }))}
              placeholder="לדוגמה: אירוע מבצעי, תרגיל..."
              style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '10px 13px', width: '100%', fontSize: 14, marginBottom: 10, direction: 'rtl' }} />
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>יעד</label>
            <input type="text" value={editTripFields.destination} onChange={e => setEditTripFields(p => ({ ...p, destination: e.target.value }))}
              placeholder="לדוגמה: תחנה מרכזית, רח' הרצל..."
              style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '10px 13px', width: '100%', fontSize: 14, marginBottom: 16, direction: 'rtl' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  const updates: any = {}
                  if (editTripFields.start_km) updates.start_km = parseInt(editTripFields.start_km)
                  if (editTripFields.end_km) updates.end_km = parseInt(editTripFields.end_km)
                  const fullNote = [editTripFields.notes, editTripFields.destination ? `יעד: ${editTripFields.destination}` : ''].filter(Boolean).join(' · ')
                  if (fullNote) updates.notes = fullNote
                  await supabase.from('trips').update(updates).eq('id', editingTrip!.id)
                  setEditingTrip(null); loadAll(); showToast('נסיעה עודכנה ✓')
                }}
                style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                ✓ שמור שינויים
              </button>
              <button onClick={() => setEditingTrip(null)}
                style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '12px 16px', fontSize: 12, cursor: 'pointer' }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - סגירת נסיעה ידנית */}
      {closingTripId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', padding: '20px 18px 30px', width: '100%', maxWidth: 390 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>🔴 סגירת נסיעה ידנית</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>{closingTripName}</div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>ק"מ בסיום הנסיעה</label>
            <input type="number" value={closingTripKm} onChange={e => setClosingTripKm(e.target.value)}
              placeholder="הכנס ק&quot;מ נוכחי"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '11px 13px', width: '100%', fontSize: 15, marginBottom: 14, direction: 'ltr', textAlign: 'right' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={async () => {
                  if (!closingTripKm) return
                  await supabase.from('trips').update({ status: 'completed', end_time: new Date().toISOString(), end_km: parseInt(closingTripKm) }).eq('id', closingTripId)
                  await supabase.from('vehicle_stats').update({ current_km: parseInt(closingTripKm), updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
                  setClosingTripId(null); setClosingTripKm(''); loadAll(); showToast('נסיעה נסגרה ✓')
                  if (onTripClosed) onTripClosed()
                }}
                disabled={!closingTripKm}
                style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: closingTripKm ? 1 : .4 }}>
                ✓ אשר סגירה
              </button>
              <button onClick={() => setClosingTripId(null)}
                style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '12px 16px', fontSize: 12, cursor: 'pointer' }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
                                                                              
