'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'chapak2026'

interface Driver { id: string; name: string; rank: string; active: boolean }
interface SafetyItem { id: string; category: string; text: string; note: string; order_index: number; active: boolean }
interface SopStep { id: string; sop_type: string; title: string; description: string; order_index: number }

type AdminTab = 'drivers' | 'safety' | 'sop'

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState(false)
  const [tab, setTab] = useState<AdminTab>('drivers')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [safetyItems, setSafetyItems] = useState<SafetyItem[]>([])
  const [sopSteps, setSopSteps] = useState<SopStep[]>([])
  const [sopType, setSopType] = useState<'event' | 'deploy' | 'fold'>('deploy')
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null)
  const [editingSafety, setEditingSafety] = useState<SafetyItem | null>(null)
  const [editingSop, setEditingSop] = useState<SopStep | null>(null)
  const [newDriver, setNewDriver] = useState({ name: '', rank: '' })
  const [showAddDriver, setShowAddDriver] = useState(false)
  const [showAddSafety, setShowAddSafety] = useState(false)
  const [showAddSop, setShowAddSop] = useState(false)
  const [newSafety, setNewSafety] = useState({ category: 'ציוד חיצוני', text: '', note: '' })
  const [newSop, setNewSop] = useState({ title: '', description: '' })
  const [toast, setToast] = useState('')

  useEffect(() => { if (authed) loadAll() }, [authed, tab, sopType])

  async function loadAll() {
    const [d, s, sop] = await Promise.all([
      supabase.from('drivers').select('*').order('name'),
      supabase.from('safety_items').select('*').order('order_index'),
      supabase.from('sop_steps').select('*').eq('sop_type', sopType).order('order_index'),
    ])
    if (d.data) setDrivers(d.data)
    if (s.data) setSafetyItems(s.data)
    if (sop.data) setSopSteps(sop.data)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  function login() {
    if (pw === ADMIN_PASSWORD) { setAuthed(true); setPwErr(false) }
    else setPwErr(true)
  }

  async function toggleDriver(d: Driver) {
    await supabase.from('drivers').update({ active: !d.active }).eq('id', d.id)
    loadAll(); showToast(d.active ? 'נהג הושבת' : 'נהג הופעל')
  }

  async function addDriver() {
    if (!newDriver.name || !newDriver.rank) return
    await supabase.from('drivers').insert({ name: newDriver.name, rank: newDriver.rank })
    setNewDriver({ name: '', rank: '' }); setShowAddDriver(false); loadAll(); showToast('נהג נוסף ✓')
  }

  async function deleteDriver(id: string) {
    if (!confirm('למחוק נהג זה?')) return
    await supabase.from('drivers').delete().eq('id', id)
    loadAll(); showToast('נהג נמחק')
  }

  async function saveSafety() {
    if (!editingSafety) return
    await supabase.from('safety_items').update({ text: editingSafety.text, category: editingSafety.category, note: editingSafety.note }).eq('id', editingSafety.id)
    setEditingSafety(null); loadAll(); showToast('הנחייה עודכנה ✓')
  }

  async function addSafety() {
    if (!newSafety.text) return
    const maxOrder = Math.max(...safetyItems.map(i => i.order_index), 0)
    await supabase.from('safety_items').insert({ ...newSafety, order_index: maxOrder + 1 })
    setNewSafety({ category: 'ציוד חיצוני', text: '', note: '' }); setShowAddSafety(false); loadAll(); showToast('הנחייה נוספה ✓')
  }

  async function deleteSafety(id: string) {
    if (!confirm('למחוק הנחייה זו?')) return
    await supabase.from('safety_items').delete().eq('id', id)
    loadAll(); showToast('הנחייה נמחקה')
  }

  async function saveSop() {
    if (!editingSop) return
    await supabase.from('sop_steps').update({ title: editingSop.title, description: editingSop.description }).eq('id', editingSop.id)
    setEditingSop(null); loadAll(); showToast('שלב עודכן ✓')
  }

  async function addSop() {
    if (!newSop.title) return
    const maxOrder = Math.max(...sopSteps.map(s => s.order_index), 0)
    await supabase.from('sop_steps').insert({ ...newSop, sop_type: sopType, order_index: maxOrder + 1 })
    setNewSop({ title: '', description: '' }); setShowAddSop(false); loadAll(); showToast('שלב נוסף ✓')
  }

  async function deleteSop(id: string) {
    if (!confirm('למחוק שלב זה?')) return
    await supabase.from('sop_steps').delete().eq('id', id)
    loadAll(); showToast('שלב נמחק')
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

  const inp = (style?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, width: '100%', direction: 'rtl', ...style
  })

  if (!authed) return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>כניסת מנהל</div>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 20px' }}>
        <div style={{ fontSize: 15, fontWeight: 500, textAlign: 'center', marginBottom: 20 }}>🔒 כניסת אדמין</div>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>סיסמה</label>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="הכנס סיסמה"
          style={{ ...inp(), marginBottom: 14 }} />
        {pwErr && <div style={{ fontSize: 12, color: 'var(--red)', textAlign: 'center', marginBottom: 8 }}>סיסמה שגויה</div>}
        <button onClick={login} style={{ width: '100%', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 9, padding: '12px 0', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
          כניסה
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 14 }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#1a1a18', color: '#fff', padding: '10px 18px', borderRadius: 20, fontSize: 13, zIndex: 200, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>ניהול מערכת</div>
        <button onClick={() => setAuthed(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
          יציאה
        </button>
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['drivers', '👤 נהגים'], ['safety', '✅ הנחיות'], ['sop', '📋 סד"פים']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val as AdminTab)}
            style={{ flex: 1, background: tab === val ? 'var(--red)' : 'var(--bg)', border: `1px solid ${tab === val ? 'var(--red)' : 'var(--border)'}`, color: tab === val ? '#fff' : 'var(--muted)', borderRadius: 8, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {/* DRIVERS TAB */}
      {tab === 'drivers' && (
        <div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>👤 נהגים מורשים</div>
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
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < drivers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{d.rank}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 500, background: d.active ? 'var(--green-bg)' : 'var(--bg3)', color: d.active ? 'var(--green)' : 'var(--muted)', border: `1px solid ${d.active ? 'var(--green-border)' : 'var(--border)'}`, cursor: 'pointer' }}
                    onClick={() => toggleDriver(d)}>
                    {d.active ? 'פעיל' : 'מושבת'}
                  </span>
                  <button onClick={() => deleteDriver(d.id)} style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer' }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SAFETY TAB */}
      {tab === 'safety' && (
        <div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>✅ הנחיות בטיחות</div>
              <button onClick={() => setShowAddSafety(!showAddSafety)} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ הוסף</button>
            </div>
            {showAddSafety && (
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <select value={newSafety.category} onChange={e => setNewSafety(p => ({ ...p, category: e.target.value }))} style={{ ...inp(), marginBottom: 8 }}>
                  {['ציוד חיצוני', 'תורן', 'אגפים', 'דלתות', 'חשמל', 'פנים'].map(c => <option key={c}>{c}</option>)}
                </select>
                <textarea value={newSafety.text} onChange={e => setNewSafety(p => ({ ...p, text: e.target.value }))} placeholder="טקסט ההנחייה" rows={2} style={{ ...inp(), resize: 'none', marginBottom: 8 }} />
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
                    <select value={editingSafety.category} onChange={e => setEditingSafety(p => p ? { ...p, category: e.target.value } : p)} style={{ ...inp(), marginBottom: 8 }}>
                      {['ציוד חיצוני', 'תורן', 'אגפים', 'דלתות', 'חשמל', 'פנים'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <textarea value={editingSafety.text} onChange={e => setEditingSafety(p => p ? { ...p, text: e.target.value } : p)} rows={2} style={{ ...inp(), resize: 'none', marginBottom: 8 }} />
                    <input value={editingSafety.note} onChange={e => setEditingSafety(p => p ? { ...p, note: e.target.value } : p)} placeholder="הערה" style={{ ...inp(), marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={saveSafety} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>שמור</button>
                      <button onClick={() => setEditingSafety(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < safetyItems.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: 'var(--amber)', fontWeight: 500, marginBottom: 2 }}>{item.category}</div>
                      <div style={{ fontSize: 13, color: 'var(--text)' }}>{item.text}</div>
                      {item.note && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{item.note}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginRight: 8 }}>
                      <button onClick={() => setEditingSafety(item)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => deleteSafety(item.id)} style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 6, padding: '4px 8px', fontSize: 13, cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOP TAB */}
      {tab === 'sop' && (
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[['event', 'אירוע'], ['deploy', 'פריסה'], ['fold', 'קיפול']].map(([val, label]) => (
              <button key={val} onClick={() => setSopType(val as typeof sopType)}
                style={{ flex: 1, background: sopType === val ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${sopType === val ? 'var(--red)' : 'var(--border)'}`, color: sopType === val ? '#fff' : 'var(--muted)', borderRadius: 7, padding: '7px 0', fontSize: 12, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>📋 שלבי הסד&quot;פ</div>
              <button onClick={() => setShowAddSop(!showAddSop)} style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>+ הוסף</button>
            </div>
            {showAddSop && (
              <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                <input value={newSop.title} onChange={e => setNewSop(p => ({ ...p, title: e.target.value }))} placeholder="כותרת השלב" style={{ ...inp(), marginBottom: 8 }} />
                <textarea value={newSop.description} onChange={e => setNewSop(p => ({ ...p, description: e.target.value }))} placeholder="תיאור" rows={2} style={{ ...inp(), resize: 'none', marginBottom: 8 }} />
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
                    <textarea value={editingSop.description} onChange={e => setEditingSop(p => p ? { ...p, description: e.target.value } : p)} rows={3} style={{ ...inp(), resize: 'none', marginBottom: 8 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={saveSop} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>שמור</button>
                      <button onClick={() => setEditingSop(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: i < sopSteps.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--red)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>{step.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{step.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {i > 0 && <button onClick={() => moveSop(step, 'up')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 6px', fontSize: 12, cursor: 'pointer' }}>↑</button>}
                      {i < sopSteps.length - 1 && <button onClick={() => moveSop(step, 'down')} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 6px', fontSize: 12, cursor: 'pointer' }}>↓</button>}
                      <button onClick={() => setEditingSop(step)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 6px', fontSize: 13, cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => deleteSop(step.id)} style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 6, padding: '4px 6px', fontSize: 13, cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
