'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SopStep { id: string; title: string; description: string; order_index: number; extra_alert?: string | null }

type View = 'menu' | 'exterior' | 'interior' | 'mast'

const SOP_TYPES = [
  { id: 'exterior', type: 'exterior', label: 'סד"פ פתיחת חוץ', icon: '🚪', desc: 'פתיחת מדרגות ומעקות החפ"ק' },
  { id: 'interior', type: 'interior', label: 'סד"פ הפעלת פנים', icon: '⚡', desc: 'פילוס, מייצבים, הרחבות ולוח חשמל' },
  { id: 'mast', type: 'mast', label: 'סד"פ פתיחת תורן', icon: '📡', desc: 'הרמת התורן הפניאומטי' },
]

export default function OperatorTab() {
  const [view, setView] = useState<View>('menu')
  const [steps, setSteps] = useState<SopStep[]>([])
  const [pendingAlert, setPendingAlert] = useState<{ text: string; stepIndex: number } | null>(null)

  useEffect(() => {
    if (view !== 'menu') {
      supabase.from('sop_steps').select('*').eq('sop_type', view).order('order_index')
        .then(({ data }) => {
          if (data) {
            setSteps(data)
            // הצג התראה של השלב הראשון אם יש
            const first = data[0]
            if (first?.extra_alert) {
              setPendingAlert({ text: first.extra_alert, stepIndex: 0 })
            } else {
              setPendingAlert(null)
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
        <div key={s.id} onClick={() => { setView(s.id as View); setPendingAlert(null) }}
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

  // התראה דינמית לפני שלב
  if (pendingAlert) return (
    <div style={pad}>
      <div style={{ background: 'var(--red-bg)', border: '2px solid var(--red)', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)', marginBottom: 10 }}>שים לב!</div>
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8, fontWeight: 500 }}>
          {pendingAlert.text}
        </div>
      </div>
      <button
        onClick={() => setPendingAlert(null)}
        style={{ width: '100%', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        ✓ קראתי ואישרתי — המשך
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
          <div key={step.id} style={{ marginBottom: i < steps.length - 1 ? 14 : 0 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: 'var(--red)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, marginTop: 1
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{step.title}</div>
                {step.description && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{step.description}</div>}
                {/* התראה של השלב הבא */}
                {step.extra_alert && i < steps.length - 1 && (
                  <div
                    onClick={() => setPendingAlert({ text: step.extra_alert!, stepIndex: i + 1 })}
                    style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--amber)', background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontWeight: 500 }}>
                    ⚠️ התראה לשלב הבא
                  </div>
                )}
              </div>
            </div>
            {i < steps.length - 1 && <div style={{ borderBottom: '1px solid var(--border)', marginTop: 14 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}
