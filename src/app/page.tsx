'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import DriversPage from '@/components/DriversPage'
import SopPage from '@/components/SopPage'
import VehiclePage from '@/components/VehiclePage'
import JournalPage from '@/components/JournalPage'
import AdminPage from '@/components/AdminPage'

export type Page = 'drivers' | 'sop-event' | 'sop-deploy' | 'sop-fold' | 'vehicle' | 'journal' | 'admin'

export interface Trip {
  id: string
  driver_name: string
  start_km: number
  end_km: number | null
  start_time: string
  end_time: string | null
  notes: string | null
  status: string
}

export default function Home() {
  const [page, setPage] = useState<Page>('drivers')
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null)
  const [vehicleKm, setVehicleKm] = useState(48420)

  useEffect(() => {
    loadActiveTrip()
    loadVehicleKm()
  }, [])

  async function loadActiveTrip() {
    const { data } = await supabase
      .from('trips')
      .select('*')
      .eq('status', 'active')
      .single()
    if (data) setActiveTrip(data)
  }

  async function loadVehicleKm() {
    const { data } = await supabase
      .from('vehicle_stats')
      .select('current_km')
      .single()
    if (data) setVehicleKm(data.current_km)
  }

  const navItems = [
    { id: 'drivers', icon: '🚗', label: 'נסיעה' },
    { id: 'sop-event', icon: '🔥', label: 'אירוע' },
    { id: 'sop-deploy', icon: '📡', label: 'פריסה' },
    { id: 'sop-fold', icon: '📦', label: 'קיפול' },
    { id: 'vehicle', icon: '🔧', label: 'רכב' },
    { id: 'journal', icon: '📋', label: 'יומן' },
    { id: 'admin', icon: '🔒', label: 'אדמין' },
  ]

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
            width: 34, height: 34, borderRadius: '50%',
            background: 'rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17
          }}>🚒</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>חפ&quot;ק נציב כבאות</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>DAF XB 260 · רישוי 259-43-801</div>
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
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg2)' }}>
        {page === 'drivers' && (
          <DriversPage
            activeTrip={activeTrip}
            vehicleKm={vehicleKm}
            onTripStart={(trip) => { setActiveTrip(trip); loadVehicleKm() }}
            onTripEnd={() => { setActiveTrip(null); loadVehicleKm(); setPage('journal') }}
          />
        )}
        {(page === 'sop-event' || page === 'sop-deploy' || page === 'sop-fold') && (
          <SopPage type={page === 'sop-event' ? 'event' : page === 'sop-deploy' ? 'deploy' : 'fold'} />
        )}
        {page === 'vehicle' && <VehiclePage onKmUpdate={loadVehicleKm} />}
        {page === 'journal' && <JournalPage />}
        {page === 'admin' && <AdminPage />}
      </div>

      {/* BOTTOM NAV */}
      <nav style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        padding: '4px 0 10px',
        flexShrink: 0,
      }}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id as Page)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              color: page === item.id ? 'var(--red)' : 'var(--dim)',
              fontSize: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
