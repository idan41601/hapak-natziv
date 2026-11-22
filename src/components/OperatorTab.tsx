'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SopStep { id: string; title: string; description: string; order_index: number; extra_alert?: string | null }
interface SopType { id: string; name: string }

type View = 'menu' | 'exterior' | 'interior' | 'mast' | 'exterior2'
type SubView = 'steps' | 'confirm-exterior' | 'confirm-interior'

const SOP_CARDS: { id: View; icon: string; label: string; desc: string; accent: string }[] = [
  { id: 'exterior',  icon: '🚪', label: 'סד"פ חוץ',       desc: 'פתיחת מדרגות ומעקות החפ"ק',      accent: '#E8232A' },
  { id: 'interior',  icon: '⚡', label: 'סד"פ פנים',       desc: 'פילוס, מייצבים, הרחבות ולוח חשמל', accent: '#F5A623' },
  { id: 'mast',      icon: '📡', label: 'הרמת תורן',       desc: 'הרמת התורן הפניאומטי',            accent: '#00D47E' },
  { id: 'exterior2', icon: '✅', label: 'השלמת סד"פ חוץ', desc: 'שלבים 10-15 לאחר פתיחת הפנים',   accent: '#8A93AD' },
]

export default function OperatorTab() {
  const [view, setView]           = useState<View>('menu')
  const [subView, setSubView]     = useState<SubView>('steps')
  const [steps, setSteps]         = useState<SopStep[]>([])
  const [sopTypes, setSopTypes]   = useState<SopType[]>([])
  const [pendingAlert, setPendingAlert] = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)

  useEffect(() => {
    supabase.from('sop_types').select('*').then(({ data }) => { if (data) setSopTypes(data) })
  }, [])

  useEffect(() => {
    if (view === 'menu') return
    setLoading(true); setSubView('steps'); setPendingAlert(null)
    supabase.from('sop_steps').select('*').eq('sop_type', view).order('order_index')
      .then(({ data }) => { if (data) setSteps(data); setLoading(false) })
  }, [view])

  const getLabel = (id: string) => sopTypes.find(t => t.id === id)?.name ?? SOP_CARDS.find(c => c.id === id)?.label ?? id
  const card = SOP_CARDS.find(c => c.id === view)

  /* ─── MENU ─── */
  if (view === 'menu') return (
    <div>
      <div style={{ padding: '12px 16px 10px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>נוהלי הפעלה</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>בחר שלב להפעלה</div>
      </div>
      <div style={{ padding: '12px 16px 28px' }}>
        {SOP_CARDS.map((c, i) => (
          <div key={c.id} onClick={() => setView(c.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 13,
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 'var(--r)', padding: '14px',
              marginBottom: 10, cursor: 'pointer',
              borderRight: `3px solid ${c.accent}`,
            }}>
            {/* step badge */}
            <div style={{
              width: 30, height: 30, borderRadius: 7, flexShrink: 0,
              background: 'var(--lift)', border: '1px solid var(--edge)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: 'var(--t3)',
            }}>{i + 1}</div>

            <span style={{ fontSize: 22, flexShrink: 0 }}>{c.icon}</span>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{c.label}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{c.desc}</div>
            </div>
            <span style={{ color: 'var(--t3)', fontSize: 15 }}>‹</span>
          </div>
        ))}
      </div>
    </div>
  )

  /* ─── CONFIRM EXTERIOR ─── */
  if (subView === 'confirm-exterior') return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        background: 'var(--green-mid)', border: '1px solid rgba(0,168,95,.25)',
        borderRadius: 'var(--r)', padding: 28, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', marginBottom: 10 }}>סד"פ חוץ הושלם!</div>
        <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.9 }}>
          כל 8 השלבים בוצעו.<br />מוכן לעבור להפעלת הפנים?
        </div>
      </div>
      <button className="btn-red" style={{ background: 'var(--green)' }} onClick={() => setView('interior')}>
        ✓ ביצעתי את כל השלבים — עבור לסד"פ פנים
      </button>
      <button className="btn-ghost" onClick={() => setView('menu')}>חזור לתפריט</button>
    </div>
  )

  /* ─── CONFIRM INTERIOR ─── */
  if (subView === 'confirm-interior') return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        background: 'var(--green-mid)', border: '1px solid rgba(0,168,95,.25)',
        borderRadius: 'var(--r)', padding: 28, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>⚡</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', marginBottom: 10 }}>סד"פ פנים הושלם!</div>
        <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.9 }}>מוכן לעבור להשלמת סד"פ חוץ?</div>
      </div>
      <button className="btn-red" style={{ background: 'var(--green)' }} onClick={() => setView('exterior2')}>
        ✓ ביצעתי את כל השלבים — עבור להשלמת סד"פ חוץ
      </button>
      <button className="btn-ghost" onClick={() => setView('menu')}>חזור לתפריט</button>
    </div>
  )

  /* ─── PENDING ALERT ─── */
  if (pendingAlert) return (
    <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        background: 'rgba(232,35,42,.07)', border: '1px solid var(--red-border)',
        borderRadius: 'var(--r)', padding: 24, textAlign: 'center',
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--red)', marginBottom: 10 }}>שים לב!</div>
        <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.8, fontWeight: 500 }}>{pendingAlert}</div>
      </div>
      <button className="btn-red" onClick={() => setPendingAlert(null)}>✓ קראתי ואישרתי — המשך</button>
      <button className="btn-ghost" onClick={() => setView('menu')}>חזור לתפריט</button>
    </div>
  )

  /* ─── STEPS ─── */
  const isExterior = view === 'exterior'
  const isInterior = view === 'interior'
  const displaySteps = isExterior ? steps.slice(0, 8) : steps

  return (
    <div>
      {/* header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <button onClick={() => setView('menu')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 700, color: 'var(--red)',
          letterSpacing: '.04em', marginBottom: 8,
        }}>← חזור</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{card?.icon}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{getLabel(view)}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
              {displaySteps.length} שלבים
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px 28px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--t3)', padding: 48, fontSize: 12 }}>
            טוען...
          </div>
        )}
        {!loading && (
          <>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 'var(--r)', overflow: 'hidden', marginBottom: 14,
            }}>
              {displaySteps.map((step, i) => (
                <div key={step.id} style={{
                  padding: '14px',
                  borderBottom: i < displaySteps.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <div style={{ display: 'flex', gap: 13 }}>
                    {/* number */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0, marginTop: 1,
                      background: 'var(--lift)', border: '1px solid var(--edge)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: card?.accent ?? 'var(--red)',
                    }}>{i + 1}</div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 3 }}>
                        {step.title}
                      </div>
                      {step.description && (
                        <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>
                          {step.description}
                        </div>
                      )}

                      {/* helmet alert */}
                      {isExterior && i === 7 && step.extra_alert && (
                        <div style={{
                          marginTop: 10, background: 'rgba(232,35,42,.07)',
                          border: '1px solid rgba(232,35,42,.25)',
                          borderRadius: 'var(--r2)', padding: '10px 12px',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <span style={{ fontSize: 18, flexShrink: 0 }}>⛑️</span>
                          <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, lineHeight: 1.5 }}>
                            {step.extra_alert}
                          </div>
                        </div>
                      )}

                      {/* other alerts */}
                      {!(isExterior && i === 7) && step.extra_alert && (
                        <div onClick={() => setPendingAlert(step.extra_alert!)}
                          style={{
                            marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                            fontSize: 11, color: 'var(--amber)',
                            background: 'rgba(245,166,35,.1)',
                            border: '1px solid rgba(245,166,35,.25)',
                            borderRadius: 'var(--r2)', padding: '4px 9px',
                            cursor: 'pointer', fontWeight: 600,
                          }}>
                          ⚠️ התראה
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn-red"
              onClick={() => {
                if (isExterior) setSubView('confirm-exterior')
                else if (isInterior) setSubView('confirm-interior')
                else setView('menu')
              }}>
              {isExterior ? '✓ ביצעתי את כל השלבים — עבור לסד"פ פנים'
                : isInterior ? '✓ ביצעתי את כל השלבים — עבור להשלמת סד"פ חוץ'
                : '✓ סיימתי'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
