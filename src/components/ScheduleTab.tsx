'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface ScheduleRow {
  id: string
  month_label: string
  week_start: string
  week_end: string
  commander: string
  driver: string
  security: string
  support: string
  tech: string
  standby: string
  created_at: string
}

const ADMIN_PASSWORD = 'chapak2026'

function formatDate(d: string) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}`
}

const EMPTY_ROW = {
  week_start: '',
  week_end: '',
  commander: '',
  driver: '',
  security: '',
  support: '',
  tech: '',
  standby: '',
}

const COLS = [
  { key: 'commander', label: 'מפקד חפ"ק' },
  { key: 'driver', label: 'נהג' },
  { key: 'security', label: 'ביטחון והקמה' },
  { key: 'support', label: 'סיוע בהקמה ורציפות תפקודית' },
  { key: 'tech', label: 'טכנולוגיות וסמבצים' },
  { key: 'standby', label: 'כוננות' },
]

export default function ScheduleTab() {
  const [months, setMonths] = useState<string[]>([])
  const [currentMonth, setCurrentMonth] = useState('')
  const [rows, setRows] = useState<ScheduleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdminLogin, setShowAdminLogin] = useState(false)
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<typeof EMPTY_ROW>(EMPTY_ROW)
  const [showAddMonth, setShowAddMonth] = useState(false)
  const [newMonthLabel, setNewMonthLabel] = useState('')
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRow, setNewRow] = useState(EMPTY_ROW)
  const [toast, setToast] = useState('')

  useEffect(() => { loadMonths() }, [])
  useEffect(() => { if (currentMonth) loadRows(currentMonth) }, [currentMonth])

  async function loadMonths() {
    setLoading(true)
    const { data } = await supabase.from('schedules').select('month_label').order('created_at', { ascending: false })
    if (data) {
      const unique = Array.from(new Set(data.map(r => r.month_label)))
      setMonths(unique)
      if (unique.length > 0) setCurrentMonth(unique[0])
    }
    setLoading(false)
  }

  async function loadRows(month: string) {
    setLoading(true)
    const { data } = await supabase.from('schedules').select('*').eq('month_label', month).order('week_start')
    if (data) setRows(data)
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500) }

  async function saveRow() {
    if (!editingId) return
    await supabase.from('schedules').update(editFields).eq('id', editingId)
    setEditingId(null)
    loadRows(currentMonth)
    showToast('שורה עודכנה ✓')
  }

  async function deleteRow(id: string) {
    if (!confirm('למחוק שורה זו?')) return
    await supabase.from('schedules').delete().eq('id', id)
    loadRows(currentMonth)
    showToast('נמחק')
  }

  async function addRow() {
    if (!newRow.week_start) return
    await supabase.from('schedules').insert({ ...newRow, month_label: currentMonth })
    setNewRow(EMPTY_ROW)
    setShowAddRow(false)
    loadRows(currentMonth)
    showToast('שבוע נוסף ✓')
  }

  async function addMonth() {
    if (!newMonthLabel) return
    setMonths(prev => [newMonthLabel, ...prev])
    setCurrentMonth(newMonthLabel)
    setNewMonthLabel('')
    setShowAddMonth(false)
    showToast(`חודש "${newMonthLabel}" נוצר ✓`)
  }

  async function deleteMonth(month: string) {
    if (!confirm(`למחוק את כל השבצ"ק של "${month}"?`)) return
    await supabase.from('schedules').delete().eq('month_label', month)
    loadMonths()
    showToast('חודש נמחק')
  }

  // ייצוא Excel
  function exportExcel() {
    const header = ['תאריך', ...COLS.map(c => c.label)]
    const data = rows.map(r => [
      `${formatDate(r.week_start)} — ${formatDate(r.week_end)}`,
      r.commander, r.driver, r.security, r.support, r.tech, r.standby
    ])
    const csv = [header, ...data].map(row =>
      row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `שבצק_${currentMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('Excel יוצא ✓')
  }

  // ייצוא PDF
  function exportPDF() {
    const rowsHtml = rows.map(r => `
      <tr>
        <td>${formatDate(r.week_start)}<br><small>עד ${formatDate(r.week_end)}</small></td>
        <td>${r.commander ?? ''}</td>
        <td>${r.driver ?? ''}</td>
        <td>${r.security ?? ''}</td>
        <td>${r.support ?? ''}</td>
        <td>${r.tech ?? ''}</td>
        <td>${r.standby ?? ''}</td>
      </tr>`).join('')
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8">
      <title>שבצ"ק ${currentMonth}</title>
      <style>
        body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; font-size: 12px; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        p { color: #666; font-size: 11px; margin-bottom: 14px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #c0392b; color: white; padding: 7px 5px; text-align: right; }
        td { padding: 6px 5px; border-bottom: 1px solid #eee; vertical-align: top; }
        tr:nth-child(even) td { background: #fafafa; }
        small { color: #999; }
      </style></head><body>
      <h1>שבצ"ק חפ"ק נציב כבאות — ${currentMonth}</h1>
      <p>הופק בתאריך ${new Date().toLocaleDateString('he-IL')}</p>
      <table><thead><tr>
        <th>תאריך</th>
        ${COLS.map(c => `<th>${c.label}</th>`).join('')}
      </tr></thead><tbody>${rowsHtml}</tbody></table>
      </body></html>`
    const w = window.open('', '_blank')!
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
    showToast('PDF נפתח להדפסה ✓')
  }

  const pad: React.CSSProperties = { padding: 14 }
  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 8,
    padding: '9px 11px', fontSize: 12, width: '100%', direction: 'rtl', ...extra
  })

  if (loading && rows.length === 0 && months.length === 0) return (
    <div style={{ ...pad, textAlign: 'center', color: 'var(--muted)', paddingTop: 60 }}>טוען...</div>
  )

  return (
    <div style={pad}>
      {toast && (
        <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', background: '#1a1a18', color: '#fff', padding: '10px 18px', borderRadius: 20, fontSize: 13, zIndex: 300, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* כותרת + כניסת אדמין */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>שבצ&quot;ק</div>
        {isAdmin ? (
          <button onClick={() => setIsAdmin(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)', borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>יציאה מאדמין</button>
        ) : (
          <button onClick={() => setShowAdminLogin(true)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--muted)', borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>🔒 עריכה</button>
        )}
      </div>

      {/* לוגין אדמין */}
      {showAdminLogin && !isAdmin && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (pw === ADMIN_PASSWORD ? (setIsAdmin(true), setShowAdminLogin(false), setPwErr(false)) : setPwErr(true))}
            placeholder="סיסמת אדמין" style={{ ...inp(), marginBottom: 8 }} autoFocus />
          {pwErr && <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 6 }}>סיסמה שגויה</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => pw === ADMIN_PASSWORD ? (setIsAdmin(true), setShowAdminLogin(false), setPwErr(false)) : setPwErr(true)}
              style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>כניסה</button>
            <button onClick={() => setShowAdminLogin(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
          </div>
        </div>
      )}

      {/* בחירת חודש */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select value={currentMonth} onChange={e => setCurrentMonth(e.target.value)}
          style={{ ...inp({ flex: 1, marginBottom: 0 }) }}>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
          {months.length === 0 && <option value="">אין חודשים עדיין</option>}
        </select>
        {isAdmin && (
          <button onClick={() => setShowAddMonth(true)}
            style={{ background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>+ חודש</button>
        )}
      </div>

      {/* הוספת חודש */}
      {showAddMonth && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <input value={newMonthLabel} onChange={e => setNewMonthLabel(e.target.value)}
            placeholder='לדוגמה: מאי-יוני 2026' style={{ ...inp(), marginBottom: 8 }} autoFocus />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={addMonth} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}>צור</button>
            <button onClick={() => setShowAddMonth(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '8px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
          </div>
        </div>
      )}

      {/* כפתורי פעולה */}
      {currentMonth && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <button onClick={exportExcel} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '9px 0', fontSize: 12, cursor: 'pointer' }}>📊 Excel</button>
          <button onClick={exportPDF} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 8, padding: '9px 0', fontSize: 12, cursor: 'pointer' }}>🖨️ PDF</button>
          {isAdmin && (
            <button onClick={() => deleteMonth(currentMonth)}
              style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 8, padding: '9px 12px', fontSize: 13, cursor: 'pointer' }}>🗑</button>
          )}
        </div>
      )}

      {/* שורות השבצ"ק */}
      {rows.length === 0 && currentMonth && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 30, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          אין שורות עדיין לחודש זה
        </div>
      )}

      {rows.map((row, i) => (
        <div key={row.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
          {editingId === row.id ? (
            // מצב עריכה
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>מתאריך</div>
                  <input value={editFields.week_start} onChange={e => setEditFields(p => ({ ...p, week_start: e.target.value }))}
                    placeholder="01/05/2026" style={inp()} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>עד תאריך</div>
                  <input value={editFields.week_end} onChange={e => setEditFields(p => ({ ...p, week_end: e.target.value }))}
                    placeholder="07/05/2026" style={inp()} />
                </div>
              </div>
              {COLS.map(col => (
                <div key={col.key} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{col.label}</div>
                  <textarea value={(editFields as any)[col.key]} onChange={e => setEditFields(p => ({ ...p, [col.key]: e.target.value }))}
                    rows={2} style={{ ...inp({ resize: 'none' }) }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={saveRow} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 0', fontSize: 12, cursor: 'pointer' }}>✓ שמור</button>
                <button onClick={() => setEditingId(null)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '9px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
              </div>
            </div>
          ) : (
            // מצב תצוגה
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ background: 'var(--red)', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                  {formatDate(row.week_start)} — {formatDate(row.week_end)}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditingId(row.id); setEditFields({ week_start: row.week_start, week_end: row.week_end, commander: row.commander ?? '', driver: row.driver ?? '', security: row.security ?? '', support: row.support ?? '', tech: row.tech ?? '', standby: row.standby ?? '' }) }}
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>✏️</button>
                    <button onClick={() => deleteRow(row.id)}
                      style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', color: 'var(--red)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>🗑</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {COLS.map(col => (
                  (row as any)[col.key] ? (
                    <div key={col.key} style={{ display: 'flex', gap: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', minWidth: 100, flexShrink: 0, paddingTop: 1 }}>{col.label}</div>
                      <div style={{ fontSize: 13, color: 'var(--text)', flex: 1, lineHeight: 1.6 }}>{(row as any)[col.key]}</div>
                    </div>
                  ) : null
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* הוספת שבוע */}
      {isAdmin && currentMonth && (
        <div>
          {showAddRow ? (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>+ הוספת שבוע</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>מתאריך</div>
                  <input value={newRow.week_start} onChange={e => setNewRow(p => ({ ...p, week_start: e.target.value }))}
                    placeholder="01/05/2026" style={inp()} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>עד תאריך</div>
                  <input value={newRow.week_end} onChange={e => setNewRow(p => ({ ...p, week_end: e.target.value }))}
                    placeholder="07/05/2026" style={inp()} />
                </div>
              </div>
              {COLS.map(col => (
                <div key={col.key} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{col.label}</div>
                  <textarea value={(newRow as any)[col.key]} onChange={e => setNewRow(p => ({ ...p, [col.key]: e.target.value }))}
                    rows={2} style={{ ...inp({ resize: 'none' }) }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button onClick={addRow} style={{ flex: 1, background: 'var(--red)', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 0', fontSize: 12, cursor: 'pointer' }}>+ הוסף</button>
                <button onClick={() => setShowAddRow(false)} style={{ background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text)', borderRadius: 7, padding: '9px 12px', fontSize: 12, cursor: 'pointer' }}>ביטול</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAddRow(true)}
              style={{ width: '100%', background: 'transparent', border: '1px dashed var(--border2)', color: 'var(--muted)', borderRadius: 10, padding: '12px 0', fontSize: 13, cursor: 'pointer' }}>
              + הוסף שבוע לחודש
            </button>
          )}
        </div>
      )}

      {months.length === 0 && !isAdmin && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, paddingTop: 40 }}>
          אין שבצ&quot;ק פעיל עדיין
        </div>
      )}
    </div>
  )
}
