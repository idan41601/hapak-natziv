'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Driver { id: string; name: string; rank: string; pin: string | null }
interface CheckItem { id: string; text: string; order_index: number }

const TRIP_PURPOSES = [
  { id: 'event',   label: 'אירוע מבצעי',        icon: '🔥' },
  { id: 'fuel',    label: 'תדלוק',               icon: '⛽' },
  { id: 'drill',   label: 'תרגיל',               icon: '🎯' },
  { id: 'deploy',  label: 'פריסה במקום',         icon: '📡' },
  { id: 'garage',  label: 'נסיעה למוסך',         icon: '🔧' },
  { id: 'refresh', label: 'נסיעת ריענון נהיגה', icon: '🚗' },
]

type Step = 'home' | 'select-driver' | 'pin-verify' | 'select-purpose' | 'alert-escort' | 'checklist' | 'alert-height' | 'active-trip'

interface Props {
  activeTrip: any
  onTripStart: (trip: any) => void
  onTripEnd: () => void
}

function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.26,
      background: 'linear-gradient(135deg, #2a1a1a 0%, #3d1515 50%, #2a1010 100%)',
      border: '1px solid rgba(232,35,42,.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.33, fontWeight: 700, color: 'var(--red)',
      flexShrink: 0,
    }}>{initials}</div>
  )
}

