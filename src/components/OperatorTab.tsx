'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SopStep { id: string; title: string; description: string; order_index: number; extra_alert?: string | null }
interface SopType { id: string; name: string }

type View = 'menu' | 'exterior' | 'interior' | 'mast' | 'exterior2'
type SubView = 'steps' | 'helmet-alert' | 'confirm-exterior' | 'confirm-interior'

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

const FLOW_ORDER: View[] = ['exterior', 'interior', 'exterior2']

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
    setLoading(true)
    setSubView('steps')
    setPendingAlert(null)
    supabase.from('sop_steps').select('*').eq('sop_type', view).order('order_index')
      .then(({ data }) => {
        if (data) setSteps(data)
        setLoading(false)
      })
  }, [view])

  const getName = (id: string) => sopTypes.find(t => t.id === id)?.name ?? SOP_DESCS[id] ?? id
  const pad: React.CSSProperties = { padding: 14 }

  // תפריט ראשי
  if (view === 'menu') return (
    <div style={pad}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
        נוהלי הפעלה
      </div>
      {(['exterior', 'interior', 'mast', 'exterior2'] as View[]).map(id => (
        <div key={id} onClick={() => setView(id)}
          style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg)', border: '1px solid var(--border)', borderRight: '3px solid var(--red)', borderRadius: 10, padding: '16px 14px', marginBottom: 10, cursor: 'pointer' }}>
          <span style={{ fontSize: 30 }}>{SOP_ICONS[id]}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{getName(id)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{SOP_DESCS[id]}</div>
          </div>
          <span style={{ color: 'var(--dim)', fontSize: 20 }}>‹</span>
        </div>
      ))}
    </div>
  )

  // מסך אישור סיום סד"פ חוץ → מעבר לפנים
  if (subView === 'confirm-exterior') return (
    <div style={{ ...pad, display: 'flex', flexDirection: 'column', minHeight: '80vh', justifyContent: 'center' }}>
      <div style={{ background: 'var(--green-bg)', border: '2px solid var(--green)', borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', marginBottom: 12 }}>סד"פ חוץ הושלם!</div>
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.9 }}>
          כל 8 השלבים בוצעו.<br />מוכן לעבור להפעלת הפנים?
        </div>
      </div>
      <button
        onClick={() => setView('interior')}
        style={{ width: '100%', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 12, padding: '15px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
        ✓ ביצעתי את כל השלבים — עבור לסד&quot;פ פנים
      </button>
      <button onClick={() => setView('menu')}
        style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 12, padding: '12px 0', fontSize: 13, cursor: 'pointer' }}>
        חזור לתפריט
      </button>
    </div>
  )

  // מסך אישור סיום סד"פ פנים → מעבר להשלמת חוץ
  if (subView === 'confirm-interior') return (
    <div style={{ ...pad, display: 'flex', flexDirection: 'column', minHeight: '80vh', justifyContent: 'center' }}>
      <div style={{ background: 'var(--green-bg)', border: '2px solid var(--green)', borderRadius: 16, padding: 28, textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)', marginBottom: 12 }}>סד"פ פנים הושלם!</div>
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.9 }}>
          מוכן לעבור להשלמת סד&quot;פ חוץ?
        </div>
      </div>
      <button
        onClick={() => setView('exterior2')}
        style={{ width: '100%', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 12, padding: '15px 0', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginBottom: 10 }}>
        ✓ ביצעתי את כל השלבים — עבור להשלמת סד&quot;פ חוץ
      </button>
      <button onClick={() => setView('menu')}
        style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 12, padding: '12px 0', fontSize: 13, cursor: 'pointer' }}>
        חזור לתפריט
      </button>
    </div>
  )

  // התראה דינמית (לא קסדה)
  if (pendingAlert) return (
    <div style={pad}>
      <div style={{ background: 'var(--red-bg)', border: '2px solid var(--red)', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--red)', marginBottom: 10 }}>שים לב!</div>
        <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8, fontWeight: 500 }}>{pendingAlert}</div>
      </div>
      <button onClick={() => setPendingAlert(null)}
        style={{ width: '100%', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px 0', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
        ✓ קראתי ואישרתי — המשך
      </button>
      <button onClick={() => setView('menu')}
        style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 10, padding: '11px 0', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
        חזור לתפריט
      </button>
    </div>
  )

  // מסך שלבים
  const isExterior = view === 'exterior'
  const isInterior = view === 'interior'

  // עבור סד"פ חוץ — מציג רק שלבים 1-8
  const displaySteps = isExterior ? steps.slice(0, 8) : steps

  const handleFinish = () => {
    if (isExterior) setSubView('confirm-exterior')
    else if (isInterior) setSubView('confirm-interior')
    else setView('menu')
  }

  return (
    <div style={pad}>
      {loading && <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>טוען...</div>}
      {!loading && <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={() => setView('menu')} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>›</button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{getName(view)}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{displaySteps.length} שלבים</div>
          </div>
        </div>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
          {displaySteps.map((step, i) => (
            <div key={step.id} style={{ marginBottom: i < displaySteps.length - 1 ? 14 : 0 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: 'var(--red)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, marginTop: 1
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{step.title}</div>
                  {step.description && <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>{step.description}</div>}
                  {/* התראת קסדה — שלב 8 בחוץ */}
                  {isExterior && i === 7 && step.extra_alert && (
                    <div style={{ marginTop: 10, background: 'var(--red-bg)', border: '1.5px solid var(--red)', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>⛑️</span>
                      <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, lineHeight: 1.5 }}>{step.extra_alert}</div>
                    </div>
                  )}
                  {/* התראות רגילות — שלבים אחרים */}
                  {!(isExterior && i === 7) && step.extra_alert && (
                    <div
                      onClick={() => setPendingAlert(step.extra_alert!)}
                      style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--amber)', background: 'var(--amber-bg)', border: '1px solid var(--amber-border)', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontWeight: 500 }}>
                      ⚠️ התראה
                    </div>
                  )}
                </div>
              </div>
              {i < displaySteps.length - 1 && <div style={{ borderBottom: '1px solid var(--border)', marginTop: 14 }} />}
            </div>
          ))}
        </div>

        {/* כפתור סיום */}
        <button
          onClick={() => {
            if (isExterior) setSubView('confirm-exterior')
            else if (isInterior) setSubView('confirm-interior')
            else setView('menu')
          }}
          style={{ width: '100%', background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {isExterior ? '✓ ביצעתי את כל השלבים — עבור לסד"פ פנים' :
           isInterior ? '✓ ביצעתי את כל השלבים — עבור להשלמת סד"פ חוץ' :
           '✓ סיימתי'}
        </button>
      </>}
    </div>
  )
}
