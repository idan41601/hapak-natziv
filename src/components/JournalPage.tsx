'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Trip {
  id: string; driver_name: string; start_km: number; end_km: number | null
  start_time: string; end_time: string | null; notes: string | null; status: string
}

export default function JournalPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [filter, setFilter] = useState<'all' | 'completed' | 'active'>('all')

  useEffect(() => {
    supabase.from('trips').select('*').order('start_time', { ascending: false }).limit(50)
      .then(({ data }) => data && setTrips(data))
  }, [])

  const filtered = filter === 'all' ? trips : trips.filter(t => t.status === filter)

  function formatDate(dt: string) {
    return new Date(dt).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }
  function formatTime(dt: string) {
    return new Date(dt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        יומן נסיעות
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto' }}>
        {[['all', 'הכל'], ['completed', 'הושלמו'], ['active', 'פעילות']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val as typeof filter)}
            style={{
              background: filter === val ? 'var(--red)' : 'var(--bg)',
              border: `1px solid ${filter === val ? 'var(--red)' : 'var(--border)'}`,
              color: filter === val ? '#fff' : 'var(--muted)',
              borderRadius: 20, padding: '5px 13px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
            }}>{label}</button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          אין נסיעות להצגה
        </div>
      )}

      {filtered.map(trip => (
        <div key={trip.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{trip.driver_name}</div>
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500,
              background: trip.status === 'active' ? 'var(--amber-bg)' : 'var(--green-bg)',
              color: trip.status === 'active' ? 'var(--amber)' : 'var(--green)',
              border: `1px solid ${trip.status === 'active' ? 'var(--amber-border)' : 'var(--green-border)'}`
            }}>
              {trip.status === 'active' ? 'פעיל' : 'הושלם'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', marginBottom: trip.notes ? 8 : 0 }}>
            <span>📅 {formatDate(trip.start_time)}</span>
            <span>🕐 {formatTime(trip.start_time)}{trip.end_time ? ` — ${formatTime(trip.end_time)}` : ''}</span>
            <span>📍 {trip.start_km.toLocaleString()}{trip.end_km ? ` ← ${trip.end_km.toLocaleString()} ק"מ` : ' ק"מ'}</span>
            {trip.end_km && <span>🛣️ {(trip.end_km - trip.start_km).toLocaleString()} ק&quot;מ</span>}
          </div>
          {trip.notes && (
            <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', lineHeight: 1.5 }}>
              {trip.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
