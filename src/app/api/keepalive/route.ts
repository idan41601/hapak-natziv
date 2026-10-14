import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  // קריאה קטנה כדי לשמור את Supabase פעיל
  await supabase.from('drivers').select('id').limit(1)
  return NextResponse.json({ ok: true, time: new Date().toISOString() })
}
