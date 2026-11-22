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
  const { status, subscribe } = usePushNotifications()

  useEffect(() => {
    supabase.from('trips').select('*').eq('status', 'active').single()
      .then(({ data }) => { if (data) setActiveTrip(data); setLoading(false) })
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
      <div style={{ color: 'var(--text3)', fontSize: 13, letterSpacing: '.05em' }}>טוען מערכת...</div>
    </div>
  )

  const isActive = !!activeTrip

  return (
    <div className="phone">

      {/* ════ STATUS BAR ════ */}
      <div style={{
        background: 'var(--black)',
        borderBottom: '1px solid var(--line)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        {/* logo block */}
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          overflow: 'hidden', flexShrink: 0,
          border: '1px solid var(--edge)',
        }}>
          <img src="/chapak-hero.jpg" alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em', lineHeight: 1 }}>
            חפ&quot;ק נציב כבאות
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>לפיד 10</div>
        </div>

        {/* live status chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px',
          borderRadius: 20,
          border: `1px solid ${isActive ? 'rgba(245,158,11,.3)' : 'rgba(0,208,132,.25)'}`,
          background: isActive ? 'var(--amber-dim)' : 'var(--green-dim)',
          fontSize: 11, fontWeight: 700,
          color: isActive ? 'var(--amber)' : 'var(--green)',
          letterSpacing: '.01em',
          whiteSpace: 'nowrap',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: isActive ? 'var(--amber)' : 'var(--green)',
            boxShadow: `0 0 7px ${isActive ? 'var(--amber)' : 'var(--green)'}`,
            animation: isActive ? 'pulse 1.4s ease infinite' : 'none',
            flexShrink: 0,
          }} />
          {isActive ? activeTrip.driver_name : 'פנוי'}
        </div>
      </div>

      {/* ════ PUSH BANNER ════ */}
      {showBanner && (
        <div style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          padding: '14px',
          flexShrink: 0,
        }}>
          {status === 'needs-pwa' ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>🔔 הפעל התראות על אייפון</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.75, marginBottom: 12 }}>
                לחץ <strong style={{ color: 'var(--text)' }}>⬆️ שתף</strong> בתחתית Safari ← <strong style={{ color: 'var(--text)' }}>"הוסף למסך הבית"</strong> ← פתח מהאייקון
              </div>
              <button className="btn-ghost" onClick={() => setShowBanner(false)}>הבנתי</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🔔 הפעל התראות</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>קבל עדכונים על שבצ&quot;ק ועדכוני מפקד</div>
              <input className="input" value={pushName} onChange={e => setPushName(e.target.value)}
                placeholder="השם שלך (לדוגמה: משה נהג)" style={{ direction: 'rtl', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-red" style={{ flex: 1 }} onClick={handleSubscribe}>✓ הפעל</button>
                <button className="btn-ghost" style={{ width: 'auto', padding: '0 16px' }} onClick={() => setShowBanner(false)}>אחר כך</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════ CONTENT ════ */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'trip'     && <TripTab activeTrip={activeTrip} onTripStart={setActiveTrip} onTripEnd={() => setActiveTrip(null)} />}
        {tab === 'operator' && <OperatorTab />}
        {tab === 'schedule' && <ScheduleTab />}
        {tab === 'admin'    && <AdminTab />}
      </div>

      {/* ════ NAV ════ */}
      <nav style={{
        background: 'var(--black)',
        borderTop: '1px solid var(--line)',
        display: 'flex',
        flexShrink: 0,
        padding: '0 0 max(4px, env(safe-area-inset-bottom))',
      }}>
        {NAV.map(item => {
          const on = tab === item.id
          return (
            <button key={item.id} onClick={() => setTab(item.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 4,
                border: 'none', background: 'none', cursor: 'pointer',
                padding: '10px 0 6px',
                position: 'relative',
              }}>
              {on && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'block', width: 24, height: 2,
                  borderRadius: '0 0 2px 2px',
                  background: 'var(--red)',
                  boxShadow: '0 0 8px var(--red-glow)',
                }} />
              )}
              <span style={{ fontSize: 19, opacity: on ? 1 : .35, transition: 'opacity .15s' }}>{item.icon}</span>
              <span style={{
                fontSize: 10, fontWeight: on ? 700 : 400,
                color: on ? 'var(--red)' : 'var(--text3)',
                transition: 'color .15s',
              }}>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* ════ FOOTER ════ */}
      <div style={{
        background: 'var(--black)',
        borderTop: '1px solid var(--line)',
        padding: '5px 0',
        textAlign: 'center',
        fontSize: 10,
        color: 'var(--text3)',
        flexShrink: 0,
      }}>
        פותח ע&quot;י עידן פינצבסקי · כל הזכויות שמורות
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
      `}</style>
    </div>
  )
}
