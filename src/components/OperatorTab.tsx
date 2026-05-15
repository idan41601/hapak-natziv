'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SopStep { id: string; title: string; description: string; order_index: number; extra_alert?: string }

type View = 'menu' | 'exterior' | 'interior' | 'mast'

const SOP_TYPES = [
  { id: 'exterior', type: 'exterior', label: 'סד"פ פתיחת חוץ', icon: '🚪', desc: 'פתיחת מדרגות ומעקות החפ"ק' },
  { id: 'interior', type: 'interior', label: 'סד"פ הפעלת פנים', icon: '⚡', desc: 'פילוס, מייצבים, הרחבות ולוח חשמל' },
  { id: 'mast', type: 'mast', label: 'סד"פ פתיחת תורן', icon: '📡', desc: 'הרמת התורן הפניאומטי' },
]

export default function OperatorTab() {
  const [view, setView] = useState<View>('menu')
  const [steps, setSteps] = useState<SopStep[]>([])
  const [showHelmetAlert, setShowHelmetAlert] = useState(false)
  const [helmetConfirmed, setHelmetConfirmed] = useState(false)

  useEffect(() => {
    if (view !== 'menu') {
      supabase.from('sop_steps').select('*').eq('sop_type', view).order('order_index')
        .then(({ data }) => {
          if (data) {
            setSteps(data)
            if (view === 'interior') {
              setShowHelmetAlert(true)
              setHelmetConfirmed(false)
            }
          }
        })
    }
  }, [view])

  const pad: React.CSSProperties = { padding: 14 }

  if (view === 'menu') return (
    <div style={pad}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
        נוהלי הפעלה
      </div>
      {SOP_TYPES.map(s => (
        <div key={s.id} onClick={() => setView(s.id as View)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg)', border: '1px solid var(--border)', borderRight: '3px solid var(--red)', borderRadius: 10, padding: '16px 14px', marginBottom: 10, cursor: 'pointer' }}>
          <span style={{ fontSize: 30 }}>{s.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{s.label}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{s.desc}</div>
          </div>
          <span style={{ color: 'var(--dim)', fontSize: 20 }}>‹</span>
        </div>
      ))}
    </div>
  )

  const currentSop = SOP_TYPES.find(s => s.id === view)!

  // Helmet alert for interior
  if (view === 'interior' && showHelmetAlert && !helmetConfirmed) return (
    <div style={pad}>
      <div style={{ background: 'var(--red-bg)', border: '2px solid var(--red)', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⛑️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)', marginBottom: 10 }}>ציוד מגן חובה!</div>
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8 }}>
          חובה לחבוש <strong>קסדה</strong> ולהרכיב <strong>כפפות</strong>
          <br />לפני הנחת פלטות המייצבים
        </div>
      </div>
      <button onClick={() => setHelmetConfirmed(true)}
        style={{ width: '100%', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        ✓ מצויד כראוי — המשך
      </button>
      <button onClick={() => setView('menu')}
        style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 10, padding: '11px 0', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
        חזור לתפריט
      </button>
    </div>
  )

  return (
    <div style={pad}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>›</button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{currentSop.label}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{steps.length} שלבים</div>
        </div>
      </div>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: 'flex', gap: 12, marginBottom: i < steps.length - 1 ? 14 : 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: 'var(--red)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, marginTop: 1
            }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{step.title}</div>
              {step.description && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{step.description}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
