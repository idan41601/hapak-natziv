'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import TripTab from '@/components/TripTab'
import OperatorTab from '@/components/OperatorTab'
import AdminTab from '@/components/AdminTab'
import ScheduleTab from '@/components/ScheduleTab'
import NotificationsTab from '@/components/NotificationsTab'
import { usePushNotifications } from '@/hooks/usePushNotifications'

type Tab = 'trip' | 'operator' | 'schedule' | 'admin' | 'notifications'

export default function Home() {
  const [tab, setTab] = useState<Tab>('trip')
  const [activeTrip, setActiveTrip] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPushBanner, setShowPushBanner] = useState(false)
  const [pushName, setPushName] = useState('')
  const { permission, subscribed, subscribe } = usePushNotifications()

  useEffect(() => {
    supabase.from('trips').select('*').eq('status', 'active').single()
      .then(({ data }) => {
        if (data) setActiveTrip(data)
        setLoading(false)
      })
  }, [])

  // הצג בנר הרשמה אם לא נרשם עדיין
  useEffect(() => {
    if (!loading && !subscribed && permission === 'default') {
      setTimeout(() => setShowPushBanner(true), 2000)
    }
  }, [loading, subscribed, permission])

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
      {/* TOPBAR */}
      <div style={{
        background: 'var(--red)',
        padding: '12px 16px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '2px solid rgba(255,255,255,.3)' }}>
            <img src="/chapak-hero.jpg" alt="חפק" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>חפ&quot;ק נציב כבאות</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>לפיד 10</div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: '#fff',
          background: activeTrip ? 'rgba(255,200,0,.25)' : 'rgba(255,255,255,.18)',
          padding: '4px 10px', borderRadius: 20
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: activeTrip ? '#ffe066' : '#5ee89a' }} />
          {activeTrip ? `בנסיעה — ${activeTrip.driver_name}` : 'פנוי'}
        </div>
      </div>

      {/* בנר הרשמה להתראות */}
      {showPushBanner && (
        <div style={{
          background: 'var(--amber-bg)', borderBottom: '1px solid var(--amber-border)',
          padding: '12px 14px', flexShrink: 0
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>🔔 הפעל התראות</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>
            קבל עדכונים על שבצ&quot;ק חדש ועדכונים מהמפקד
          </div>
          <input
            value={pushName}
            onChange={e => setPushName(e.target.value)}
            placeholder="מה השם שלך? (לדוגמה: משה נהג)"
            style={{ background: 'var(--bg)', border: '1px solid var(--border2)', borderRadius: 8, padding: '9px 12px', fontSize: 13, width: '100%', direction: 'rtl', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSubscribe}
              style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 0', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              ✓ הפעל התראות
            </button>
            <button onClick={() => setShowPushBanner(false)}
              style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)', borderRadius: 8, padding: '9px 12px', fontSize: 12, cursor: 'pointer' }}>
              אחר כך
            </button>
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'trip' && <TripTab activeTrip={activeTrip} onTripStart={setActiveTrip} onTripEnd={() => setActiveTrip(null)} />}
        {tab === 'operator' && <OperatorTab />}
        {tab === 'schedule' && <ScheduleTab />}
        {tab === 'admin' && <AdminTab />}
        {tab === 'notifications' && <NotificationsTab />}
      </div>

      {/* BOTTOM NAV */}
      <nav style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', display: 'flex', padding: '4px 0 6px', flexShrink: 0 }}>
        {[
          { id: 'trip', icon: '🚗', label: 'נסיעה' },
          { id: 'operator', icon: '📡', label: 'מפעיל' },
          { id: 'schedule', icon: '📅', label: 'שבצ"ק' },
          { id: 'notifications', icon: '🔔', label: 'התראות' },
          { id: 'admin', icon: '🔒', label: 'אדמין' },
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id as Tab)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              border: 'none', background: 'none', cursor: 'pointer', padding: '6px 0',
              color: tab === item.id ? 'var(--red)' : 'var(--dim)', fontSize: 10,
            }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ fontWeight: tab === item.id ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* COPYRIGHT */}
      <div style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)', padding: '6px 0', textAlign: 'center', fontSize: 10, color: 'var(--dim)', flexShrink: 0 }}>
        נוצר ופותח ע&quot;י עידן פינצבסקי · כל הזכויות שמורות
      </div>
    </div>
  )
}
