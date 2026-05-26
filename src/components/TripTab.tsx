'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Driver { id: string; name: string; rank: string; pin: string | null }
interface CheckItem { id: string; text: string; order_index: number }

const TRIP_PURPOSES = [
  { id: 'event', label: 'אירוע מבצעי', icon: '🔥' },
  { id: 'fuel', label: 'תדלוק', icon: '⛽' },
  { id: 'drill', label: 'תרגיל', icon: '🎯' },
  { id: 'deploy', label: 'פריסה במקום', icon: '📡' },
  { id: 'garage', label: 'נסיעה למוסך', icon: '🔧' },
  { id: 'refresh', label: 'נסיעת ריענון נהיגה', icon: '🚗' },
]

type Step = 'home' | 'select-driver' | 'pin-verify' | 'select-purpose' | 'alert-escort' | 'checklist' | 'alert-height' | 'active-trip'

interface Props {
  activeTrip: any
  onTripStart: (trip: any) => void
  onTripEnd: () => void
}

export default function TripTab({ activeTrip, onTripStart, onTripEnd }: Props) {
  const [step, setStep] = useState<Step>(activeTrip ? 'active-trip' : 'home')
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [checkItems, setCheckItems] = useState<CheckItem[]>([])
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [selectedPurpose, setSelectedPurpose] = useState<typeof TRIP_PURPOSES[0] | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [startKm, setStartKm] = useState('')
  const [startDestination, setStartDestination] = useState('')
  const [endKm, setEndKm] = useState('')
  const [endNote, setEndNote] = useState('')
  const [showEndModal, setShowEndModal] = useState(false)
  const [vehicleKm, setVehicleKm] = useState(48420)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)

  useEffect(() => {
    supabase.from('drivers').select('*').eq('active', true).order('name')
      .then(({ data }) => data && setDrivers(data))
    supabase.from('safety_items').select('*').eq('active', true).order('order_index')
      .then(({ data }) => data && setCheckItems(data))
    supabase.from('vehicle_stats').select('current_km').single()
      .then(({ data }) => data && setVehicleKm(data.current_km))
  }, [])

  useEffect(() => {
    if (activeTrip) setStep('active-trip')
  }, [activeTrip])

  const allChecked = checked.size === checkItems.length && checkItems.length > 0
  const pct = checkItems.length > 0 ? Math.round(checked.size / checkItems.length * 100) : 0

  function toggleCheck(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function startTrip() {
    if (!selectedDriver || !startKm) return
    const fullNote = [selectedPurpose?.label, startDestination ? `יעד: ${startDestination}` : ''].filter(Boolean).join(' · ')
    const { data } = await supabase.from('trips').insert({
      driver_id: selectedDriver.id,
      driver_name: selectedDriver.name,
      start_km: parseInt(startKm),
      notes: fullNote || selectedPurpose?.label,
      status: 'active'
    }).select().single()
    if (data) {
      await supabase.from('vehicle_stats').update({ current_km: parseInt(startKm), updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
      onTripStart(data)
      setStep('active-trip')
    }
  }

  async function endTrip() {
    if (!activeTrip || !endKm) return
    await supabase.from('trips').update({
      end_km: parseInt(endKm),
      end_time: new Date().toISOString(),
      notes: endNote || activeTrip.notes,
      status: 'completed'
    }).eq('id', activeTrip.id)
    await supabase.from('vehicle_stats').update({ current_km: parseInt(endKm), updated_at: new Date().toISOString() }).neq('id', '00000000-0000-0000-0000-000000000000')
    setShowEndModal(false)
    setStep('home')
    setSelectedDriver(null)
    setSelectedPurpose(null)
    setChecked(new Set())
    setStartKm('')
    setStartDestination('')
    onTripEnd()
  }

  const pad: React.CSSProperties = { padding: 14 }
  const card: React.CSSProperties = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12 }
  const btn = (bg = 'var(--red)', disabled = false): React.CSSProperties => ({
    width: '100%', background: bg, color: '#fff', border: 'none',
    borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .35 : 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
  })

  // HOME - hero image
  if (step === 'home') return (
    <div>
      <div style={{ position: 'relative', height: 220, overflow: 'hidden' }}>
        <img src="/chapak-hero.jpg" alt="חפ&quot;ק" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.7) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 16, right: 16, color: '#fff' }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>חפ&quot;ק כבאות והצלה לישראל</div>
          <div style={{ fontSize: 13, opacity: .85, marginTop: 2 }}>מערכת ניהול רכב מבצעי</div>
        </div>
      </div>
      <div style={pad}>
        {activeTrip ? (
          <div>
            <div style={{ background: 'var(--amber-bg)', border: '1.5px solid var(--amber)', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)', marginBottom: 6 }}>⚠️ נסיעה פעילה קיימת</div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>
                <strong>{activeTrip.driver_name}</strong> נמצא בנסיעה פעילה
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                יש לסיים את הנסיעה הנוכחית לפני פתיחת נסיעה חדשה
              </div>
            </div>
            <button onClick={() => setStep('active-trip')} style={btn()}>
              🔴 עבור לנסיעה הפעילה וסיים אותה
            </button>
          </div>
        ) : (
          <button onClick={() => setStep('select-driver')} style={btn()}>
            🚗 התחל נסיעה חדשה
          </button>
        )}
      </div>
    </div>
  )

  // SELECT DRIVER
  if (step === 'select-driver') return (
    <div style={pad}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>בחר נהג מורשה</div>
      {drivers.map(d => (
        <div key={d.id} onClick={() => { setSelectedDriver(d); setPinInput(''); setPinError(false); if (d.pin) setStep('pin-verify'); else setStep('select-purpose') }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, ...card, cursor: 'pointer', marginBottom: 8 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--wood-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: 'var(--wood)', flexShrink: 0 }}>
            {d.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{d.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{d.rank}</div>
          </div>
          <span style={{ color: 'var(--dim)', fontSize: 18 }}>‹</span>
        </div>
      ))}
    </div>
  )

  // PIN VERIFY
  if (step === 'pin-verify') return (
    <div style={pad}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>אימות זהות</div>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--wood-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, color: 'var(--wood)', margin: '0 auto 12px' }}>
          {selectedDriver?.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{selectedDriver?.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 20 }}>{selectedDriver?.rank}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>הכנס קוד PIN אישי</div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={4}
          value={pinInput}
          onChange={e => { setPinInput(e.target.value); setPinError(false) }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              if (pinInput === selectedDriver?.pin) { setPinError(false); setStep('select-purpose') }
              else setPinError(true)
            }
          }}
          placeholder="• • • •"
          style={{ background: 'var(--bg2)', border: `1.5px solid ${pinError ? 'var(--red)' : 'var(--border2)'}`, borderRadius: 10, padding: '14px 0', width: '100%', fontSize: 28, textAlign: 'center', letterSpacing: 12, marginBottom: 8, direction: 'ltr' }}
          autoFocus
        />
        {pinError && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10 }}>קוד PIN שגוי, נסה שנית</div>}
        <button
          onClick={() => { if (pinInput === selectedDriver?.pin) { setPinError(false); setStep('select-purpose') } else setPinError(true) }}
          style={{ width: '100%', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 4 }}>
          ✓ אמת וכנס
        </button>
        <button onClick={() => setStep('select-driver')}
          style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 10, padding: '11px 0', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
          חזור לבחירת נהג
        </button>
      </div>
    </div>
  )

  // SELECT PURPOSE
  if (step === 'select-purpose') return (
    <div style={pad}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setStep('select-driver')} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 14, cursor: 'pointer' }}>› חזור</button>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>מטרת הנסיעה</div>
      </div>
      <div style={{ background: 'var(--wood-light)', border: '1px solid #e0d0bb', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--wood-light)', border: '1px solid #e0d0bb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: 'var(--wood)' }}>
          {selectedDriver?.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{selectedDriver?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selectedDriver?.rank}</div>
        </div>
      </div>
      {TRIP_PURPOSES.map(p => (
        <div key={p.id} onClick={() => {
          setSelectedPurpose(p)
          if (p.id === 'event') setStep('alert-escort')
          else setStep('checklist')
        }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', marginBottom: 8, cursor: 'pointer' }}>
          <span style={{ fontSize: 24 }}>{p.icon}</span>
          <div style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{p.label}</div>
          <span style={{ color: 'var(--dim)', fontSize: 18 }}>‹</span>
        </div>
      ))}
    </div>
  )

  // ALERT ESCORT (event only)
  if (step === 'alert-escort') return (
    <div style={pad}>
      <div style={{
        background: 'var(--red-bg)', border: '2px solid var(--red)',
        borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 20
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)', marginBottom: 8 }}>שים לב!</div>
        <div style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.7, fontWeight: 500 }}>
          חובת נסיעה עם רכב ליווי
        </div>
      </div>
      <button onClick={() => setStep('checklist')} style={btn()}>
        ✓ קראתי ואישרתי
      </button>
    </div>
  )

  // CHECKLIST
  if (step === 'checklist') return (
    <div style={pad}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>בדיקות לפני נסיעה</div>
        <span style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 4, fontWeight: 500,
          background: allChecked ? 'var(--green-bg)' : 'var(--red-bg)',
          color: allChecked ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${allChecked ? 'var(--green-border)' : 'var(--red-border)'}`
        }}>{checked.size} / {checkItems.length}</span>
      </div>
      <div style={{ background: 'var(--bg3)', borderRadius: 3, height: 5, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: 'var(--green)', borderRadius: 3, width: `${pct}%`, transition: 'width .3s' }} />
      </div>
      <div style={{ ...card, borderRight: '3px solid var(--red)' }}>
        {checkItems.map((item, i) => (
          <div key={item.id} onClick={() => toggleCheck(item.id)}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderBottom: i < checkItems.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', opacity: checked.has(item.id) ? .45 : 1 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 5, flexShrink: 0, marginTop: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: checked.has(item.id) ? 'var(--green)' : '#fff',
              border: `1.5px solid ${checked.has(item.id) ? 'var(--green)' : 'var(--border2)'}`,
            }}>
              {checked.has(item.id) && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, textDecoration: checked.has(item.id) ? 'line-through' : 'none', color: 'var(--text)' }}>
              {item.text}
            </div>
          </div>
        ))}
      </div>
      <div style={card}>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>קריאת מד ק&quot;מ בתחילת נסיעה</label>
        <input type="number" value={startKm} onChange={e => setStartKm(e.target.value)}
          placeholder={String(vehicleKm)}
          style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '11px 13px', width: '100%', fontSize: 15, marginBottom: 10, direction: 'ltr', textAlign: 'right' }} />
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>יעד הנסיעה (אופציונלי)</label>
        <input type="text" value={startDestination} onChange={e => setStartDestination(e.target.value)}
          placeholder="לדוגמה: תחנה מרכזית, רח' הרצל..."
          style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '11px 13px', width: '100%', fontSize: 14, marginBottom: 12, direction: 'rtl' }} />
        <button onClick={() => { if (allChecked && startKm) setStep('alert-height') }}
          disabled={!allChecked || !startKm}
          style={btn('var(--red)', !allChecked || !startKm)}>
          המשך ›
        </button>
      </div>
    </div>
  )

  // ALERT HEIGHT
  if (step === 'alert-height') return (
    <div style={pad}>
      <div style={{
        background: 'var(--amber-bg)', border: '2px solid var(--amber)',
        borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 20
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--amber)', marginBottom: 8 }}>אזהרה!</div>
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8, fontWeight: 500 }}>
          גובה הרכב הוא <strong>4.50 מטרים</strong>
          <br />
          אין לעבור מתחת לגשרים נמוכים מגובה הרכב
          <br />
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>נסיעה טובה!</span>
        </div>
      </div>
      <button onClick={startTrip} style={btn()}>
        🚗 צא לדרך
      </button>
    </div>
  )

  // ACTIVE TRIP
  if (step === 'active-trip' && activeTrip) return (
    <div style={pad}>
      {/* תזכורת לסגור לפני מעבר לסד"פ */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 18 }}>📋</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>ניתן לעבור לטאב מפעיל</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>זכור לחזור ולסגור את הנסיעה בסיום</div>
        </div>
        <span style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, background: 'var(--amber-bg)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--amber-border)' }}>פעיל</span>
      </div>

      <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 12, padding: 18, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--wood-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, color: 'var(--wood)' }}>
            {activeTrip.driver_name?.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{activeTrip.driver_name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {activeTrip.notes} · {new Date(activeTrip.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{activeTrip.start_km?.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>ק&quot;מ התחלה</div>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--amber)' }}>בנסיעה</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>סטטוס</div>
          </div>
        </div>
        <button onClick={() => setShowEndModal(true)} style={btn()}>
          🏁 סיים נסיעה
        </button>
      </div>

      {showEndModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--bg)', borderRadius: '16px 16px 0 0', padding: '20px 18px 30px', width: '100%', maxWidth: 390 }}>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>🏁 סיום נסיעה</div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>ק&quot;מ בסיום</label>
            <input type="number" value={endKm} onChange={e => setEndKm(e.target.value)}
              placeholder={String(activeTrip.start_km + 10)}
              style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '11px 13px', width: '100%', fontSize: 15, marginBottom: 12, direction: 'ltr', textAlign: 'right' }} />
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>הערות</label>
            <textarea value={endNote} onChange={e => setEndNote(e.target.value)} rows={2}
              placeholder="הערות לנסיעה..."
              style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 9, padding: '11px 13px', width: '100%', fontSize: 13, resize: 'none', direction: 'rtl', marginBottom: 14 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={endTrip} disabled={!endKm} style={{ ...btn('var(--green)', !endKm), flex: 1 }}>✓ אשר סיום</button>
              <button onClick={() => setShowEndModal(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 9, padding: '12px 16px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return null
}
