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
  { id: 'refresh', label: 'נסיעת ריענון נהיגה',  icon: '🚗' },
]

type Step = 'home' | 'select-driver' | 'pin-verify' | 'select-purpose' | 'alert-escort' | 'checklist' | 'alert-height' | 'active-trip'

interface Props {
  activeTrip: any
  onTripStart: (trip: any) => void
  onTripEnd: () => void
}

function Initials({ name, size = 42 }: { name: string; size?: number }) {
  const ini = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * .28),
      background: 'linear-gradient(145deg, #1e1010 0%, #2d1414 100%)',
      border: '1px solid rgba(232,35,42,.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * .34), fontWeight: 800,
      color: 'var(--red)', flexShrink: 0,
    }}>{ini}</div>
  )
}

function PageHeader({ title, sub, onBack }: { title: string; sub?: string; onBack?: () => void }) {
  return (
    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', flexShrink: 0 }}>
      {onBack && (
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 700, color: 'var(--red)',
          letterSpacing: '.04em', marginBottom: 8,
        }}>← חזור</button>
      )}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-.01em' }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{sub}</div>}
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
      await supabase.from('vehicle_stats').update({ current_km: parseInt(startKm), updated_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000')
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
    await supabase.from('vehicle_stats').update({ current_km: parseInt(endKm), updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000')
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
      <div style={{ position: 'relative', height: 190, overflow: 'hidden' }}>
        <img src="/chapak-hero.jpg" alt="חפ״ק"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to bottom, rgba(7,8,10,.15) 0%, rgba(7,8,10,.92) 100%)',
        }} />

        {/* km badge — top left */}
        <div style={{
          position: 'absolute', top: 12, left: 12,
          background: 'rgba(7,8,10,.8)', backdropFilter: 'blur(10px) saturate(1.2)',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 7, padding: '6px 11px',
        }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', letterSpacing: '.06em', marginBottom: 2 }}>מד ק״מ</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', direction: 'ltr', letterSpacing: '-.01em' }}>
            {vehicleKm.toLocaleString()}
          </div>
        </div>

        {/* title — bottom right */}
        <div style={{ position: 'absolute', bottom: 14, right: 14 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '.06em', marginBottom: 4 }}>
            חפ״ק כבאות · לפיד 10
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.1 }}>
            מערכת ניהול רכב מבצעי
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 28px' }}>
        {activeTrip ? (
          <>
            <div style={{
              background: 'rgba(245,166,35,.07)',
              border: '1px solid rgba(245,166,35,.22)',
              borderRight: '3px solid var(--amber)',
              borderRadius: 'var(--r)', padding: '13px 15px', marginBottom: 12,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--amber)', letterSpacing: '.06em', marginBottom: 5 }}>
                ⚠ נסיעה פעילה קיימת
              </div>
              <div style={{ fontSize: 13, color: 'var(--t1)' }}>
                <strong>{activeTrip.driver_name}</strong> נמצא בנסיעה פעילה
              </div>
              <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 2 }}>יש לסיים לפני פתיחת נסיעה חדשה</div>
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
      <PageHeader title="בחר נהג מורשה" onBack={() => setStep('home')} sub={`${drivers.length} נהגים פעילים`} />
      <div style={{ padding: '12px 16px 24px' }}>
        {drivers.map(d => (
          <div key={d.id}
            onClick={() => {
              setSelectedDriver(d); setPinInput(''); setPinError(false)
              if (d.pin) setStep('pin-verify'); else setStep('select-purpose')
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 13,
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 'var(--r)', padding: '13px 14px',
              marginBottom: 8, cursor: 'pointer',
            }}>
            <Initials name={d.name} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{d.name}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{d.rank}</div>
            </div>
            {d.pin && (
              <div style={{
                fontSize: 9, fontWeight: 700, color: 'var(--t3)',
                border: '1px solid var(--edge)', borderRadius: 4,
                padding: '2px 6px', letterSpacing: '.04em',
              }}>PIN</div>
            )}
            <span style={{ color: 'var(--t3)', fontSize: 15, marginRight: 2 }}>‹</span>
          </div>
        ))}
      </div>
    </div>
  )

  /* ─── PIN VERIFY ─── */
  if (step === 'pin-verify') return (
    <div>
      <PageHeader title="אימות זהות" onBack={() => setStep('select-driver')} />
      <div style={{ padding: '24px 16px' }}>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r)', padding: '28px 20px', textAlign: 'center',
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Initials name={selectedDriver?.name ?? ''} size={56} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)' }}>{selectedDriver?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 24 }}>{selectedDriver?.rank}</div>
          <div className="field-label" style={{ textAlign: 'right' }}>קוד PIN אישי</div>
          <input
            type="password" inputMode="numeric" maxLength={4}
            value={pinInput}
            onChange={e => { setPinInput(e.target.value); setPinError(false) }}
            onKeyDown={e => {
              if (e.key !== 'Enter') return
              if (pinInput === selectedDriver?.pin) { setPinError(false); setStep('select-purpose') }
              else setPinError(true)
            }}
            placeholder="• • • •"
            className="input"
            style={{
              fontSize: 28, textAlign: 'center', letterSpacing: 14,
              direction: 'ltr', marginBottom: pinError ? 8 : 16,
              borderColor: pinError ? 'var(--red)' : undefined,
            }}
            autoFocus
          />
          {pinError && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12, fontWeight: 500 }}>
              קוד PIN שגוי — נסה שנית
            </div>
          )}
          <button className="btn-red"
            onClick={() => {
              if (pinInput === selectedDriver?.pin) { setPinError(false); setStep('select-purpose') }
              else setPinError(true)
            }}>✓ אמת וכנס</button>
        </div>
      </div>
    </div>
  )

  /* ─── SELECT PURPOSE ─── */
  if (step === 'select-purpose') return (
    <div>
      <PageHeader title="מטרת הנסיעה" onBack={() => setStep('select-driver')} />

      {/* driver chip */}
      <div style={{
        margin: '12px 16px 4px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--lift)', border: '1px solid var(--edge)',
        borderRadius: 'var(--r2)', padding: '9px 12px',
      }}>
        <Initials name={selectedDriver?.name ?? ''} size={30} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{selectedDriver?.name}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)' }}>{selectedDriver?.rank}</div>
        </div>
      </div>

      <div style={{ padding: '10px 16px 24px' }}>
        {TRIP_PURPOSES.map(p => (
          <div key={p.id}
            onClick={() => { setSelectedPurpose(p); if (p.id === 'event') setStep('alert-escort'); else setStep('checklist') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 'var(--r)', padding: '14px',
              marginBottom: 8, cursor: 'pointer',
            }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{p.icon}</span>
            <div style={{ fontSize: 14, fontWeight: 500, flex: 1, color: 'var(--t1)' }}>{p.label}</div>
            <span style={{ color: 'var(--t3)', fontSize: 15 }}>‹</span>
          </div>
        ))}
      </div>
    </div>
  )

  /* ─── ALERT ESCORT ─── */
  if (step === 'alert-escort') return (
    <div style={{ padding: '24px 16px' }}>
      <div style={{
        background: 'rgba(232,35,42,.07)', border: '1px solid var(--red-border)',
        borderRadius: 'var(--r)', padding: '28px 20px', textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)', marginBottom: 10 }}>שים לב!</div>
        <div style={{ fontSize: 15, color: 'var(--t2)', lineHeight: 1.75, fontWeight: 500 }}>
          חובת נסיעה עם רכב ליווי
        </div>
      </div>
      <button className="btn-red" onClick={() => setStep('checklist')}>✓ קראתי ואישרתי</button>
    </div>
  )

  /* ─── CHECKLIST ─── */
  if (step === 'checklist') return (
    <div>
      <PageHeader
        title="בדיקות לפני נסיעה"
        onBack={() => { setSelectedPurpose(null); setStep('select-purpose') }}
        sub={`${checked.size} מתוך ${checkItems.length} הושלמו`}
      />

      {/* progress line */}
      <div style={{ height: 2, background: 'var(--line)' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: allChecked ? 'var(--green)' : 'var(--red)',
          boxShadow: `0 0 8px ${allChecked ? 'var(--green)' : 'var(--red-glow)'}`,
          transition: 'width .3s ease, background .4s ease',
        }} />
      </div>

      <div style={{ padding: '12px 16px 24px' }}>
        {/* checklist */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 12,
        }}>
          {checkItems.map((item, i) => (
            <div key={item.id} onClick={() => toggleCheck(item.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 13, padding: '13px 14px',
                borderBottom: i < checkItems.length - 1 ? '1px solid var(--line)' : 'none',
                cursor: 'pointer',
                opacity: checked.has(item.id) ? .4 : 1,
                transition: 'opacity .2s',
              }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: checked.has(item.id) ? 'var(--green)' : 'transparent',
                border: `1.5px solid ${checked.has(item.id) ? 'var(--green)' : 'var(--edge)'}`,
                transition: 'all .18s',
              }}>
                {checked.has(item.id) && (
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>
                )}
              </div>
              <div style={{
                fontSize: 13, lineHeight: 1.55, color: 'var(--t1)',
                textDecoration: checked.has(item.id) ? 'line-through' : 'none',
              }}>{item.text}</div>
            </div>
          ))}
        </div>

        {/* km + destination */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r)', padding: '14px', marginBottom: 12,
        }}>
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
        background: 'rgba(245,166,35,.07)', border: '1px solid rgba(245,166,35,.28)',
        borderRadius: 'var(--r)', padding: '28px 20px', textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>🚧</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--amber)', marginBottom: 10 }}>אזהרה!</div>
        <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.9, fontWeight: 500 }}>
          גובה הרכב הוא <strong style={{ color: 'var(--t1)' }}>4.50 מטרים</strong><br />
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
      <div style={{ padding: '16px 16px 28px' }}>

        {/* live strip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          padding: '10px 14px',
          background: 'rgba(245,166,35,.07)', border: '1px solid rgba(245,166,35,.2)',
          borderRadius: 'var(--r)',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: 'var(--amber)', boxShadow: '0 0 8px var(--amber)',
            animation: 'pulse-dot 1.5s ease infinite',
          }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>נסיעה פעילה</span>
            <span style={{ fontSize: 11, color: 'var(--t2)', marginRight: 6 }}>· זכור לחזור ולסגור בסיום</span>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t2)', direction: 'ltr' }}>
            {startTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* trip card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 12,
        }}>
          {/* driver */}
          <div style={{ padding: '15px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
            <Initials name={activeTrip.driver_name ?? ''} size={44} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{activeTrip.driver_name}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{activeTrip.notes}</div>
            </div>
          </div>

          {/* stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--line)' }}>
            {[
              { label: 'ק״מ התחלה', val: activeTrip.start_km?.toLocaleString(), color: 'var(--t1)' },
              { label: 'סטטוס',     val: 'בנסיעה',                               color: 'var(--amber)' },
            ].map(({ label, val, color }, i) => (
              <div key={label} style={{
                padding: '14px 0', textAlign: 'center',
                borderLeft: i === 0 ? '1px solid var(--line)' : 'none',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color, letterSpacing: '-.02em' }}>{val}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 3, letterSpacing: '.03em' }}>{label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '12px 14px' }}>
            <button className="btn-red" onClick={() => setShowEndModal(true)}>🏁 סיים נסיעה</button>
          </div>
        </div>

        {/* end modal */}
        {showEndModal && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}>
            <div style={{
              background: 'var(--panel)', borderRadius: '18px 18px 0 0',
              padding: '0 16px 36px',
              width: '100%', maxWidth: 390,
              border: '1px solid var(--line2)', borderBottom: 'none',
            }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--edge)', margin: '14px auto 20px' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 18 }}>🏁 סיום נסיעה</div>
              <label className="field-label">ק״מ בסיום</label>
              <input className="input" type="number" value={endKm}
                onChange={e => setEndKm(e.target.value)}
                placeholder={String(activeTrip.start_km + 10)}
                style={{ direction: 'ltr', textAlign: 'right', marginBottom: 14 }} />
              <label className="field-label">הערות</label>
              <textarea className="input" value={endNote} onChange={e => setEndNote(e.target.value)}
                rows={2} placeholder="הערות לנסיעה..."
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
