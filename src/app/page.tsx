'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TripTab from '@/components/TripTab'
import OperatorTab from '@/components/OperatorTab'
import AdminTab from '@/components/AdminTab'
import ScheduleTab from '@/components/ScheduleTab'
import { usePushNotifications } from '@/hooks/usePushNotifications'

type Tab = 'trip' | 'operator' | 'schedule' | 'admin'

const NAV_ITEMS = [
  { id: 'trip',     icon: '🚗', label: 'נסיעה'  },
  { id: 'operator', icon: '📡', label: 'מפעיל'  },
  { id: 'schedule', icon: '📅', label: 'שבצ"ק'  },
  { id: 'admin',    icon: '🔒', label: 'אדמין'  },
]

export default function Home() {
  const [tab, setTab] = useState<Tab>('trip')
  const [activeTrip, setActiveTrip] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPushBanner, setShowPushBanner] = useState(false)
  const [pushName, setPushName] = useState('')
  const { status, subscribe } = usePushNotifications()

  useEffect(() => {
    supabase.from('trips').select('*').eq('status', 'active').single()
      .then(({ data }) => { if (data) setActiveTrip(data); setLoading(false) })
  }, [])

  useEffect(() => {
    if (!loading && (status === 'default' || status === 'needs-pwa'))
      setTimeout(() => setShowPushBanner(true), 2000)
  }, [loading, status])

  async function handleSubscribe() {
    const success = await subscribe(pushName || 'משתמש')
    if (success) setShowPushBanner(false)
  }

  if (loading) return (
    <div className="phone" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--muted)', fontSize: 14 }}>טוען...</div>
    </div>
  )

  return (
    <div className="phone">

      {/* ─── TOP BAR ─── */}
      <header style={{
        background: 'var(--bg2)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, overflow: 'hidden',
            flexShrink: 0, border: '1.5px solid var(--border2)',
          }}>
            <img src="/chapak-hero.jpg" alt="חפק" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' }}>חפ&quot;ק נציב כבאות</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>לפיד 10</div>
          </div>
        </div>

        {/* status pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, fontWeight: 600,
          background: activeTrip ? 'rgba(244,162,97,.12)' : 'rgba(45,198,83,.1)',
          color: activeTrip ? 'var(--amber)' : 'var(--green)',
          border: `1px solid ${activeTrip ? 'var(--amber-border)' : 'var(--green-border)'}`,
          padding: '5px 11px', borderRadius: 20,
          letterSpacing: '.01em',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: activeTrip ? 'var(--amber)' : 'var(--green)',
            boxShadow: activeTrip ? '0 0 6px var(--amber)' : '0 0 6px var(--green)',
          }} />
          {activeTrip ? `${activeTrip.driver_name}` : 'פנוי'}
        </div>
      </header>

      {/* ─── PUSH BANNER ─── */}
      {showPushBanner && (
        <div style={{
          background: 'var(--bg3)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 16px',
          flexShrink: 0,
        }}>
          {status === 'needs-pwa' ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>🔔 הפעל התראות על אייפון</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 10 }}>
                1. לחץ <strong style={{ color: 'var(--text2)' }}>⬆️ שתף</strong> בתחתית Safari<br />
                2. בחר <strong style={{ color: 'var(--text2)' }}>"הוסף למסך הבית"</strong><br />
                3. פתח מהאייקון החדש
              </div>
              <button className="btn-ghost" onClick={() => setShowPushBanner(false)}>הבנתי</button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>🔔 הפעל התראות</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>קבל עדכונים על שבצ&quot;ק ועדכוני מפקד</div>
              <input
                className="input"
                value={pushName}
                onChange={e => setPushName(e.target.value)}
                placeholder="מה השם שלך? (לדוגמה: משה נהג)"
                style={{ marginBottom: 8, direction: 'rtl' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleSubscribe}>✓ הפעל</button>
                <button className="btn-ghost" style={{ width: 'auto', padding: '0 16px' }} onClick={() => setShowPushBanner(false)}>אחר כך</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── CONTENT ─── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'trip'     && <TripTab activeTrip={activeTrip} onTripStart={setActiveTrip} onTripEnd={() => setActiveTrip(null)} />}
        {tab === 'operator' && <OperatorTab />}
        {tab === 'schedule' && <ScheduleTab />}
        {tab === 'admin'    && <AdminTab />}
      </div>

      {/* ─── BOTTOM NAV ─── */}
      <nav style={{
        background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        padding: '6px 0 max(8px, env(safe-area-inset-bottom))',
        flexShrink: 0,
      }}>
        {NAV_ITEMS.map(item => {
          const active = tab === item.id
          return (
            <button key={item.id} onClick={() => setTab(item.id as Tab)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                border: 'none', background: 'none', cursor: 'pointer', padding: '5px 0',
                position: 'relative',
              }}>
              {active && (
                <div style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 2.5, borderRadius: 2,
                  background: 'var(--red)',
                }} />
              )}
              <span style={{ fontSize: 20, filter: active ? 'none' : 'grayscale(1) opacity(.4)' }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? 'var(--red)' : 'var(--dim)', letterSpacing: '.01em' }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* ─── FOOTER ─── */}
      <div style={{
        background: 'var(--bg2)',
        borderTop: '1px solid var(--border)',
        padding: '5px 0',
        textAlign: 'center',
        fontSize: 10,
        color: 'var(--dim)',
        flexShrink: 0,
      }}>
        פותח ע&quot;י עידן פינצבסקי · כל הזכויות שמורות
      </div>
    </div>
  )
}
