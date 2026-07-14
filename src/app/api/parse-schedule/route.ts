import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File
    if (!file) return NextResponse.json({ error: 'אין קובץ' }, { status: 400 })

    // המר PDF ל-base64
    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const prompt = `אתה מנתח שבצ"ק של יחידת חפ"ק. חלץ את כל השורות מהטבלה.
עבור כל שורה החזר JSON עם השדות הבאים:
- week_start: תאריך התחלה בפורמט YYYY-MM-DD
- week_end: תאריך סיום בפורמט YYYY-MM-DD  
- commander: מפקד חפ"ק
- driver: נהג
- security: ביטחון והקמה
- support: סיוע בהקמה ורציפות תפקודית (כל השמות בשורות נפרדות)
- tech: טכנולוגיות וסמבצים (כל השמות בשורות נפרדות)
- standby: כוננות

החזר ONLY מערך JSON תקין, ללא טקסט נוסף, ללא markdown, ללא backticks.
דוגמה:
[{"week_start":"2026-07-12","week_end":"2026-07-18","commander":"בנדה-תומר","driver":"בקשי-משה","security":"יובל + מאבט","support":"בני בוארון\\nניר בן סימון","tech":"קובי דוידיאן\\nמיכאל קנטר","standby":"יורי נובצקי"}]`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'application/pdf', data: base64 } }
          ]
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 4096 }
      })
    })

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!text) return NextResponse.json({ error: 'Gemini לא החזיר תשובה' }, { status: 500 })

    // נקה את התשובה
    const clean = text.replace(/```json|```/g, '').trim()
    const rows = JSON.parse(clean)

    return NextResponse.json({ rows })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message || 'שגיאה' }, { status: 500 })
  }
}
