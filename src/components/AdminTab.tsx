'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = 'chapak2026'

interface Driver { id: string; name: string; rank: string; active: boolean; pin: string | null }
interface SafetyItem { id: string; category: string; text: string; note: string; order_index: number; active: boolean }
interface SopStep { id: string; sop_type: string; title: string; description: string; order_index: number }
interface Trip { id: string; driver_name: string; start_km: number; end_km: number | null; start_time: string; end_time: string | null; notes: string | null; status: string }
interface VehicleStat { current_km: number; next_service_km: number }
interface Props { onTripClosed?: () => void }

type AdminTab = 'drivers' | 'safety' | 'sop' | 'journal' | 'vehicle'

export default function AdminTab({ onTripClosed }: Props = {}) {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState(false)
  const [tab, setTab] = useState<AdminTab>('drivers')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [safetyItems, setSafetyItems] = useState<SafetyItem[]>([])
  const [sopSteps, setSopSteps] = useState<SopStep[]>([])
  const [sopType, setSopType] = useState<'exterior' | 'interior' | 'mast'>('exterior')
  const [trips, setTrips] = useState<Trip[]>([])
  const [vehicleStat, setVehicleStat] = useState<VehicleStat | null>(null)
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [editingSafety, setEditingSafety] = useState<SafetyItem | null>(null)
  const [editingSop, setEditingSop] = useState<SopStep | null>(null)
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [showAddSafety, setShowAddSafety] = useState(false)
  const [showAddSop, setShowAddSop] = useState(false)
  const [newDriver, setNewDriver] = useState({ name: '', rank: '' })
  const [newSafety, setNewSafety] = useState({ category: 'כללי', text: '', note: '' })
  const [newSop, setNewSop] = useState({ title: '', description: '' })
  const [newKm, setNewKm] = useState('')
  const [closingTripId, setClosingTripId] = useState<string | null>(null)
  const [closingTripKm, setClosingTripKm] = useState('')
  const [closingTripName, setClosingTripName] = useState('')
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [editTripFields, setEditTripFields] = useState({ start_km: '', end_km: '', notes: '', destination: '' })
  const [toast, setToast] = useState('')

  useEffect(() => { if (authed) loadAll() }, [authed, tab, sopType])

  async function loadAll() {
    const [d, s, sop, t, v] = await Promise.all([
      supabase.from('drivers').select('*').order('name'),
      supabase.from('safety_items').select('*').order('order_index'),
      supabase.from('sop_steps').select('*').eq('sop_type', sopType).order('order_index'),
      supabase.from('trips').select('*').order('start_time', { ascending: false }).limit(50),
      supabase.from('vehicle_stats').select('*').single(),
    ])
    if (d.data) setDrivers(d.data)
    if (s.data) setSafetyItems(s.data)
    if (sop.data) setSopSteps(sop.data)
    if (t.data) setTrips(t.data)
    if (v.data) setVehicleStat(v.data)
  }

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
    await supabase.from('sop_steps').insert({ ...newSop, sop_type: sopType, order_index: max + 1 })
    setNewSop({ title: '', description: '' }); setShowAddSop(false); loadAll(); showToast('שלב נוסף ✓')
  }

  async function saveSop() {
    if (!editingSop) return
    await supabase.from('sop_steps').update({ title: editingSop.title, description: editingSop.description }).eq('id', editingSop.id)
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
        {[['drivers', '👤', 'נהגים'], ['safety', '✅', 'בטיחות'], ['sop', '📋', 'סד"פים'], ['journal', '📒', 'יומן'], ['vehicle', '🚗', 'רכב']].map(([val, icon, label]) => (
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
                  <div>
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

      {/* SOP */}
      {tab === 'sop' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {[['exterior', 'חוץ'], ['interior', 'פנים'], ['mast', 'תורן']].map(([val, label]) => (
              <button key={val} onClick={() => setSopType(val as typeof sopType)}
                style={{ flex: 1, background: sopType === val ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${sopType === val ? 'var(--red)' : 'var(--border)'}`, color: sopType === val ? '#fff' : 'var(--muted)', borderRadius: 7, padding: '7px 0', fontSize: 12, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>📋 שלבי הסד&quot;פ</div>
              <button onClick={() => setShowAddSop(!showAddSop)} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ הוסף</button>
            </div>
            {showAddSop && (
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <input value={newSop.title} onChange={e => setNewSop(p => ({ ...p, title: e.target.value }))} placeholder="כותרת השלב" style={{ ...inp(), marginBottom: 8 }} />
                <textarea value={newSop.description} onChange={e => setNewSop(p => ({ ...p, description: e.target.value }))} placeholder="תיאור" rows={2} style={{ ...inp({ resize: 'none' }), marginBottom: 8 }} />
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
          {trips.length === 0 && <div style={{ ...card, textAlign: 'center', color: 'var(--muted)', fontSize: 13, padding: 30 }}>אין נסיעות עדיין</div>}
          {trips.map(trip => (
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
                  <button
                    onClick={() => { setEditingTrip(trip); setEditTripFields({ start_km: String(trip.start_km || ''), end_km: String(trip.end_km || ''), notes: trip.notes || '', destination: '' }) }}
                    style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                    ✏️ ערוך נסיעה
                  </button>
                </div>
              )}
              {trip.status === 'active' && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setClosingTripId(trip.id); setClosingTripName(trip.driver_name); setClosingTripKm('') }}
                      style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      🔴 סגור ידנית
                    </button>
                    <button
                      onClick={() => { setEditingTrip(trip); setEditTripFields({ start_km: String(trip.start_km || ''), end_km: String(trip.end_km || ''), notes: trip.notes || '', destination: '' }) }}
                      style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      ✏️ ערוך נסיעה
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
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
    </div>
  )
      {/* MODAL - עריכת נסיעה */}
      {editingTrip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', padding: '20px 18px 30px', width: '100%', maxWidth: 390 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>✏️ עריכת נסיעה</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>{editingTrip?.driver_name}</div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>ק"מ פתיחה</label>
            <input type="number" value={editTripFields.start_km} onChange={e => setEditTripFields(p => ({ ...p, start_km: e.target.value }))}
              placeholder="ק&quot;מ פתיחה"
              style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '10px 13px', width: '100%', fontSize: 14, marginBottom: 10, direction: 'ltr', textAlign: 'right' }} />
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>ק"מ סיום</label>
            <input type="number" value={editTripFields.end_km} onChange={e => setEditTripFields(p => ({ ...p, end_km: e.target.value }))}
              placeholder="ק&quot;מ סיום"
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
                  setEditingTrip(null)
                  loadAll()
                  showToast('נסיעה עודכנה ✓')
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
                  await supabase.from('trips').update({
                    status: 'completed',
                    end_time: new Date().toISOString(),
                    end_km: parseInt(closingTripKm),
                  }).eq('id', closingTripId)
                  await supabase.from('vehicle_stats').update({ current_km: parseInt(closingTripKm), updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
                  setClosingTripId(null)
                  setClosingTripKm('')
                  loadAll()
                  showToast('נסיעה נסגרה ✓')
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
}
