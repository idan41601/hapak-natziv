'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SopStep { id: string; title: string; description: string; order_index: number; extra_alert?: string | null }
interface SopType { id: string; name: string }

type View = 'menu' | 'exterior' | 'interior' | 'mast' | 'exterior2'
type SubView = 'steps' | 'confirm-exterior' | 'confirm-interior'

const SOP_ICONS: Record<string, string> = {
  exterior: '🚪',
  interior: '⚡',
  mast: '📡',
  exterior2: '✅',
}

const SOP_DESCS: Record<string, string> = {
  exterior: 'פתיחת מדרגות ומעקות החפ"ק',
  interior: 'פילוס, מייצבים, הרחבות ולוח חשמל',
  mast: 'הרמת התורן הפניאומטי',
  exterior2: 'שלבים 10-15 לאחר פתיחת הפנים',
}

export default function OperatorTab() {
  const [view, setView] = useState<View>('menu')
  const [subView, setSubView] = useState<SubView>('steps')
  const [steps, setSteps] = useState<SopStep[]>([])
  const [sopTypes, setSopTypes] = useState<SopType[]>([])
  const [pendingAlert, setPendingAlert] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('sop_types').select('*').then(({ data }) => { if (data) setSopTypes(data) })
  }, [])

  useEffect(() => {
    if (view === 'menu') return
    setLoading(true); setSubView('steps'); setPendingAlert(null)
    supabase.from('sop_steps').select('*').eq('sop_type', view).order('order_index')
      .then(({ data }) => { if (data) setSteps(data); setLoading(false) })
  }, [view])

  const getName = (id: string) => sopTypes.find(t => t.id === id)?.name ?? SOP_DESCS[id] ?? id

  /* ─── MENU ─── */
  if (view === 'menu') return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div className="label">נוהלי הפעלה</div>
      {(['exterior', 'interior', 'mast', 'exterior2'] as View[]).map(id => (
        <div key={id} onClick={() => setView(id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRight: '3px solid var(--red)',
            borderRadius: 14, padding: '15px 14px', marginBottom: 10, cursor: 'pointer',
          }}>
          <span style={{ fontSize: 28 }}>{SOP_ICONS[id]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{getName(id)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{SOP_DESCS[id]}</div>
          </div>
          <span style={{ color: 'var(--dim)', fontSize: 20 }}>‹</span>
        </div>
      ))}
    </div>
  )

  /* ─── CONFIRM EXTERIOR ─── */
  if (subView === 'confirm-exterior') return (
    <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', minHeight: '80vh', justifyContent: 'center' }}>
      <div style={{
        background: 'var(--green-bg)', border: '1.5px solid var(--green-border)',
        borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 20,
      }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', marginBottom: 10 }}>סד&quot;פ חוץ הושלם!</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.9 }}>
          כל 8 השלבים בוצעו.<br />מוכן לעבור להפעלת הפנים?
        </div>
      </div>
      <button className="btn-primary" onClick={() => setView('interior')}>
        ✓ ביצעתי את כל השלבים — עבור לסד&quot;פ פנים
      </button>
      <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setView('menu')}>חזור לתפריט</button>
    </div>
  )

  /* ─── CONFIRM INTERIOR ─── */
  if (subView === 'confirm-interior') return (
    <div style={{ padding: '16px 16px 24px', display: 'flex', flexDirection: 'column', minHeight: '80vh', justifyContent: 'center' }}>
      <div style={{
        background: 'var(--green-bg)', border: '1.5px solid var(--green-border)',
        borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 20,
      }}>
        <div style={{ fontSize: 52, marginBottom: 14 }}>⚡</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--green)', marginBottom: 10 }}>סד&quot;פ פנים הושלם!</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.9 }}>מוכן לעבור להשלמת סד&quot;פ חוץ?</div>
      </div>
      <button className="btn-primary" onClick={() => setView('exterior2')}>
        ✓ ביצעתי את כל השלבים — עבור להשלמת סד&quot;פ חוץ
      </button>
      <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setView('menu')}>חזור לתפריט</button>
    </div>
  )

  /* ─── PENDING ALERT ─── */
  if (pendingAlert) return (
    <div style={{ padding: '16px 16px 24px' }}>
      <div style={{
        background: 'rgba(230,57,70,.07)', border: '1.5px solid var(--red-border)',
        borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 16,
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)', marginBottom: 10 }}>שים לב!</div>
        <div style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, fontWeight: 500 }}>{pendingAlert}</div>
      </div>
      <button className="btn-primary" onClick={() => setPendingAlert(null)}>✓ קראתי ואישרתי — המשך</button>
      <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setView('menu')}>חזור לתפריט</button>
    </div>
  )

  /* ─── STEPS ─── */
  const isExterior = view === 'exterior'
  const isInterior = view === 'interior'
  const displaySteps = isExterior ? steps.slice(0, 8) : steps

  return (
    <div style={{ padding: '16px 16px 24px' }}>
      {loading && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>טוען...</div>}
      {!loading && <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <button onClick={() => setView('menu')}
            style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>›</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{getName(view)}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{displaySteps.length} שלבים</div>
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 14 }}>
          {displaySteps.map((step, i) => (
            <div key={step.id} style={{ padding: '14px', borderBottom: i < displaySteps.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', gap: 13 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: 'linear-gradient(135deg, #3a1a1a, #5c2a2a)',
                  color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{step.title}</div>
                  {step.description && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{step.description}</div>}
                  {/* helmet alert — step 8 exterior */}
                  {isExterior && i === 7 && step.extra_alert && (
                    <div style={{
                      marginTop: 10, background: 'rgba(230,57,70,.07)', border: '1px solid var(--red-border)',
                      borderRadius: 9, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <span style={{ fontSize: 20 }}>⛑️</span>
                      <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, lineHeight: 1.5 }}>{step.extra_alert}</div>
                    </div>
                  )}
                  {/* other alerts */}
                  {!(isExterior && i === 7) && step.extra_alert && (
                    <div onClick={() => setPendingAlert(step.extra_alert!)}
                      style={{
                        marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11, color: 'var(--amber)', background: 'var(--amber-bg)',
                        border: '1px solid var(--amber-border)', borderRadius: 7,
                        padding: '4px 9px', cursor: 'pointer', fontWeight: 600,
                      }}>
                      ⚠️ התראה
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary"
          onClick={() => {
            if (isExterior) setSubView('confirm-exterior')
            else if (isInterior) setSubView('confirm-interior')
            else setView('menu')
          }}>
          {isExterior ? '✓ ביצעתי את כל השלבים — עבור לסד"פ פנים' :
           isInterior ? '✓ ביצעתי את כל השלבים — עבור להשלמת סד"פ חוץ' :
           '✓ סיימתי'}
        </button>
      </>}
    </div>
  )
}
