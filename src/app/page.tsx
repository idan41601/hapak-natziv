'use client'

import { useState } from 'react'
import TripTab from '@/components/TripTab'
import OperatorTab from '@/components/OperatorTab'
import AdminTab from '@/components/AdminTab'

type Tab = 'trip' | 'operator' | 'admin'

export default function Home() {
  const [tab, setTab] = useState<Tab>('trip')
  const [activeTrip, setActiveTrip] = useState<any>(null)

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
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            overflow: 'hidden', flexShrink: 0,
            border: '2px solid rgba(255,255,255,.3)'
          }}>
            <img src="/chapak-hero.jpg" alt="חפק" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>חפ&quot;ק נציב כבאות</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>לפיד 10 · רישוי 259-43-801</div>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: '#fff',
          background: activeTrip ? 'rgba(255,200,0,.25)' : 'rgba(255,255,255,.18)',
          padding: '4px 10px', borderRadius: 20
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: activeTrip ? '#ffe066' : '#5ee89a'
          }} />
          {activeTrip ? `בנסיעה — ${activeTrip.driver_name}` : 'פנוי'}
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'trip' && (
          <TripTab
            activeTrip={activeTrip}
            onTripStart={setActiveTrip}
            onTripEnd={() => setActiveTrip(null)}
          />
        )}
        {tab === 'operator' && <OperatorTab />}
        {tab === 'admin' && <AdminTab />}
      </div>

      {/* BOTTOM NAV - 3 tabs */}
      <nav style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        padding: '4px 0 10px',
        flexShrink: 0,
      }}>
        {[
          { id: 'trip', icon: '🚗', label: 'נסיעה' },
          { id: 'operator', icon: '📡', label: 'מפעיל' },
          { id: 'admin', icon: '🔒', label: 'אדמין' },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id as Tab)}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              border: 'none', background: 'none', cursor: 'pointer', padding: '6px 0',
              color: tab === item.id ? 'var(--red)' : 'var(--dim)',
              fontSize: 10,
            }}
          >
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <span style={{ fontWeight: tab === item.id ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
