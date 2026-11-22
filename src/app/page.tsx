'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TripTab from '@/components/TripTab'
import OperatorTab from '@/components/OperatorTab'
import AdminTab from '@/components/AdminTab'
import ScheduleTab from '@/components/ScheduleTab'
import { usePushNotifications } from '@/hooks/usePushNotifications'

type Tab = 'trip' | 'operator' | 'schedule' | 'admin'

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'trip',     label: 'נסיעה',  icon: '🚗' },
  { id: 'operator', label: 'מפעיל', icon: '📡' },
  { id: 'schedule', label: 'שבצ"ק', icon: '📅' },
  { id: 'admin',    label: 'אדמין',  icon: '🔒' },
]

export default function Home() {
  const [tab, setTab] = useState<Tab>('trip')
  const [activeTrip, setActiveTrip] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showBanner, setShowBanner] = useState(false)
  const [pushName, setPushName] = useState('')
  const [now, setNow] = useState(new Date())
  const { status, subscribe } = usePushNotifications()

  useEffect(() => {
    supabase.from('trips').select('*').eq('status', 'active').single()
      .then(({ data }) => { if (data) setActiveTrip(data); setLoading(false) })
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!loading && (status === 'default' || status === 'needs-pwa'))
      setTimeout(() => setShowBanner(true), 2500)
  }, [loading, status])

  async function handleSubscribe() {
    const ok = await subscribe(pushName || 'משתמש')
    if (ok) setShowBanner(false)
  }

  if (loading) return (
    <div className="phone" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--t3)', fontSize: 12, letterSpacing: '.06em' }}>LOADING SYSTEM...</div>
    </div>
  )

  const isActive = !!activeTrip
  const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' })

  return (
    <div className="phone">

      {/* ══════════ COMMAND HEADER ══════════ */}
      <div style={{
        background: 'var(--panel)',
        borderBottom: '1px solid var(--line)',
        flexShrink: 0,
      }}>
        {/* top bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '10px 14px 0',
          gap: 10,
        }}>
          {/* logo */}
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            overflow: 'hidden', flexShrink: 0,
            border: '1px solid var(--edge)',
          }}>
            <img src="/chapak-hero.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          {/* unit name */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-.01em', lineHeight: 1 }}>
              חפ&quot;ק נציב כבאות
            </div>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2, letterSpacing: '.03em' }}>לפיד 10 · מערכת מבצעית</div>
          </div>

          {/* clock */}
          <div style={{ textAlign: 'left', flexShrink: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-.01em', lineHeight: 1, direction: 'ltr' }}>{timeStr}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2, direction: 'rtl' }}>{dateStr}</div>
          </div>
        </div>

        {/* status strip */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '10px 14px',
          gap: 8,
          marginTop: 8,
          borderTop: '1px solid var(--line)',
          background: isActive ? 'rgba(245,166,35,.06)' : 'rgba(0,212,126,.05)',
        }}>
          {/* dot */}
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: isActive ? 'var(--amber)' : 'var(--green)',
            boxShadow: `0 0 10px ${isActive ? 'var(--amber)' : 'var(--green)'}`,
            animation: isActive ? 'pulse-dot 1.5s ease infinite' : 'none',
          }} />

          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? 'var(--amber)' : 'var(--green)' }}>
              {isActive ? 'נסיעה פעילה' : 'רכב פנוי'}
            </span>
            {isActive && (
              <span style={{ fontSize: 11, color: 'var(--t2)', marginRight: 6 }}>
                · {activeTrip.driver_name}
              </span>
            )}
          </div>

          {/* km readout */}
          <div style={{
            fontSize: 11, color: 'var(--t3)',
            fontVariantNumeric: 'tabular-nums', direction: 'ltr',
          }}>
            {isActive ? `${activeTrip.start_km?.toLocaleString()} ק"מ` : ''}
          </div>
        </div>
      </div>

      {/* ══════════ PUSH BANNER ══════════ */}
      {showBanner && (
        <div style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          padding: '14px 16px',
          flexShrink: 0,
          animation: 'glow-in .25s ease',
        }}>
          {status === 'needs-pwa' ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>🔔 הפעל התראות על אייפון</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.75, marginBottom: 12 }}>
                לחץ <strong style={{ color: 'var(--t1)' }}>⬆️ שתף</strong> בתחתית Safari ←{' '}
                <strong style={{ color: 'var(--t1)' }}>&quot;הוסף למסך הבית&quot;</strong> ← פתח מהאייקון
              </div>
              <button className="btn-ghost" onClick={() => setShowBanner(false)}>הבנתי</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>🔔 הפעל התראות</div>
              <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 10 }}>קבל עדכונים על שבצ&quot;ק ועדכוני מפקד</div>
              <input className="input" value={pushName} onChange={e => setPushName(e.target.value)}
                placeholder="השם שלך (לדוגמה: משה נהג)" style={{ direction: 'rtl', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-red" style={{ flex: 1 }} onClick={handleSubscribe}>✓ הפעל</button>
                <button className="btn-ghost" style={{ width: 'auto', padding: '0 16px', height: 50 }}
                  onClick={() => setShowBanner(false)}>אחר כך</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══════════ CONTENT ══════════ */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {tab === 'trip'     && <TripTab activeTrip={activeTrip} onTripStart={setActiveTrip} onTripEnd={() => setActiveTrip(null)} />}
        {tab === 'operator' && <OperatorTab />}
        {tab === 'schedule' && <ScheduleTab />}
        {tab === 'admin'    && <AdminTab />}
      </div>

      {/* ══════════ NAV ══════════ */}
      <nav style={{
        background: 'var(--panel)',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        flexShrink: 0,
        paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
      }}>
        {NAV.map(item => {
          const on = tab === item.id
          return (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                border: 'none', background: 'none', cursor: 'pointer',
                padding: '10px 0 4px',
                position: 'relative',
              }}>
              {/* active indicator */}
              {on && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 28, height: 2,
                  borderRadius: '0 0 3px 3px',
                  background: 'var(--red)',
                  boxShadow: '0 0 10px var(--red-glow)',
                }} />
              )}
              <span style={{
                fontSize: 20,
                opacity: on ? 1 : .3,
                transition: 'opacity .15s',
                filter: on ? 'none' : 'grayscale(1)',
              }}>{item.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: on ? 700 : 400,
                color: on ? 'var(--red)' : 'var(--t3)',
                transition: 'color .15s',
                letterSpacing: '.02em',
              }}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* footer */}
      <div style={{
        background: 'var(--black)',
        padding: '4px 0 max(4px, env(safe-area-inset-bottom))',
        textAlign: 'center',
        fontSize: 9,
        color: 'var(--t3)',
        letterSpacing: '.04em',
        flexShrink: 0,
      }}>
        פותח ע&quot;י עידן פינצבסקי · כל הזכויות שמורות
      </div>
    </div>
  )
}