function SectionHeader({ title, onBack, sub }: { title: string; onBack?: () => void; sub?: string }) {
  return (
    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--line)', marginBottom: 0 }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 700, color: 'var(--red)',
          letterSpacing: '.04em', marginBottom: 6, padding: 0,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          ← חזור
        </button>
      )}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
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

  useEffect(() => { if (activeTrip) setStep('active-trip') }, [activeTrip])

  const allChecked = checked.size === checkItems.length && checkItems.length > 0
  const pct = checkItems.length > 0 ? Math.round(checked.size / checkItems.length * 100) : 0

  function toggleCheck(id: string) {
    setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
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
    setSelectedDriver(null); setSelectedPurpose(null); setChecked(new Set())
    setStartKm(''); setStartDestination('')
    onTripEnd()
  }

  /* ─── HOME ─── */
  if (step === 'home') return (
    <div>
      {/* hero */}
      <div style={{ position: 'relative', height: 180, overflow: 'hidden' }}>
        <img src="/chapak-hero.jpg" alt="חפ״ק" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(9,9,12,.2) 0%, rgba(9,9,12,.9) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 16, right: 16, left: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', color: 'rgba(255,255,255,.45)', marginBottom: 4 }}>
            חפ״ק כבאות והצלה · לפיד 10
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1 }}>
            מערכת ניהול רכב מבצעי
          </div>
        </div>
        {/* km badge */}
        <div style={{
          position: 'absolute', top: 14, left: 14,
          background: 'rgba(9,9,12,.7)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 10, padding: '6px 10px',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.45)', letterSpacing: '.05em' }}>מד ק״מ</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-.01em', direction: 'ltr' }}>
            {vehicleKm.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 24px' }}>
        {activeTrip ? (
          <>
            <div style={{
              background: 'var(--amber-dim)',
              border: '1px solid rgba(245,158,11,.25)',
              borderRight: '3px solid var(--amber)',
              borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)', letterSpacing: '.04em', marginBottom: 6 }}>
                ⚠ נסיעה פעילה קיימת
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>
                <strong>{activeTrip.driver_name}</strong> נמצא בנסיעה
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>יש לסיים לפני פתיחת נסיעה חדשה</div>
            </div>
            <button className="btn-red" onClick={() => setStep('active-trip')}>
              🔴 עבור לנסיעה הפעילה
            </button>
          </>
        ) : (
          <button className="btn-red" onClick={() => setStep('select-driver')}>
            🚗 התחל נסיעה חדשה
          </button>
        )}
      </div>
    </div>
  )

  /* ─── SELECT DRIVER ─── */
  if (step === 'select-driver') return (
    <div>
      <SectionHeader title="בחר נהג מורשה" onBack={() => setStep('home')} sub={`${drivers.length} נהגים פעילים`} />
      <div style={{ padding: '12px 16px 24px' }}>
        {drivers.map(d => (
          <div key={d.id}
            onClick={() => { setSelectedDriver(d); setPinInput(''); setPinError(false); if (d.pin) setStep('pin-verify'); else setStep('select-purpose') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 13,
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 'var(--r)', padding: '13px 14px', marginBottom: 8, cursor: 'pointer',
              transition: 'background .12s, border-color .12s',
            }}>
            <Avatar name={d.name} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{d.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{d.rank}</div>
            </div>
            <span style={{ color: 'var(--text3)', fontSize: 16 }}>‹</span>
          </div>
        ))}
      </div>
    </div>
  )

  /* ─── PIN VERIFY ─── */
  if (step === 'pin-verify') return (
    <div>
      <SectionHeader title="אימות זהות" onBack={() => setStep('select-driver')} />
      <div style={{ padding: '24px 16px' }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r)', padding: '28px 20px', textAlign: 'center',
        }}>
          <Avatar name={selectedDriver?.name ?? ''} size={56} />
          <div style={{ marginTop: 14, fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{selectedDriver?.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>{selectedDriver?.rank}</div>
          <div className="field-label" style={{ textAlign: 'right' }}>קוד PIN אישי</div>
          <input
            type="password" inputMode="numeric" maxLength={4}
            value={pinInput}
            onChange={e => { setPinInput(e.target.value); setPinError(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                if (pinInput === selectedDriver?.pin) { setPinError(false); setStep('select-purpose') }
                else setPinError(true)
              }
            }}
            placeholder="• • • •"
            className="input"
            style={{
              fontSize: 28, textAlign: 'center', letterSpacing: 14, direction: 'ltr',
              marginBottom: pinError ? 8 : 16,
              borderColor: pinError ? 'var(--red)' : undefined,
            }}
            autoFocus
          />
          {pinError && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>קוד PIN שגוי — נסה שנית</div>}
          <button className="btn-red"
            onClick={() => { if (pinInput === selectedDriver?.pin) { setPinError(false); setStep('select-purpose') } else setPinError(true) }}>
            ✓ אמת וכנס
          </button>
        </div>
      </div>
    </div>
  )

  /* ─── SELECT PURPOSE ─── */
  if (step === 'select-purpose') return (
    <div>
      <SectionHeader title="מטרת הנסיעה" onBack={() => setStep('select-driver')} />

      {/* driver chip */}
      <div style={{
        margin: '12px 16px 4px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--lift)', border: '1px solid var(--edge)',
        borderRadius: 'var(--r2)', padding: '10px 12px',
      }}>
        <Avatar name={selectedDriver?.name ?? ''} size={30} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{selectedDriver?.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text3)' }}>{selectedDriver?.rank}</div>
        </div>
      </div>

      <div style={{ padding: '10px 16px 24px' }}>
        {TRIP_PURPOSES.map(p => (
          <div key={p.id}
            onClick={() => { setSelectedPurpose(p); if (p.id === 'event') setStep('alert-escort'); else setStep('checklist') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 'var(--r)', padding: '14px', marginBottom: 8, cursor: 'pointer',
            }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{p.icon}</span>
            <div style={{ fontSize: 14, fontWeight: 500, flex: 1, color: 'var(--text)' }}>{p.label}</div>
            <span style={{ color: 'var(--text3)', fontSize: 16 }}>‹</span>
          </div>
        ))}
      </div>
    </div>
  )

  /* ─── ALERT ESCORT ─── */
  if (step === 'alert-escort') return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{
        background: 'var(--red-dim)', border: '1px solid rgba(232,35,42,.3)',
        borderRadius: 'var(--r)', padding: '28px 20px', textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)', marginBottom: 10 }}>שים לב!</div>
        <div style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.75, fontWeight: 500 }}>
          חובת נסיעה עם רכב ליווי
        </div>
      </div>
      <button className="btn-red" onClick={() => setStep('checklist')}>✓ קראתי ואישרתי</button>
    </div>
  )

  /* ─── CHECKLIST ─── */
  if (step === 'checklist') return (
    <div>
      <SectionHeader
        title="בדיקות לפני נסיעה"
        onBack={() => setSelectedPurpose(null) || setStep('select-purpose')}
        sub={`${checked.size} מתוך ${checkItems.length} הושלמו`}
      />

      {/* progress bar */}
      <div style={{ height: 2, background: 'var(--line)', margin: 0 }}>
        <div style={{
          height: '100%',
          background: allChecked ? 'var(--green)' : 'var(--red)',
          width: `${pct}%`, transition: 'width .3s ease, background .4s ease',
          boxShadow: `0 0 6px ${allChecked ? 'var(--green)' : 'var(--red-glow)'}`,
        }} />
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        {/* checklist */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 12 }}>
          {checkItems.map((item, i) => (
            <div key={item.id} onClick={() => toggleCheck(item.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 13, padding: '13px 14px',
                borderBottom: i < checkItems.length - 1 ? '1px solid var(--line)' : 'none',
                cursor: 'pointer', opacity: checked.has(item.id) ? .4 : 1,
                transition: 'opacity .2s',
              }}>
              <div style={{
                width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: checked.has(item.id) ? 'var(--green)' : 'transparent',
                border: `1.5px solid ${checked.has(item.id) ? 'var(--green)' : 'var(--edge)'}`,
                transition: 'background .2s, border-color .2s',
              }}>
                {checked.has(item.id) && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
              <div style={{
                fontSize: 13, lineHeight: 1.55, color: 'var(--text)',
                textDecoration: checked.has(item.id) ? 'line-through' : 'none',
              }}>
                {item.text}
              </div>
            </div>
          ))}
        </div>

        {/* km + destination */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r)', padding: '14px', marginBottom: 12 }}>
          <label className="field-label">קריאת מד ק״מ</label>
          <input className="input" type="number" value={startKm}
            onChange={e => setStartKm(e.target.value)}
            placeholder={String(vehicleKm)}
            style={{ direction: 'ltr', textAlign: 'right', marginBottom: 12 }} />
          <label className="field-label">יעד הנסיעה (אופציונלי)</label>
          <input className="input" type="text" value={startDestination}
            onChange={e => setStartDestination(e.target.value)}
            placeholder="לדוגמה: תחנה מרכזית..."
            style={{ direction: 'rtl', marginBottom: 12 }} />
          <button className="btn-red"
            onClick={() => { if (allChecked && startKm) setStep('alert-height') }}
            disabled={!allChecked || !startKm}>
            המשך ›
          </button>
        </div>
      </div>
    </div>
  )

  /* ─── ALERT HEIGHT ─── */
  if (step === 'alert-height') return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{
        background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,.3)',
        borderRadius: 'var(--r)', padding: '28px 20px', textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>🚧</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--amber)', marginBottom: 10 }}>אזהרה!</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.9, fontWeight: 500 }}>
          גובה הרכב הוא <strong style={{ color: 'var(--text)' }}>4.50 מטרים</strong><br />
          אין לעבור מתחת לגשרים נמוכים מגובה הרכב<br />
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>נסיעה טובה! 🙏</span>
        </div>
      </div>
      <button className="btn-red" onClick={startTrip}>🚗 צא לדרך</button>
    </div>
  )

  /* ─── ACTIVE TRIP ─── */
  if (step === 'active-trip' && activeTrip) {
    const startTime = new Date(activeTrip.start_time)
    return (
      <div style={{ padding: '16px 16px 24px' }}>

        {/* live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 12, padding: '10px 14px',
          background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,.25)',
          borderRadius: 'var(--r)',
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)',
            boxShadow: '0 0 7px var(--amber)', flexShrink: 0,
            animation: 'pulse 1.4s ease infinite',
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>נסיעה פעילה</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>זכור לחזור ולסגור בסיום</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', direction: 'ltr' }}>
            {startTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* trip card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 12,
        }}>
          {/* driver row */}
          <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
            <Avatar name={activeTrip.driver_name ?? ''} size={44} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{activeTrip.driver_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{activeTrip.notes}</div>
            </div>
          </div>

          {/* stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {[
              { label: 'ק״מ התחלה', value: activeTrip.start_km?.toLocaleString() },
              { label: 'סטטוס',     value: 'בנסיעה' },
            ].map(({ label, value }, idx) => (
              <div key={label} style={{
                padding: '14px 16px', textAlign: 'center',
                borderLeft: idx === 0 ? '1px solid var(--line)' : 'none',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.02em' }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, letterSpacing: '.03em' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* end button */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--line)' }}>
            <button className="btn-red" onClick={() => setShowEndModal(true)}>🏁 סיים נסיעה</button>
          </div>
        </div>

        {/* end modal */}
        {showEndModal && (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.75)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 100, backdropFilter: 'blur(6px)',
          }}>
            <div style={{
              background: 'var(--panel)',
              borderRadius: '20px 20px 0 0',
              padding: '0 16px 36px',
              width: '100%', maxWidth: 390,
              border: '1px solid var(--line2)',
              borderBottom: 'none',
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--edge)', margin: '14px auto 20px' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>🏁 סיום נסיעה</div>
              <label className="field-label">ק״מ בסיום</label>
              <input className="input" type="number" value={endKm} onChange={e => setEndKm(e.target.value)}
                placeholder={String(activeTrip.start_km + 10)}
                style={{ direction: 'ltr', textAlign: 'right', marginBottom: 14 }} />
              <label className="field-label">הערות</label>
              <textarea className="input" value={endNote} onChange={e => setEndNote(e.target.value)} rows={2}
                placeholder="הערות לנסיעה..."
                style={{ resize: 'none', direction: 'rtl', marginBottom: 18 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-red" style={{ flex: 1, background: 'var(--green)' }}
                  onClick={endTrip} disabled={!endKm}>✓ אשר סיום</button>
                <button className="btn-ghost" style={{ width: 'auto', padding: '0 18px' }}
                  onClick={() => setShowEndModal(false)}>ביטול</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
