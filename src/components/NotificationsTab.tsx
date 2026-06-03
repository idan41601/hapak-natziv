'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Subscription {
  id: string
  endpoint: string
  user_label: string
  created_at: string
}

interface NotifLog {
  id: string
  title: string
  body: string
  sent_to: string
  sent_count: number
  created_at: string
}

const PRESET_MESSAGES = [
  { title: '📅 שבצ"ק חדש', body: 'פורסם שבצ"ק חדש — כנסו לאפליקציה לצפייה' },
  { title: '🚨 כינוס חירום', body: 'נדרש כינוס חירום — הגיעו לחפ"ק מיידית' },
  { title: '🔧 תרגיל מתוכנן', body: 'תרגיל מתוכנן מחר — בדקו את השבצ"ק לפרטים' },
  { title: '✅ עדכון נוהל', body: 'עודכן נוהל בטיחות — יש לעיין בסד"פ המעודכן' },
  { title: '⛽ תדלוק נדרש', body: 'הרכב זקוק לתדלוק — יש לטפל בהקדם' },
  { title: '📋 תזכורת כוננות', body: 'תזכורת: כוננות השבוע — ראו שבצ"ק לפרטים' },
]

export default function NotificationsTab() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [logs, setLogs] = useState<NotifLog[]>([])
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null)
  const [customTitle, setCustomTitle] = useState('')
  const [customBody, setCustomBody] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [targetAll, setTargetAll] = useState(true)
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: string[] } | null>(null)
  const [toast, setToast] = useState('')
  const [showLog, setShowLog] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [subs, logs] = await Promise.all([
      supabase.from('push_subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('notifications_log').select('*').order('created_at', { ascending: false }).limit(20),
    ])
    if (subs.data) setSubscriptions(subs.data)
    if (logs.data) setLogs(logs.data)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function sendNotification() {
    const title = isCustom ? customTitle : (selectedPreset !== null ? PRESET_MESSAGES[selectedPreset].title : '')
    const body = isCustom ? customBody : (selectedPreset !== null ? PRESET_MESSAGES[selectedPreset].body : '')

    if (!title || !body) { showToast('בחר הודעה או הכנס תוכן'); return }

    setSending(true)
    setResult(null)

    const targetEndpoints = targetAll ? [] : subscriptions
      .filter(s => selectedSubs.has(s.id))
      .map(s => s.endpoint)

    try {
      const res = await fetch('/api/push-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, targetEndpoints }),
      })
      const data = await res.json()
      setResult({ sent: data.sent || 0, failed: data.failed || [] })
      loadData()
      showToast(`נשלח ל-${data.sent} משתמשים ✓`)
    } catch {
      showToast('שגיאה בשליחה')
    } finally {
      setSending(false)
    }
  }

  async function deleteSubscription(id: string) {
    if (!confirm('למחוק מנוי זה?')) return
    await supabase.from('push_subscriptions').delete().eq('id', id)
    loadData()
    showToast('מנוי נמחק')
  }

  async function updateLabel(id: string, label: string) {
    await supabase.from('push_subscriptions').update({ user_label: label }).eq('id', id)
    loadData()
  }

  const currentTitle = isCustom ? customTitle : (selectedPreset !== null ? PRESET_MESSAGES[selectedPreset].title : '')
  const currentBody = isCustom ? customBody : (selectedPreset !== null ? PRESET_MESSAGES[selectedPreset].body : '')
  const canSend = !!currentTitle && !!currentBody && (targetAll || selectedSubs.size > 0)

  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, width: '100%', direction: 'rtl', ...extra
  })
  const card: React.CSSProperties = { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }

  return (
    <div style={{ padding: 14 }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#1a1a18', color: '#fff', padding: '10px 18px', borderRadius: 20, fontSize: 13, zIndex: 300, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
        שליחת התראות
      </div>

      {/* מנויים */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
          📱 מנויים פעילים
          <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted)', marginRight: 8 }}>{subscriptions.length} מכשירים</span>
        </div>
        {subscriptions.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', padding: '12px 0' }}>
            אין מנויים עדיין — משתמשים צריכים לאשר התראות באפליקציה
          </div>
        ) : (
          subscriptions.map(sub => (
            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              {!targetAll && (
                <input type="checkbox" checked={selectedSubs.has(sub.id)}
                  onChange={e => {
                    const next = new Set(selectedSubs)
                    e.target.checked ? next.add(sub.id) : next.delete(sub.id)
                    setSelectedSubs(next)
                  }}
                  style={{ width: 16, height: 16, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <input
                  defaultValue={sub.user_label}
                  onBlur={e => updateLabel(sub.id, e.target.value)}
                  style={{ background: 'transparent', border: 'none', fontSize: 13, fontWeight: 500, color: 'var(--text)', width: '100%', direction: 'rtl', padding: 0 }} />
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                  {new Date(sub.created_at).toLocaleDateString('he-IL')}
                </div>
              </div>
              <button onClick={() => deleteSubscription(sub.id)}
                style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>🗑</button>
            </div>
          ))
        )}
      </div>

      {/* בחירת נמענים */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>👥 למי לשלוח</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setTargetAll(true); setSelectedSubs(new Set()) }}
            style={{ flex: 1, background: targetAll ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${targetAll ? 'var(--red)' : 'var(--border)'}`, color: targetAll ? '#fff' : 'var(--muted)', borderRadius: 8, padding: '9px 0', fontSize: 12, cursor: 'pointer' }}>
            🌐 לכולם ({subscriptions.length})
          </button>
          <button onClick={() => setTargetAll(false)}
            style={{ flex: 1, background: !targetAll ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${!targetAll ? 'var(--red)' : 'var(--border)'}`, color: !targetAll ? '#fff' : 'var(--muted)', borderRadius: 8, padding: '9px 0', fontSize: 12, cursor: 'pointer' }}>
            ✋ נבחרים {!targetAll && selectedSubs.size > 0 ? `(${selectedSubs.size})` : ''}
          </button>
        </div>
        {!targetAll && subscriptions.length > 0 && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, textAlign: 'center' }}>
            סמן מנויים ברשימה למעלה
          </div>
        )}
      </div>

      {/* בחירת הודעה */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>💬 תוכן ההתראה</div>

        {/* טאבים */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          <button onClick={() => setIsCustom(false)}
            style={{ flex: 1, background: !isCustom ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${!isCustom ? 'var(--red)' : 'var(--border)'}`, color: !isCustom ? '#fff' : 'var(--muted)', borderRadius: 7, padding: '7px 0', fontSize: 12, cursor: 'pointer' }}>
            רשימה קבועה
          </button>
          <button onClick={() => setIsCustom(true)}
            style={{ flex: 1, background: isCustom ? 'var(--red)' : 'var(--bg3)', border: `1px solid ${isCustom ? 'var(--red)' : 'var(--border)'}`, color: isCustom ? '#fff' : 'var(--muted)', borderRadius: 7, padding: '7px 0', fontSize: 12, cursor: 'pointer' }}>
            הודעה חופשית
          </button>
        </div>

        {!isCustom ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PRESET_MESSAGES.map((msg, i) => (
              <div key={i} onClick={() => setSelectedPreset(i)}
                style={{ padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${selectedPreset === i ? 'var(--red)' : 'var(--border)'}`, background: selectedPreset === i ? 'var(--red-bg)' : 'var(--bg2)', cursor: 'pointer' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: selectedPreset === i ? 'var(--red)' : 'var(--text)' }}>{msg.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{msg.body}</div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>כותרת</label>
            <input value={customTitle} onChange={e => setCustomTitle(e.target.value)}
              placeholder='לדוגמה: 🚨 עדכון דחוף' style={{ ...inp(), marginBottom: 10 }} />
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 5 }}>תוכן ההודעה</label>
            <textarea value={customBody} onChange={e => setCustomBody(e.target.value)}
              placeholder="תוכן ההתראה..." rows={3}
              style={{ ...inp({ resize: 'none' }), marginBottom: 0 }} />
          </div>
        )}
      </div>

      {/* תצוגה מקדימה */}
      {currentTitle && currentBody && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>תצוגה מקדימה</div>
          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{currentTitle}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{currentBody}</div>
          </div>
        </div>
      )}

      {/* כפתור שליחה */}
      <button onClick={sendNotification} disabled={!canSend || sending}
        style={{ width: '100%', background: canSend && !sending ? 'var(--red)' : 'var(--bg3)', color: canSend && !sending ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 10, padding: '14px 0', fontSize: 14, fontWeight: 600, cursor: canSend && !sending ? 'pointer' : 'not-allowed', marginBottom: 10 }}>
        {sending ? '⏳ שולח...' : `🔔 שלח התראה${targetAll ? ` לכולם (${subscriptions.length})` : selectedSubs.size > 0 ? ` ל-${selectedSubs.size} נבחרים` : ''}`}
      </button>

      {/* תוצאה */}
      {result && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>✓ נשלח ל-{result.sent} מכשירים</div>
          {result.failed.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>נכשל: {result.failed.join(', ')}</div>
          )}
        </div>
      )}

      {/* יומן התראות */}
      <button onClick={() => setShowLog(!showLog)}
        style={{ width: '100%', background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)', borderRadius: 10, padding: '11px 0', fontSize: 12, cursor: 'pointer', marginBottom: showLog ? 10 : 0 }}>
        {showLog ? '▲' : '▼'} יומן התראות ({logs.length})
      </button>

      {showLog && logs.map(log => (
        <div key={log.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{log.title}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{new Date(log.created_at).toLocaleDateString('he-IL')}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{log.body}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>נשלח ל: {log.sent_to} · {log.sent_count} מכשירים</div>
        </div>
      ))}
    </div>
  )
}
