'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface VehicleStat { current_km: number; next_service_km: number }
interface MaintenanceItem { id: string; name: string; interval_km: number | null; interval_months: number | null; last_done_km: number; last_done_date: string | null; notes: string }
interface Trip { id: string; driver_name: string; start_km: number; end_km: number; start_time: string; end_time: string }

export default function VehiclePage({ onKmUpdate }: { onKmUpdate: () => void }) {
  const [stats, setStats] = useState<VehicleStat | null>(null)
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [newKm, setNewKm] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [s, m, t] = await Promise.all([
      supabase.from('vehicle_stats').select('*').single(),
      supabase.from('maintenance_items').select('*').order('name'),
      supabase.from('trips').select('*').eq('status', 'completed').order('end_time', { ascending: false }).limit(10)
    ])
    if (s.data) setStats(s.data)
    if (m.data) setMaintenance(m.data)
    if (t.data) setTrips(t.data)
  }

  async function saveKm() {
    if (!newKm || !stats) return
    setSaving(true)
    await supabase.from('vehicle_stats').update({ current_km: parseInt(newKm), updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
    setNewKm('')
    await loadAll()
    onKmUpdate()
    setSaving(false)
  }

  const kmToService = stats ? stats.next_service_km - stats.current_km : 0

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        רכב וטיפולים — DAF XB 260
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'ק"מ נוכחי', value: stats?.current_km.toLocaleString() ?? '—', color: 'var(--text)' },
          { label: 'ק"מ לטיפול', value: kmToService > 0 ? kmToService.toLocaleString() : 'הגיע הטיפול!', color: kmToService < 500 ? 'var(--red)' : 'var(--amber)' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 500, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {kmToService < 500 && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 10 }}>
          <span style={{ color: 'var(--red)', fontSize: 20 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--red)', marginBottom: 3 }}>טיפול נדרש בקרוב</div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>נותרו {kmToService} ק&quot;מ לטיפול הבא.</div>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>עדכון ק&quot;מ</div>
        <input type="number" value={newKm} onChange={e => setNewKm(e.target.value)}
          placeholder={String(stats?.current_km ?? '')}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '11px 13px', width: '100%', fontSize: 15, marginBottom: 10, direction: 'ltr', textAlign: 'right' }} />
        <button onClick={saveKm} disabled={!newKm || saving}
          style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '11px 0', fontSize: 13, cursor: 'pointer' }}>
          💾 שמור
        </button>
      </div>

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>לוח טיפולים</div>
        {maintenance.map((m, i) => {
          const kmLeft = m.interval_km && stats ? (m.last_done_km + m.interval_km) - stats.current_km : null
          const due = kmLeft !== null && kmLeft < 500
          return (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < maintenance.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{m.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {m.interval_km ? `כל ${m.interval_km.toLocaleString()} ק"מ` : ''}{m.interval_months ? ` / כל ${m.interval_months} חודשים` : ''}
                </div>
              </div>
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 500, background: due ? 'var(--red-bg)' : 'var(--green-bg)', color: due ? 'var(--red)' : 'var(--green)', border: `1px solid ${due ? 'var(--red-border)' : 'var(--green-border)'}` }}>
                {kmLeft !== null ? `${kmLeft.toLocaleString()} ק"מ` : 'לפי תאריך'}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>נסיעות אחרונות</div>
        {trips.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', padding: '10px 0' }}>אין נסיעות עדיין</div>}
        {trips.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < trips.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.driver_name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {t.end_time ? new Date(t.end_time).toLocaleDateString('he-IL') : '—'}
              </div>
            </div>
            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 500, background: 'var(--amber-bg)', color: 'var(--amber)', border: '1px solid var(--amber-border)' }}>
              +{t.end_km && t.start_km ? (t.end_km - t.start_km).toLocaleString() : '—'} ק&quot;מ
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
