'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Trip } from '@/app/page'
import s from './styles.module.css'

interface Driver { id: string; name: string; rank: string; active: boolean }
interface SafetyItem { id: string; category: string; text: string; note: string; order_index: number }

interface Props {
  activeTrip: Trip | null
  vehicleKm: number
  onTripStart: (trip: Trip) => void
  onTripEnd: () => void
}

export default function DriversPage({ activeTrip, vehicleKm, onTripStart, onTripEnd }: Props) {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [safetyItems, setSafetyItems] = useState<SafetyItem[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [startKm, setStartKm] = useState('')
  const [endKm, setEndKm] = useState('')
  const [endNote, setEndNote] = useState('')
  const [showEndModal, setShowEndModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'select' | 'checklist'>('select')

  useEffect(() => {
    supabase.from('drivers').select('*').eq('active', true).order('name')
      .then(({ data }) => data && setDrivers(data))
    supabase.from('safety_items').select('*').eq('active', true).order('order_index')
      .then(({ data }) => data && setSafetyItems(data))
  }, [])

  const categories = [...new Set(safetyItems.map(i => i.category))]
  const total = safetyItems.length
  const checkedCount = checked.size
  const pct = total > 0 ? Math.round(checkedCount / total * 100) : 0
  const allChecked = checkedCount === total && total > 0

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function startTrip() {
    if (!selectedDriver || !startKm || !allChecked) return
    setLoading(true)
    const { data, error } = await supabase.from('trips').insert({
      driver_id: selectedDriver.id,
      driver_name: selectedDriver.name,
      start_km: parseInt(startKm),
      status: 'active'
    }).select().single()
    if (data && !error) {
      await supabase.from('vehicle_stats').update({ current_km: parseInt(startKm), updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
      onTripStart(data)
    }
    setLoading(false)
  }

  async function endTrip() {
    if (!activeTrip || !endKm) return
    setLoading(true)
    await supabase.from('trips').update({
      end_km: parseInt(endKm),
      end_time: new Date().toISOString(),
      notes: endNote,
      status: 'completed'
    }).eq('id', activeTrip.id)
    await supabase.from('vehicle_stats').update({ current_km: parseInt(endKm), updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
    setShowEndModal(false)
    setEndKm('')
    setEndNote('')
    setLoading(false)
    onTripEnd()
  }

  if (activeTrip) {
    return (
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>נסיעה פעילה</div>
        <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 12, padding: 18, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--wood-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 500, color: 'var(--wood)' }}>
              {activeTrip.driver_name.slice(0, 2)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>{activeTrip.driver_name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                יצא: {new Date(activeTrip.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{activeTrip.start_km.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>ק&quot;מ התחלה</div>
            </div>
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--green)' }}>{vehicleKm.toLocaleString()}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>ק&quot;מ נוכחי</div>
            </div>
          </div>
          <button onClick={() => setShowEndModal(true)} style={{
            width: '100%', background: 'var(--red)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>🏁 סיים נסיעה</button>
        </div>

        {showEndModal && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100
          }}>
            <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', padding: '20px 18px 30px', width: '100%', maxWidth: 390 }}>
              <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                🏁 סיום נסיעה
              </div>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>ק&quot;מ בסיום נסיעה</label>
              <input type="number" value={endKm} onChange={e => setEndKm(e.target.value)}
                placeholder={String(activeTrip.start_km + 10)}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '11px 13px', width: '100%', fontSize: 15, marginBottom: 12, direction: 'ltr', textAlign: 'right' }} />
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>הערות</label>
              <textarea value={endNote} onChange={e => setEndNote(e.target.value)} rows={2}
                placeholder="לדוגמה: הגעה לאירוע שריפה..."
                style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '11px 13px', width: '100%', fontSize: 13, resize: 'none', direction: 'rtl', marginBottom: 14 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={endTrip} disabled={!endKm || loading} style={{
                  flex: 1, background: 'var(--green)', color: '#fff', border: 'none',
                  borderRadius: 9, padding: '12px 0', fontSize: 13, fontWeight: 500, cursor: 'pointer'
                }}>✓ אשר סיום</button>
                <button onClick={() => setShowEndModal(false)} style={{
                  background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)',
                  borderRadius: 9, padding: '12px 16px', fontSize: 12, cursor: 'pointer'
                }}>ביטול</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (view === 'select') {
    return (
      <div style={{ padding: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>בחר נהג מורשה</div>
        {drivers.map(d => (
          <div key={d.id} onClick={() => { setSelectedDriver(d); setChecked(new Set()); setView('checklist') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '13px 14px', marginBottom: 8, cursor: 'pointer'
            }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--wood-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: 'var(--wood)', flexShrink: 0 }}>
              {d.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{d.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{d.rank}</div>
            </div>
            <span style={{ color: 'var(--dim)', fontSize: 18 }}>‹</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: 'var(--red)', border: '1px solid var(--red-border)' }}>
            {selectedDriver!.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{selectedDriver!.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selectedDriver!.rank}</div>
          </div>
        </div>
        <button onClick={() => setView('select')} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
          החלף ›
        </button>
      </div>

      <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 10, padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 10 }}>
        <span style={{ color: 'var(--red)', fontSize: 20, flexShrink: 0 }}>⚠️</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--red)', marginBottom: 3 }}>בדיקות חובה לפני נסיעה</div>
          <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6 }}>סמן את כל הסעיפים לפי חוברת ח. גירש תעשיות.</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRight: '3px solid var(--red)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>רשימת בדיקה</div>
          <span style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 500,
            background: allChecked ? 'var(--green-bg)' : 'var(--red-bg)',
            color: allChecked ? 'var(--green)' : 'var(--red)',
            border: `1px solid ${allChecked ? 'var(--green-border)' : 'var(--red-border)'}`
          }}>{checkedCount} / {total}</span>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 3, height: 5, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'var(--green)', borderRadius: 3, width: `${pct}%`, transition: 'width .3s' }} />
        </div>
        <ul style={{ listStyle: 'none' }}>
          {categories.map(cat => (
            <div key={cat}>
              <li style={{ fontSize: 11, fontWeight: 500, color: 'var(--amber)', padding: '9px 0 4px', display: 'flex', alignItems: 'center', gap: 5, borderBottom: '1px solid #f0dbb0', marginBottom: 3 }}>
                {cat}
              </li>
              {safetyItems.filter(i => i.category === cat).map(item => (
                <li key={item.id} onClick={() => toggleCheck(item.id)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: checked.has(item.id) ? .45 : 1 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 5, flexShrink: 0, marginTop: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: checked.has(item.id) ? 'var(--green)' : '#fff',
                    border: `1.5px solid ${checked.has(item.id) ? 'var(--green)' : 'var(--border2)'}`,
                    transition: 'all .15s'
                  }}>
                    {checked.has(item.id) && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)', textDecoration: checked.has(item.id) ? 'line-through' : 'none' }}>{item.text}</div>
                    {item.note && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{item.note}</div>}
                  </div>
                </li>
              ))}
            </div>
          ))}
        </ul>
      </div>

      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>קריאת מד ק&quot;מ בתחילת נסיעה</label>
        <input type="number" value={startKm} onChange={e => setStartKm(e.target.value)}
          placeholder={String(vehicleKm)}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '11px 13px', width: '100%', fontSize: 15, marginBottom: 12, direction: 'ltr', textAlign: 'right' }} />
        <button onClick={startTrip} disabled={!allChecked || !startKm || loading}
          style={{
            width: '100%', background: 'var(--red)', color: '#fff', border: 'none',
            borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            opacity: (!allChecked || !startKm) ? .3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}>▶ אשר ויצא לדרך</button>
      </div>
    </div>
  )
}
