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

  const P = { padding: '0 16px 20px' }

  /* ─── HOME ─── */
  if (step === 'home') return (
    <div>
      {/* hero */}
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <img src="/chapak-hero.jpg" alt="חפ&quot;ק" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(17,19,24,.1) 0%, rgba(17,19,24,.85) 100%)' }} />
        <div style={{ position: 'absolute', bottom: 18, right: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>חפ&quot;ק כבאות והצלה</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.65)', marginTop: 3 }}>מערכת ניהול רכב מבצעי</div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 24px' }}>
        {activeTrip ? (
          <>
            <div style={{
              background: 'rgba(244,162,97,.08)',
              border: '1px solid var(--amber-border)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 12,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber)', marginBottom: 6 }}>⚠️ נסיעה פעילה קיימת</div>
              <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>
                <strong>{activeTrip.driver_name}</strong> נמצא בנסיעה פעילה
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>יש לסיים לפני פתיחת נסיעה חדשה</div>
            </div>
            <button className="btn-primary" onClick={() => setStep('active-trip')}>
              🔴 עבור לנסיעה הפעילה
            </button>
          </>
        ) : (
          <button className="btn-primary" onClick={() => setStep('select-driver')}>
            🚗 התחל נסיעה חדשה
          </button>
        )}
      </div>
    </div>
  )

  /* ─── SELECT DRIVER ─── */
  if (step === 'select-driver') return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div className="label">בחר נהג מורשה</div>
      {drivers.map(d => (
        <div key={d.id}
          onClick={() => { setSelectedDriver(d); setPinInput(''); setPinError(false); if (d.pin) setStep('pin-verify'); else setStep('select-purpose') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 13,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: '13px 14px', marginBottom: 8, cursor: 'pointer',
            transition: 'background .15s',
          }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            background: 'linear-gradient(135deg, #3a1a1a, #5c2a2a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: 'var(--red)', flexShrink: 0,
          }}>
            {d.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{d.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{d.rank}</div>
          </div>
          <span style={{ color: 'var(--dim)', fontSize: 18 }}>‹</span>
        </div>
      ))}
    </div>
  )

  /* ─── PIN VERIFY ─── */
  if (step === 'pin-verify') return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div className="label">אימות זהות</div>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16, padding: '28px 20px', textAlign: 'center',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 15,
          background: 'linear-gradient(135deg, #3a1a1a, #5c2a2a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: 'var(--red)', margin: '0 auto 14px',
        }}>
          {selectedDriver?.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{selectedDriver?.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24 }}>{selectedDriver?.rank}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>הכנס קוד PIN אישי</div>
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
          style={{
            background: 'var(--bg3)',
            border: `1.5px solid ${pinError ? 'var(--red)' : 'var(--border2)'}`,
            borderRadius: 12, padding: '14px 0', width: '100%',
            fontSize: 30, textAlign: 'center', letterSpacing: 14,
            marginBottom: pinError ? 8 : 16, direction: 'ltr',
            color: 'var(--text)', outline: 'none',
            transition: 'border-color .15s',
          }}
          autoFocus
        />
        {pinError && <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 12 }}>קוד PIN שגוי, נסה שנית</div>}
        <button className="btn-primary"
          onClick={() => { if (pinInput === selectedDriver?.pin) { setPinError(false); setStep('select-purpose') } else setPinError(true) }}>
          ✓ אמת וכנס
        </button>
        <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setStep('select-driver')}>
          חזור לבחירת נהג
        </button>
      </div>
    </div>
  )

  /* ─── SELECT PURPOSE ─── */
  if (step === 'select-purpose') return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setStep('select-driver')}
          style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
          › חזור
        </button>
        <div className="label" style={{ marginBottom: 0 }}>מטרת הנסיעה</div>
      </div>

      {/* selected driver chip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '10px 14px', marginBottom: 14,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #3a1a1a, #5c2a2a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'var(--red)',
        }}>
          {selectedDriver?.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{selectedDriver?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{selectedDriver?.rank}</div>
        </div>
      </div>

      {TRIP_PURPOSES.map(p => (
        <div key={p.id}
          onClick={() => { setSelectedPurpose(p); if (p.id === 'event') setStep('alert-escort'); else setStep('checklist') }}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 13, padding: '14px', marginBottom: 8, cursor: 'pointer',
            transition: 'background .15s',
          }}>
          <span style={{ fontSize: 24 }}>{p.icon}</span>
          <div style={{ fontSize: 14, fontWeight: 500, flex: 1, color: 'var(--text)' }}>{p.label}</div>
          <span style={{ color: 'var(--dim)', fontSize: 18 }}>‹</span>
        </div>
      ))}
    </div>
  )

  /* ─── ALERT ESCORT ─── */
  if (step === 'alert-escort') return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div style={{
        background: 'rgba(230,57,70,.07)',
        border: '1.5px solid var(--red-border)',
        borderRadius: 16, padding: '28px 20px', textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>⚠️</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--red)', marginBottom: 10, letterSpacing: '-.01em' }}>שים לב!</div>
        <div style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.75, fontWeight: 500 }}>
          חובת נסיעה עם רכב ליווי
        </div>
      </div>
      <button className="btn-primary" onClick={() => setStep('checklist')}>✓ קראתי ואישרתי</button>
    </div>
  )

  /* ─── CHECKLIST ─── */
  if (step === 'checklist') return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>בדיקות לפני נסיעה</div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: allChecked ? 'var(--green-bg)' : 'var(--red-bg)',
          color: allChecked ? 'var(--green)' : 'var(--red)',
          border: `1px solid ${allChecked ? 'var(--green-border)' : 'var(--red-border)'}`,
        }}>{checked.size}/{checkItems.length}</span>
      </div>

      {/* progress bar */}
      <div style={{ background: 'var(--bg3)', borderRadius: 4, height: 4, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg, var(--red), ${allChecked ? 'var(--green)' : 'var(--red)'})`, borderRadius: 4, width: `${pct}%`, transition: 'width .3s, background .5s' }} />
      </div>

      {/* checklist */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
        {checkItems.map((item, i) => (
          <div key={item.id} onClick={() => toggleCheck(item.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 13, padding: '13px 14px',
              borderBottom: i < checkItems.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer', opacity: checked.has(item.id) ? .4 : 1,
              transition: 'opacity .2s',
            }}>
            <div style={{
              width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: checked.has(item.id) ? 'var(--green)' : 'transparent',
              border: `1.5px solid ${checked.has(item.id) ? 'var(--green)' : 'var(--border2)'}`,
              transition: 'background .2s, border-color .2s',
            }}>
              {checked.has(item.id) && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
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
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>קריאת מד ק&quot;מ בתחילת נסיעה</label>
        <input
          className="input"
          type="number" value={startKm}
          onChange={e => setStartKm(e.target.value)}
          placeholder={String(vehicleKm)}
          style={{ direction: 'ltr', textAlign: 'right', marginBottom: 12 }}
        />
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>יעד הנסיעה (אופציונלי)</label>
        <input
          className="input"
          type="text" value={startDestination}
          onChange={e => setStartDestination(e.target.value)}
          placeholder="לדוגמה: תחנה מרכזית..."
          style={{ direction: 'rtl', marginBottom: 12 }}
        />
        <button className="btn-primary"
          onClick={() => { if (allChecked && startKm) setStep('alert-height') }}
          disabled={!allChecked || !startKm}>
          המשך ›
        </button>
      </div>
    </div>
  )

  /* ─── ALERT HEIGHT ─── */
  if (step === 'alert-height') return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div style={{
        background: 'rgba(244,162,97,.07)',
        border: '1.5px solid var(--amber-border)',
        borderRadius: 16, padding: '28px 20px', textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>🚧</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--amber)', marginBottom: 10, letterSpacing: '-.01em' }}>אזהרה!</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.9, fontWeight: 500 }}>
          גובה הרכב הוא <strong style={{ color: 'var(--text)' }}>4.50 מטרים</strong><br />
          אין לעבור מתחת לגשרים נמוכים מגובה הרכב<br />
          <span style={{ color: 'var(--green)', fontWeight: 700 }}>נסיעה טובה! 🙏</span>
        </div>
      </div>
      <button className="btn-primary" onClick={startTrip}>🚗 צא לדרך</button>
    </div>
  )

  /* ─── ACTIVE TRIP ─── */
  if (step === 'active-trip' && activeTrip) return (
    <div style={{ padding: '16px 16px 24px' }}>
      {/* reminder */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '11px 14px', marginBottom: 12,
      }}>
        <span style={{ fontSize: 18 }}>📋</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>ניתן לעבור לטאב מפעיל</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>זכור לחזור ולסגור את הנסיעה בסיום</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, color: 'var(--amber)',
          background: 'var(--amber-bg)', padding: '3px 9px',
          borderRadius: 20, border: '1px solid var(--amber-border)',
        }}>פעיל</span>
      </div>

      {/* trip card */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '18px', marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 12,
            background: 'linear-gradient(135deg, #3a1a1a, #5c2a2a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'var(--red)',
          }}>
            {activeTrip.driver_name?.slice(0, 2)}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{activeTrip.driver_name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {activeTrip.notes} · {new Date(activeTrip.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            { label: 'ק"מ התחלה', value: activeTrip.start_km?.toLocaleString(), color: 'var(--text)' },
            { label: 'סטטוס', value: 'בנסיעה', color: 'var(--amber)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={() => setShowEndModal(true)}>🏁 סיים נסיעה</button>
      </div>

      {/* end modal */}
      {showEndModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.7)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 100,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'var(--bg2)',
            borderRadius: '20px 20px 0 0',
            padding: '22px 18px 36px',
            width: '100%', maxWidth: 390,
            border: '1px solid var(--border)',
            borderBottom: 'none',
          }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)', margin: '0 auto 20px' }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>🏁 סיום נסיעה</div>
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>ק&quot;מ בסיום</label>
            <input className="input" type="number" value={endKm} onChange={e => setEndKm(e.target.value)}
              placeholder={String(activeTrip.start_km + 10)}
              style={{ direction: 'ltr', textAlign: 'right', marginBottom: 14 }} />
            <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6, fontWeight: 600 }}>הערות</label>
            <textarea className="input" value={endNote} onChange={e => setEndNote(e.target.value)} rows={2}
              placeholder="הערות לנסיעה..."
              style={{ resize: 'none', direction: 'rtl', marginBottom: 18 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-primary" style={{ flex: 1, background: 'var(--green)' }}
                onClick={endTrip} disabled={!endKm}>✓ אשר סיום</button>
              <button className="btn-ghost" style={{ width: 'auto', padding: '0 18px' }}
                onClick={() => setShowEndModal(false)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return null
}
